import Papa from "papaparse";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  exercises, exerciseTargets, muscles, siteTexts, splitDays, splitDayMuscles,
  splits, subMuscles, users,
} from "../../drizzle/schema";

const bilingual = z.object({ nameAr: z.string().trim().min(1).max(220), nameEn: z.string().trim().min(1).max(220) });
const kindSchema = z.enum(["muscles", "parts", "exercises", "splits", "texts", "users"]);
type ImportKind = "exercises" | "splits";

function parseRows(kind: ImportKind, format: "json" | "csv", content: string): any[] {
  if (format === "csv") {
    const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true, transformHeader: value => value.trim() });
    if (parsed.errors.length) throw new TRPCError({ code: "BAD_REQUEST", message: `CSV parse error: ${parsed.errors[0].message}` });
    return parsed.data;
  }
  const parsed = JSON.parse(content);
  const records = Array.isArray(parsed) ? parsed : parsed?.[kind];
  if (!Array.isArray(records)) throw new TRPCError({ code: "BAD_REQUEST", message: `JSON must be an array or contain a ${kind} array.` });
  return records;
}

function requiredFields(kind: ImportKind) {
  return kind === "exercises"
    ? ["slug", "name_ar", "name_en", "muscle_slug", "sub_muscle_slug", "equipment", "level"]
    : ["slug", "name_ar", "name_en", "days"];
}

function rowErrors(kind: ImportKind, row: any, index: number) {
  const errors = requiredFields(kind).filter(key => row?.[key] === undefined || row[key] === "").map(field => ({ row: index + 1, field, message: `Missing ${field}` }));
  if (kind === "exercises" && row && !["machine", "dumbbell", "barbell", "cable", "bodyweight"].includes(row.equipment)) errors.push({ row: index + 1, field: "equipment", message: "Unsupported equipment value" });
  if (kind === "exercises" && row && !["beginner", "intermediate"].includes(row.level)) errors.push({ row: index + 1, field: "level", message: "Level must be beginner or intermediate" });
  if (kind === "splits" && row) {
    try {
      const days = typeof row.days === "string" ? JSON.parse(row.days) : row.days;
      if (!Array.isArray(days) || !days.length) errors.push({ row: index + 1, field: "days", message: "Days must be a non-empty JSON array" });
    } catch { errors.push({ row: index + 1, field: "days", message: "Days must be valid JSON" }); }
  }
  return errors;
}

