import muscleData from "../seed/muscles.json";
import exerciseData from "../seed/exercises.json";
import splitData from "../seed/splits.json";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { exercises, exerciseTargets, muscles, splitDays, splitDayMuscles, splits, subMuscles } from "../drizzle/schema";

export async function seedCatalogue() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required to seed the catalogue");
  const muscleIds = new Map<string, number>();
  const partIds = new Map<string, number>();
  for (const m of muscleData.muscles) {
    await db.insert(muscles).values({ slug: m.slug, nameAr: m.name_ar, nameEn: m.name_en, view: m.view as "front" | "back" | "both", position: m.position })
      .onDuplicateKeyUpdate({ set: { nameAr: m.name_ar, nameEn: m.name_en, view: m.view as "front" | "back" | "both", position: m.position } });
  }
  const allMuscles = await db.select({ id: muscles.id, slug: muscles.slug }).from(muscles);
  for (const row of allMuscles) muscleIds.set(row.slug, row.id);
  const allParts = muscleData.muscles.flatMap(m => m.sub_muscles.map((part, position) => ({ muscleId: muscleIds.get(m.slug)!, position, ...part })));
  for (const p of allParts) {
    await db.insert(subMuscles).values({ muscleId: p.muscleId, slug: p.slug, nameAr: p.name_ar, nameEn: p.name_en, svgPathId: p.svg_path_id, position: p.position })
      .onDuplicateKeyUpdate({ set: { muscleId: p.muscleId, nameAr: p.name_ar, nameEn: p.name_en, svgPathId: p.svg_path_id, position: p.position } });
  }
  const partRows = await db.select({ id: subMuscles.id, slug: subMuscles.slug }).from(subMuscles);
  for (const row of partRows) partIds.set(row.slug, row.id);
  const exerciseRows = exerciseData.exercises.map(e => ({
    slug: e.slug, nameAr: e.name_ar, nameEn: e.name_en, equipment: e.equipment as "machine" | "dumbbell" | "barbell" | "cable" | "bodyweight", level: e.level as "beginner" | "intermediate",
    descriptionAr: e.description_ar, descriptionEn: e.description_en, stepsAr: JSON.stringify(e.steps_ar), stepsEn: JSON.stringify(e.steps_en), mistakesAr: JSON.stringify(e.mistakes_ar), mistakesEn: JSON.stringify(e.mistakes_en), status: e.status as "draft" | "published",
  }));
  for (let i = 0; i < exerciseRows.length; i += 50) {
    const batch = exerciseRows.slice(i, i + 50);
    await db.insert(exercises).values(batch).onDuplicateKeyUpdate({ set: { nameAr: sql`values(name_ar)`, nameEn: sql`values(name_en)` } });
  }
  const seeded = await db.select({ id: exercises.id, slug: exercises.slug }).from(exercises);
  const exerciseIds = new Map(seeded.map(row => [row.slug, row.id]));
  const targets = exerciseData.exercises.flatMap(e => {
    const exerciseId = exerciseIds.get(e.slug); const subMuscleId = partIds.get(e.sub_muscle_slug);
    return exerciseId && subMuscleId ? [{ exerciseId, subMuscleId, role: "primary" as const }] : [];
  });
  for (let i = 0; i < targets.length; i += 200) {
    await db.insert(exerciseTargets).values(targets.slice(i, i + 200)).onDuplicateKeyUpdate({ set: { role: "primary" } });
  }
  for (const split of splitData.splits) {
    const existing = await db.select({ id: splits.id }).from(splits).where(and(eq(splits.slug, split.slug), isNull(splits.ownerUserId))).orderBy(splits.id);
    if (existing.length > 1) await db.delete(splits).where(and(eq(splits.slug, split.slug), isNull(splits.ownerUserId), inArray(splits.id, existing.slice(1).map(row => row.id))));
    const fields = { nameAr: split.name_ar, nameEn: split.name_en, daysCount: split.days.length, descriptionAr: split.description_ar, descriptionEn: split.description_en, level: split.level as "beginner" | "intermediate" };
    let splitId = existing[0]?.id;
    if (splitId) await db.update(splits).set(fields).where(eq(splits.id, splitId));
    else {
      await db.insert(splits).values({ ownerUserId: null, slug: split.slug, ...fields });
      splitId = (await db.select({ id: splits.id }).from(splits).where(and(eq(splits.slug, split.slug), isNull(splits.ownerUserId))).orderBy(splits.id).limit(1))[0]?.id;
    }
    if (!splitId) continue;
    const old = await db.select({ id: splitDays.id }).from(splitDays).where(eq(splitDays.splitId, splitId));
    if (old.length) await db.delete(splitDays).where(eq(splitDays.splitId, splitId));
    await db.insert(splitDays).values(split.days.map((day, position) => ({ splitId, nameAr: day.name_ar, nameEn: day.name_en, position })));
    const days = await db.select({ id: splitDays.id, position: splitDays.position }).from(splitDays).where(eq(splitDays.splitId, splitId));
    const mappings = split.days.flatMap((day, position) => {
      const splitDayId = days.find(d => d.position === position)?.id;
      return splitDayId ? [...new Set(day.muscle_slugs)].flatMap(slug => { const muscleId = muscleIds.get(slug); return muscleId ? [{ splitDayId, muscleId }] : []; }) : [];
    });
    if (mappings.length) await db.insert(splitDayMuscles).values(mappings).onDuplicateKeyUpdate({ set: { muscleId: sql`values(muscle_id)` } });
  }
  const actualExercises = await db.select({ id: exercises.id }).from(exercises);
  const actualTargets = await db.select({ exerciseId: exerciseTargets.exerciseId }).from(exerciseTargets);
  const actualSplits = await db.select({ id: splits.id }).from(splits).where(isNull(splits.ownerUserId));
  return { muscles: allMuscles.length, parts: partRows.length, exercises: actualExercises.length, exerciseTargets: actualTargets.length, splits: actualSplits.length };
}
