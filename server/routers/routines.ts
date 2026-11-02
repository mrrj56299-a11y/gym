import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabaseAdmin } from "../supabase";

const idSchema = z.number().int().positive();

const exerciseInput = z.object({
  exerciseId: idSchema,
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  equipment: z.string().trim().min(1).max(40),
  level: z.string().trim().min(1).max(40),
  sets: z.number().int().min(1).max(20),
  reps: z.string().trim().min(1).max(24),
  restSeconds: z.number().int().min(0).max(1800),
});

const routineInput = z.object({
  name: z.string().trim().min(1).max(180),
  days: z.array(z.object({
    name: z.string().trim().min(1).max(160),
    items: z.array(exerciseInput).max(60),
  })).min(1).max(14),
});

const logEntry = z.object({
  routineExerciseId: idSchema,
  setNumber: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
});

function databaseError(error: { message: string }, action: string) {
  console.error(`[routines] ${action} failed:`, error.message);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Routines are unavailable right now. Please try again." });
}

async function findOwnedRoutine(id: number, ownerId: number) {
  const { data, error } = await getSupabaseAdmin()
    .from("routines")
    .select("id, name")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw databaseError(error, "load routine");
  if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Routine not found." });
  return data;
}

export const routinesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await getSupabaseAdmin()
      .from("routines")
      .select("id, name, updated_at")
      .eq("owner_id", ctx.user.id)
      .order("updated_at", { ascending: false });
    if (error) throw databaseError(error, "list routines");
    return data.map(row => ({ id: row.id, name: row.name, updatedAt: row.updated_at }));
  }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input, ctx }) => {
    const sb = getSupabaseAdmin();
    const routine = await findOwnedRoutine(input.id, ctx.user.id);

    const { data: days, error: dayError } = await sb
      .from("routine_days")
      .select("id, name, position")
      .eq("routine_id", routine.id)
      .order("position");
    if (dayError) throw databaseError(dayError, "load routine days");

    const dayIds = days.map(day => day.id);
    const { data: exercises, error: exerciseError } = dayIds.length
      ? await sb
          .from("routine_exercises")
          .select("id, day_id, position, exercise_id, exercise_name_ar, exercise_name_en, equipment, level, planned_sets, planned_reps, rest_seconds")
          .in("day_id", dayIds)
          .order("position")
      : { data: [], error: null };
    if (exerciseError) throw databaseError(exerciseError, "load routine exercises");

    const exerciseIds = exercises.map(exercise => exercise.id);
    const { data: logs, error: logError } = exerciseIds.length
      ? await sb
          .from("routine_set_logs")
          .select("routine_exercise_id, set_number, weight_kg, reps")
          .in("routine_exercise_id", exerciseIds)
      : { data: [], error: null };
    if (logError) throw databaseError(logError, "load set logs");

    return {
      id: routine.id,
      name: routine.name,
      days: days.map(day => ({
        id: day.id,
        name: day.name,
        exercises: exercises
          .filter(exercise => exercise.day_id === day.id)
          .map(exercise => ({
            id: exercise.id,
            exerciseId: exercise.exercise_id,
            nameAr: exercise.exercise_name_ar,
            nameEn: exercise.exercise_name_en,
            equipment: exercise.equipment,
            level: exercise.level,
            sets: exercise.planned_sets,
            reps: exercise.planned_reps,
            restSeconds: exercise.rest_seconds,
            logs: logs
              .filter(log => log.routine_exercise_id === exercise.id)
              .map(log => ({ setNumber: log.set_number, weightKg: log.weight_kg === null ? null : Number(log.weight_kg), reps: log.reps })),
          })),
      })),
    };
  }),

  create: protectedProcedure.input(routineInput).mutation(async ({ input, ctx }) => {
    const sb = getSupabaseAdmin();
    const { data: routine, error } = await sb
      .from("routines")
      .insert({ owner_id: ctx.user.id, name: input.name })
      .select("id")
      .single();
    if (error) throw databaseError(error, "create routine");

    try {
      for (const [position, day] of input.days.entries()) {
        const { data: dayRow, error: dayError } = await sb
          .from("routine_days")
          .insert({ routine_id: routine.id, position, name: day.name })
          .select("id")
          .single();
        if (dayError) throw databaseError(dayError, "create routine day");

        if (day.items.length) {
          const { error: exerciseError } = await sb.from("routine_exercises").insert(
            day.items.map((item, itemPosition) => ({
              day_id: dayRow.id,
              position: itemPosition,
              exercise_id: item.exerciseId,
              exercise_name_ar: item.nameAr,
              exercise_name_en: item.nameEn,
              equipment: item.equipment,
              level: item.level,
              planned_sets: item.sets,
              planned_reps: item.reps,
              rest_seconds: item.restSeconds,
            })),
          );
          if (exerciseError) throw databaseError(exerciseError, "create routine exercises");
        }
      }
    } catch (err) {
      await sb.from("routines").delete().eq("id", routine.id);
      throw err;
    }

    return { id: routine.id };
  }),

  delete: protectedProcedure.input(z.object({ id: idSchema })).mutation(async ({ input, ctx }) => {
    await findOwnedRoutine(input.id, ctx.user.id);
    const { error } = await getSupabaseAdmin().from("routines").delete().eq("id", input.id).eq("owner_id", ctx.user.id);
    if (error) throw databaseError(error, "delete routine");
    return { success: true };
  }),

  saveLogs: protectedProcedure
    .input(z.object({ routineId: idSchema, entries: z.array(logEntry).min(1).max(400) }))
    .mutation(async ({ input, ctx }) => {
      const sb = getSupabaseAdmin();
      const routine = await findOwnedRoutine(input.routineId, ctx.user.id);

      const { data: days, error: dayError } = await sb.from("routine_days").select("id").eq("routine_id", routine.id);
      if (dayError) throw databaseError(dayError, "load routine days for logs");

      const requestedIds = [...new Set(input.entries.map(entry => entry.routineExerciseId))];
      const { data: exercises, error: exerciseError } = await sb
        .from("routine_exercises")
        .select("id, planned_sets")
        .in("day_id", days.map(day => day.id))
        .in("id", requestedIds);
      if (exerciseError) throw databaseError(exerciseError, "load exercises for logs");

      const plannedSetsById = new Map(exercises.map(exercise => [exercise.id, exercise.planned_sets]));
      const everyExerciseBelongs = plannedSetsById.size === requestedIds.length;
      const everySetExists = input.entries.every(entry => entry.setNumber <= (plannedSetsById.get(entry.routineExerciseId) ?? 0));
      if (!everyExerciseBelongs || !everySetExists) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "These sets do not belong to this routine." });
      }

      const updatedAt = new Date().toISOString();
      const { error } = await sb.from("routine_set_logs").upsert(
        input.entries.map(entry => ({
          routine_exercise_id: entry.routineExerciseId,
          set_number: entry.setNumber,
          weight_kg: entry.weightKg,
          reps: entry.reps,
          updated_at: updatedAt,
        })),
        { onConflict: "routine_exercise_id,set_number" },
      );
      if (error) throw databaseError(error, "save set logs");
      return { success: true };
    }),
});
