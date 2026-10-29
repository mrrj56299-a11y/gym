import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { listExercisesForSubMuscle, listMusclesWithParts } from "../db";
import { getDb } from "../db";
import { exercises, muscles, subMuscles, exerciseTargets } from "../../drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

export const plannerRouter = router({
  catalogue: publicProcedure.query(async () => listMusclesWithParts()),
  exerciseIndex: publicProcedure.query(async () => {
    const db = await getDb(); if (!db) return [];
    return db.select({ id: exercises.id, slug: exercises.slug, nameAr: exercises.nameAr, nameEn: exercises.nameEn, equipment: exercises.equipment, level: exercises.level }).from(exercises).where(eq(exercises.status, "published"));
  }),
  exercises: publicProcedure.input(z.object({ subMuscleId: z.number().int().positive(), splitDayId: z.number().int().positive().optional() })).query(({ input, ctx }) => listExercisesForSubMuscle(input.subMuscleId, input.splitDayId, ctx.user?.id)),
  exercise: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return null;
    const rows = await db.select().from(exercises).where(and(eq(exercises.id, input.id), eq(exercises.status, "published"))).limit(1);
    if (!rows[0]) return null;
    const targets = await db.select({ target: subMuscles, role: exerciseTargets.role, muscle: muscles }).from(exerciseTargets).innerJoin(subMuscles, eq(exerciseTargets.subMuscleId, subMuscles.id)).innerJoin(muscles, eq(subMuscles.muscleId, muscles.id)).where(eq(exerciseTargets.exerciseId, input.id));
    return { ...rows[0], targets };
  }),
});