export const adminRouter = router({
  summary: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [userRows, muscleRows, splitRows, exerciseRows] = await Promise.all([
      db.select({ id: users.id }).from(users),
      db.select({ id: muscles.id }).from(muscles),
      db.select({ id: splits.id }).from(splits).where(isNull(splits.ownerUserId)),
      db.select({ id: exercises.id }).from(exercises),
    ]);
    return { users: userRows.length, muscles: muscleRows.length, splits: splitRows.length, exercises: exerciseRows.length };
  }),

  list: adminProcedure.input(z.object({ kind: kindSchema, q: z.string().max(100).optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const q = input.q?.trim();
    switch (input.kind) {
      case "muscles": return db.select().from(muscles).where(q ? or(like(muscles.nameAr, `%${q}%`), like(muscles.nameEn, `%${q}%`), like(muscles.slug, `%${q}%`)) : undefined).orderBy(muscles.position);
      case "parts": return db.select().from(subMuscles).where(q ? or(like(subMuscles.nameAr, `%${q}%`), like(subMuscles.nameEn, `%${q}%`), like(subMuscles.slug, `%${q}%`)) : undefined).orderBy(subMuscles.position);
      case "exercises": return db.select().from(exercises).where(q ? or(like(exercises.nameAr, `%${q}%`), like(exercises.nameEn, `%${q}%`), like(exercises.slug, `%${q}%`)) : undefined).orderBy(exercises.nameEn);
      case "splits": return db.select().from(splits).where(and(isNull(splits.ownerUserId), q ? or(like(splits.nameAr, `%${q}%`), like(splits.nameEn, `%${q}%`), like(splits.slug, `%${q}%`)) : undefined)).orderBy(splits.nameEn);
      case "texts": return db.select().from(siteTexts).where(q ? or(like(siteTexts.textKey, `%${q}%`), like(siteTexts.value, `%${q}%`)) : undefined).orderBy(siteTexts.textKey);
      case "users": return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).where(q ? or(like(users.name, `%${q}%`), like(users.email, `%${q}%`)) : undefined).orderBy(users.createdAt);
    }
  }),

  getExerciseTargets: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({ subMuscleId: exerciseTargets.subMuscleId, role: exerciseTargets.role })
      .from(exerciseTargets).where(eq(exerciseTargets.exerciseId, input.id));
  }),

  getSplitDetails: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const split = (await db.select().from(splits).where(and(eq(splits.id, input.id), isNull(splits.ownerUserId))).limit(1))[0];
    if (!split) throw new TRPCError({ code: "NOT_FOUND", message: "Ready-made split not found." });
    const days = await db.select().from(splitDays).where(eq(splitDays.splitId, split.id)).orderBy(splitDays.position);
    const memberships = days.length ? await db.select().from(splitDayMuscles).where(inArray(splitDayMuscles.splitDayId, days.map(day => day.id))) : [];
    return { ...split, days: days.map(day => ({ nameAr: day.nameAr, nameEn: day.nameEn, muscleIds: memberships.filter(row => row.splitDayId === day.id).map(row => row.muscleId) })) };
  }),

  saveMuscle: adminProcedure.input(bilingual.extend({ id: z.number().int().positive().optional(), slug: z.string().trim().min(1).max(80), view: z.enum(["front", "back", "both"]), position: z.number().int().default(0) })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const values = { nameAr: input.nameAr, nameEn: input.nameEn, slug: input.slug, view: input.view, position: input.position };
    if (input.id) await db.update(muscles).set(values).where(eq(muscles.id, input.id)); else await db.insert(muscles).values(values);
    return { success: true };
  }),

  savePart: adminProcedure.input(bilingual.extend({ id: z.number().int().positive().optional(), muscleId: z.number().int().positive(), slug: z.string().trim().min(1).max(100), svgPathId: z.string().max(120).nullable().optional(), position: z.number().int().default(0) })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const values = { muscleId: input.muscleId, nameAr: input.nameAr, nameEn: input.nameEn, slug: input.slug, svgPathId: input.svgPathId ?? null, position: input.position };
    if (input.id) await db.update(subMuscles).set(values).where(eq(subMuscles.id, input.id)); else await db.insert(subMuscles).values(values);
    return { success: true };
  }),

  saveExercise: adminProcedure.input(z.object({
    id: z.number().int().positive().optional(), slug: z.string().min(1).max(140), nameAr: z.string().min(1).max(220), nameEn: z.string().min(1).max(220),
    equipment: z.enum(["machine", "dumbbell", "barbell", "cable", "bodyweight"]), level: z.enum(["beginner", "intermediate"]),
    descriptionAr: z.string().max(5000), descriptionEn: z.string().max(5000), stepsAr: z.string(), stepsEn: z.string(), mistakesAr: z.string(), mistakesEn: z.string(),
    mediaUrl: z.string().max(1024).nullable().optional(), mediaType: z.enum(["video", "gif", "lottie", "image", "svg"]).nullable().optional(), posterUrl: z.string().max(1024).nullable().optional(), status: z.enum(["draft", "published"]),
    targets: z.array(z.object({ subMuscleId: z.number().int().positive(), role: z.enum(["primary", "secondary"]) })).min(1).refine(targets => targets.filter(target => target.role === "primary").length === 1, "Exactly one primary target is required."),
  })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { targets, ...fields } = input;
    let id = input.id;
    if (id) await db.update(exercises).set(fields).where(eq(exercises.id, id));
    else {
      await db.insert(exercises).values(fields);
      const rows = await db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, input.slug)).limit(1);
      id = rows[0]?.id;
    }
    if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(exerciseTargets).where(eq(exerciseTargets.exerciseId, id));
    await db.insert(exerciseTargets).values(targets.map(target => ({ exerciseId: id!, subMuscleId: target.subMuscleId, role: target.role })));
    return { success: true, id };
  }),

  saveReadySplit: adminProcedure.input(z.object({
    id: z.number().int().positive().optional(), slug: z.string().min(1).max(120), nameAr: z.string().min(1).max(200), nameEn: z.string().min(1).max(200),
    descriptionAr: z.string().max(5000), descriptionEn: z.string().max(5000), level: z.enum(["beginner", "intermediate"]),
    days: z.array(z.object({ nameAr: z.string().min(1).max(160), nameEn: z.string().min(1).max(160), muscleIds: z.array(z.number().int().positive()) })).min(1).max(14),
  })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { days, ...fields } = input;
    let id = input.id;
    if (id) await db.update(splits).set({ ...fields, daysCount: days.length }).where(and(eq(splits.id, id), isNull(splits.ownerUserId)));
    else {
      const existing = (await db.select({ id: splits.id }).from(splits).where(and(eq(splits.slug, input.slug), isNull(splits.ownerUserId))).limit(1))[0];
      if (existing) { id = existing.id; await db.update(splits).set({ ...fields, daysCount: days.length }).where(eq(splits.id, id)); }
      else { await db.insert(splits).values({ ...fields, daysCount: days.length, ownerUserId: null }); const rows = await db.select({ id: splits.id }).from(splits).where(and(eq(splits.slug, input.slug), isNull(splits.ownerUserId))); id = rows.at(-1)?.id; }
    }
    if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(splitDays).where(eq(splitDays.splitId, id));
    for (const [position, day] of days.entries()) {
      await db.insert(splitDays).values({ splitId: id, nameAr: day.nameAr, nameEn: day.nameEn, position });
      const saved = await db.select({ id: splitDays.id }).from(splitDays).where(and(eq(splitDays.splitId, id), eq(splitDays.position, position))).limit(1);
      if (saved[0] && day.muscleIds.length) await db.insert(splitDayMuscles).values([...new Set(day.muscleIds)].map(muscleId => ({ splitDayId: saved[0].id, muscleId })));
    }
    return { success: true, id };
  }),

  saveText: adminProcedure.input(z.object({ textKey: z.string().trim().min(1).max(160), locale: z.enum(["ar", "en"]), value: z.string().max(10000) })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.insert(siteTexts).values(input).onDuplicateKeyUpdate({ set: { value: input.value, updatedAt: new Date() } });
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ kind: z.enum(["muscle", "part", "exercise", "split", "text"]), id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (input.kind === "muscle") await db.delete(muscles).where(eq(muscles.id, input.id));
    if (input.kind === "part") await db.delete(subMuscles).where(eq(subMuscles.id, input.id));
    if (input.kind === "exercise") await db.delete(exercises).where(eq(exercises.id, input.id));
    if (input.kind === "split") await db.delete(splits).where(and(eq(splits.id, input.id), isNull(splits.ownerUserId)));
    if (input.kind === "text") await db.delete(siteTexts).where(eq(siteTexts.id, input.id));
    return { success: true };
  }),

  previewImport: adminProcedure.input(z.object({ kind: z.enum(["exercises", "splits"]), format: z.enum(["json", "csv"]), content: z.string().max(5_000_000) })).mutation(async ({ input }) => {
    let records: any[];
    try { records = parseRows(input.kind, input.format, input.content); }
    catch (error) { if (error instanceof TRPCError) throw error; throw new TRPCError({ code: "BAD_REQUEST", message: "Import file is not valid JSON or CSV." }); }
    const errors = records.flatMap((row, index) => rowErrors(input.kind, row, index));
    return { count: records.length, valid: records.length - new Set(errors.map(error => error.row)).size, errors, preview: records.slice(0, 20) };
  }),

  importContent: adminProcedure.input(z.object({ kind: z.enum(["exercises", "splits"]), format: z.enum(["json", "csv"]), content: z.string().max(5_000_000) })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    let records: any[];
    try { records = parseRows(input.kind, input.format, input.content); }
    catch (error) { if (error instanceof TRPCError) throw error; throw new TRPCError({ code: "BAD_REQUEST", message: "Import file is not valid JSON or CSV." }); }
    const errors: { row: number; field: string; message: string }[] = [];
    let imported = 0;
    for (const [index, row] of records.entries()) {
      const validation = rowErrors(input.kind, row, index);
      if (validation.length) { errors.push(...validation); continue; }
      try {
        if (input.kind === "exercises") {
          const part = (await db.select().from(subMuscles).where(eq(subMuscles.slug, String(row.sub_muscle_slug))).limit(1))[0];
          if (!part) { errors.push({ row: index + 1, field: "sub_muscle_slug", message: "Sub-muscle slug was not found." }); continue; }
          const parent = (await db.select().from(muscles).where(eq(muscles.slug, String(row.muscle_slug))).limit(1))[0];
          if (!parent || parent.id !== part.muscleId) { errors.push({ row: index + 1, field: "muscle_slug", message: "Muscle does not match the selected sub-muscle." }); continue; }
          const fields = {
            slug: String(row.slug), nameAr: String(row.name_ar), nameEn: String(row.name_en), equipment: row.equipment as "machine" | "dumbbell" | "barbell" | "cable" | "bodyweight",
            level: row.level as "beginner" | "intermediate", descriptionAr: String(row.description_ar ?? ""), descriptionEn: String(row.description_en ?? ""),
            stepsAr: String(row.steps_ar ?? ""), stepsEn: String(row.steps_en ?? ""), mistakesAr: String(row.mistakes_ar ?? ""), mistakesEn: String(row.mistakes_en ?? ""),
            mediaUrl: row.media_url ? String(row.media_url) : null, mediaType: row.media_type === "video" || row.media_type === "gif" || row.media_type === "lottie" || row.media_type === "image" ? row.media_type : null,
            posterUrl: row.poster_url ? String(row.poster_url) : null, status: row.status === "draft" ? "draft" as const : "published" as const,
          };
          const existing = (await db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, fields.slug)).limit(1))[0];
          const id = existing?.id;
          if (id) await db.update(exercises).set(fields).where(eq(exercises.id, id));
          else { await db.insert(exercises).values(fields); }
          const saved = id ? { id } : (await db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, fields.slug)).limit(1))[0];
          if (!saved?.id) throw new Error("Could not resolve saved exercise.");
          const secondarySlugs: string[] = Array.isArray(row.secondary_sub_muscle_slugs) ? row.secondary_sub_muscle_slugs : String(row.secondary_sub_muscle_slugs ?? "").split(/[|;]/).map((value: string) => value.trim()).filter(Boolean);
          const secondary = secondarySlugs.length ? await db.select({ id: subMuscles.id }).from(subMuscles).where(inArray(subMuscles.slug, secondarySlugs)) : [];
          await db.delete(exerciseTargets).where(eq(exerciseTargets.exerciseId, saved.id));
          await db.insert(exerciseTargets).values([{ exerciseId: saved.id, subMuscleId: part.id, role: "primary" }, ...secondary.map(target => ({ exerciseId: saved.id, subMuscleId: target.id, role: "secondary" as const }))]);
        } else {
          let days = typeof row.days === "string" ? JSON.parse(row.days) : row.days;
          if (!Array.isArray(days) || !days.length) throw new Error("Days must be a non-empty array.");
          const systemSplit = (await db.select({ id: splits.id }).from(splits).where(and(eq(splits.slug, String(row.slug)), isNull(splits.ownerUserId))).limit(1))[0];
          const fields = { slug: String(row.slug), nameAr: String(row.name_ar), nameEn: String(row.name_en), daysCount: days.length, descriptionAr: String(row.description_ar ?? ""), descriptionEn: String(row.description_en ?? ""), level: row.level === "intermediate" ? "intermediate" as const : "beginner" as const, ownerUserId: null };
          if (systemSplit) await db.update(splits).set(fields).where(eq(splits.id, systemSplit.id)); else await db.insert(splits).values(fields);
          const saved = systemSplit ?? (await db.select({ id: splits.id }).from(splits).where(and(eq(splits.slug, fields.slug), isNull(splits.ownerUserId))).limit(1))[0];
          if (!saved?.id) throw new Error("Could not resolve saved split.");
          await db.delete(splitDays).where(eq(splitDays.splitId, saved.id));
          for (const [position, day] of days.entries()) {
            const muscleSlugs: string[] = Array.isArray(day.muscle_slugs) ? day.muscle_slugs : [];
            const muscleRows = muscleSlugs.length ? await db.select({ id: muscles.id }).from(muscles).where(inArray(muscles.slug, muscleSlugs)) : [];
            await db.insert(splitDays).values({ splitId: saved.id, nameAr: String(day.name_ar ?? day.nameAr ?? `اليوم ${position + 1}`), nameEn: String(day.name_en ?? day.nameEn ?? `Day ${position + 1}`), position });
            const splitDay = (await db.select({ id: splitDays.id }).from(splitDays).where(and(eq(splitDays.splitId, saved.id), eq(splitDays.position, position))).limit(1))[0];
            if (splitDay && muscleRows.length) await db.insert(splitDayMuscles).values(muscleRows.map(muscle => ({ splitDayId: splitDay.id, muscleId: muscle.id })));
          }
        }
        imported++;
      } catch (error) {
        errors.push({ row: index + 1, field: "record", message: error instanceof Error ? error.message.slice(0, 240) : "Could not import row." });
      }
    }
    return { imported, errors };
  }),

  exportContent: adminProcedure.query(async () => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [muscleRows, partRows, exerciseRows, textRows] = await Promise.all([
      db.select().from(muscles), db.select().from(subMuscles), db.select().from(exercises), db.select().from(siteTexts),
    ]);
    const splitRows = await db.select().from(splits).where(isNull(splits.ownerUserId));
    const targetRows = await db.select().from(exerciseTargets);
    const splitDayRows = splitRows.length ? await db.select().from(splitDays).where(inArray(splitDays.splitId, splitRows.map(row => row.id))) : [];
    const splitMuscleRows = splitDayRows.length ? await db.select().from(splitDayMuscles).where(inArray(splitDayMuscles.splitDayId, splitDayRows.map(row => row.id))) : [];
    return { muscles: muscleRows, subMuscles: partRows, exercises: exerciseRows, exerciseTargets: targetRows, splits: splitRows, splitDays: splitDayRows, splitDayMuscles: splitMuscleRows, translations: textRows, exportedAt: new Date().toISOString() };
  }),
});
