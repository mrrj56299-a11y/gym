import { eq, sql } from "drizzle-orm";
import exerciseData from "../seed/exercises.json";
import { exercises, exerciseTargets, subMuscles } from "../drizzle/schema";
import { getDb } from "./db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required to seed exercises");

  const partRows = await db.select({ id: subMuscles.id, slug: subMuscles.slug }).from(subMuscles);
  const partIds = new Map(partRows.map((part) => [part.slug, part.id]));
  const missingParts = [...new Set(exerciseData.exercises.map((item) => item.sub_muscle_slug))].filter((slug) => !partIds.has(slug));
  if (missingParts.length) throw new Error(`Unknown seed sub-muscles: ${missingParts.join(", ")}`);

  const rows = exerciseData.exercises.map((item) => ({
    slug: item.slug,
    nameAr: item.name_ar,
    nameEn: item.name_en,
    equipment: item.equipment as "machine" | "dumbbell" | "barbell" | "cable" | "bodyweight",
    level: item.level as "beginner" | "intermediate",
    descriptionAr: item.description_ar,
    descriptionEn: item.description_en,
    stepsAr: JSON.stringify(item.steps_ar),
    stepsEn: JSON.stringify(item.steps_en),
    mistakesAr: JSON.stringify(item.mistakes_ar),
    mistakesEn: JSON.stringify(item.mistakes_en),
    status: item.status as "draft" | "published",
  }));
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(exercises).values(rows.slice(i, i + 50)).onDuplicateKeyUpdate({
      set: { nameAr: sql`values(name_ar)`, nameEn: sql`values(name_en)` },
    });
  }

  const seeded = await db.select({ id: exercises.id, slug: exercises.slug }).from(exercises);
  const exerciseIds = new Map(seeded.map((exercise) => [exercise.slug, exercise.id]));
  const existingPrimary = await db.select({ exerciseId: exerciseTargets.exerciseId }).from(exerciseTargets).where(eq(exerciseTargets.role, "primary"));
  const primaryIds = new Set(existingPrimary.map((target) => target.exerciseId));
  const targets = exerciseData.exercises.flatMap((item) => {
    const exerciseId = exerciseIds.get(item.slug);
    const subMuscleId = partIds.get(item.sub_muscle_slug);
    return exerciseId && subMuscleId && !primaryIds.has(exerciseId) ? [{ exerciseId, subMuscleId, role: "primary" as const }] : [];
  });
  for (let i = 0; i < targets.length; i += 200) {
    await db.insert(exerciseTargets).values(targets.slice(i, i + 200)).onDuplicateKeyUpdate({ set: { role: "primary" } });
  }
  console.log(`Exercise seed complete: ${rows.length} seed records checked; ${targets.length} missing primary targets added; split days left untouched.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Exercise seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
