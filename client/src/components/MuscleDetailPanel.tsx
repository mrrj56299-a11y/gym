import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { muscleGuide } from "@/lib/muscleGuide";

type Lang = "ar" | "en";
type Region = { id: number; nameAr: string; nameEn: string };

const copy = {
  ar: {
    empty: "اضغط على عضلة في المجسّم لعرض تشريحها ونصائح تدريبها وتماريننا المقترحة.",
    anatomy: "التشريح ووظيفتها",
    tips: "نصائح التدريب",
    exercises: "تمارين مقترحة",
    stretches: "تمارين إطالة",
    loading: "جارٍ تحميل التمارين…",
    error: "تعذّر تحميل التمارين",
    add: "أضف إلى اليوم",
    none: "لا توجد تمارين لهذه المنطقة بعد.",
  },
  en: {
    empty: "Tap a muscle on the mannequin to see its anatomy, workout tips and recommended exercises.",
    anatomy: "Anatomy and function",
    tips: "Workout tips",
    exercises: "Recommended exercises",
    stretches: "Stretches",
    loading: "Loading exercises…",
    error: "Exercises could not be loaded",
    add: "Add to today",
    none: "No exercises are available for this region yet.",
  },
} as const;

export default function MuscleDetailPanel({ slug, groupName, subMuscle, lang, onAddExercise }: {
  slug: string;
  groupName: string;
  subMuscle: Region | null;
  lang: Lang;
  onAddExercise: (exercise: { id: number; name: string; equipment: string; level: string }) => void;
}) {
  const exercisesQuery = trpc.planner.exercises.useQuery(
    { subMuscleId: subMuscle?.id ?? 1 },
    { enabled: subMuscle !== null },
  );
  const c = copy[lang];
  const guide = slug ? muscleGuide[slug] : undefined;

  if (!guide) {
    return (
      <section className="muscle-detail" dir={lang === "ar" ? "rtl" : "ltr"}>
        <p className="muscle-detail-empty">{c.empty}</p>
      </section>
    );
  }

  const regionName = subMuscle ? (lang === "ar" ? subMuscle.nameAr : subMuscle.nameEn) : "";
  const rows = (exercisesQuery.data ?? []).slice(0, 6);

  return (
    <section className="muscle-detail" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="muscle-detail-head">
        <span className="eyebrow">{groupName}</span>
        {regionName && <h3>{regionName}</h3>}
      </div>
      <div className="muscle-detail-block">
        <h4>{c.anatomy}</h4>
        <p>{guide.function[lang]}</p>
      </div>
      <div className="muscle-detail-grid">
        <div className="muscle-detail-block">
          <h4>{c.tips}</h4>
          <ul>{guide.tips[lang].map(tip => <li key={tip}>{tip}</li>)}</ul>
        </div>
        <div className="muscle-detail-block">
          <h4>{c.stretches}</h4>
          <ul>{guide.stretches[lang].map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      <div className="muscle-detail-block">
        <h4>{c.exercises}</h4>
        {exercisesQuery.isLoading && <p>{c.loading}</p>}
        {exercisesQuery.isError && <p>{c.error}</p>}
        {exercisesQuery.isSuccess && rows.length === 0 && <p>{c.none}</p>}
        {rows.length > 0 && (
          <ul className="muscle-detail-exercises">
            {rows.map(row => {
              const name = lang === "ar" ? row.nameAr : row.nameEn;
              return (
                <li key={row.id}>
                  <div>
                    <b>{name}</b>
                    <small>{row.equipment} · {row.level}</small>
                  </div>
                  <button type="button" className="add-exercise" aria-label={`${c.add}: ${name}`} title={c.add} onClick={() => onAddExercise({ id: row.id, name, equipment: row.equipment, level: row.level })}>
                    <Plus size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
