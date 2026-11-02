import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { routineCopy, type Lang } from "@/lib/routineCopy";

type SetDraft = { weight: string; reps: string };
type Draft = Record<string, SetDraft>;

const draftKey = (routineExerciseId: number, setNumber: number) => `${routineExerciseId}:${setNumber}`;

type RoutineRecord = {
  id: number;
  name: string;
  days: {
    id: number;
    name: string;
    exercises: {
      id: number;
      nameAr: string;
      nameEn: string;
      equipment: string;
      level: string;
      sets: number;
      reps: string;
      restSeconds: number;
      logs: { setNumber: number; weightKg: number | null; reps: number | null }[];
    }[];
  }[];
};

function buildDraft(routine: RoutineRecord): Draft {
  const draft: Draft = {};
  for (const day of routine.days) {
    for (const exercise of day.exercises) {
      for (let setNumber = 1; setNumber <= exercise.sets; setNumber++) {
        const log = exercise.logs.find(entry => entry.setNumber === setNumber);
        draft[draftKey(exercise.id, setNumber)] = {
          weight: log?.weightKg == null ? "" : String(log.weightKg),
          reps: log?.reps == null ? "" : String(log.reps),
        };
      }
    }
  }
  return draft;
}

function parseOptionalNumber(value: string, integer: boolean): number | null | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  if (integer && !Number.isInteger(parsed)) return undefined;
  return parsed;
}

export default function RoutineDetail() {
  const [, params] = useRoute("/routines/:id");
  const routineId = Number(params?.id);
  const [lang, setLang] = useState<Lang>("ar");
  const [dayIndex, setDayIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const copy = routineCopy[lang];
  const validId = Number.isInteger(routineId) && routineId > 0;

  const routine = trpc.routines.get.useQuery({ id: routineId }, { enabled: validId, retry: false });
  const saveLogs = trpc.routines.saveLogs.useMutation({
    onSuccess: () => {
      toast.success(copy.logsSaved);
      routine.refetch();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (routine.data) setDraft(buildDraft(routine.data));
  }, [routine.data]);

  const record = routine.data;
  const currentDay = record?.days[dayIndex];

  const updateSet = (key: string, field: keyof SetDraft, value: string) => {
    setDraft(current => ({ ...current, [key]: { ...(current[key] ?? { weight: "", reps: "" }), [field]: value } }));
  };

  const save = () => {
    if (!record || !currentDay) return;
    const entries = [];
    for (const exercise of currentDay.exercises) {
      for (let setNumber = 1; setNumber <= exercise.sets; setNumber++) {
        const values = draft[draftKey(exercise.id, setNumber)] ?? { weight: "", reps: "" };
        const weightKg = parseOptionalNumber(values.weight, false);
        const reps = parseOptionalNumber(values.reps, true);
        if (weightKg === undefined || reps === undefined) {
          toast.error(copy.invalid);
          return;
        }
        entries.push({ routineExerciseId: exercise.id, setNumber, weightKg, reps });
      }
    }
    if (!entries.length) return;
    saveLogs.mutate({ routineId: record.id, entries });
  };

  return (
    <div className="routines-page" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="routines-header">
        <Link href="/routines" className="routines-back"><ArrowLeft size={16} />{copy.routinesLink}</Link>
        <button className="language-button" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "EN" : "عربي"}</button>
      </header>

      <section className="routines-main">
        {routine.isLoading && <p className="routines-note">{copy.loading}</p>}
        {(!validId || routine.error) && <p className="routines-note">{copy.notFound}</p>}

        {record && (
          <>
            <div className="eyebrow">{copy.plan}</div>
            <h1>{record.name}</h1>
            <Link href={`/?routine=${record.id}`} className="primary-button routine-planner-link">
              {copy.openInPlanner}<ArrowUpRight size={15} />
            </Link>

            <div className="routine-day-tabs" role="tablist">
              {record.days.map((day, index) => (
                <button
                  key={day.id}
                  role="tab"
                  aria-selected={index === dayIndex}
                  className={index === dayIndex ? "selected" : ""}
                  onClick={() => setDayIndex(index)}
                >
                  <small>{copy.day} {index + 1}</small>
                  <span>{day.name}</span>
                </button>
              ))}
            </div>

            {currentDay && !currentDay.exercises.length && <p className="routines-note">{copy.noExercises}</p>}

            {currentDay?.exercises.map(exercise => (
              <article key={exercise.id} className="routine-exercise">
                <header>
                  <div>
                    <b>{lang === "ar" ? exercise.nameAr : exercise.nameEn}</b>
                    <small>{exercise.sets} {copy.setsWord} · {exercise.reps} · {exercise.restSeconds}s {copy.rest}</small>
                  </div>
                </header>
                <div className="routine-set-head">
                  <span>{copy.set}</span>
                  <span>{copy.weight}</span>
                  <span>{copy.reps}</span>
                </div>
                {Array.from({ length: exercise.sets }, (_, index) => index + 1).map(setNumber => {
                  const key = draftKey(exercise.id, setNumber);
                  const values = draft[key] ?? { weight: "", reps: "" };
                  return (
                    <div key={key} className="routine-set-row">
                      <span>{setNumber}</span>
                      <input
                        inputMode="decimal"
                        aria-label={`${copy.weight} ${setNumber}`}
                        value={values.weight}
                        onChange={event => updateSet(key, "weight", event.target.value)}
                      />
                      <input
                        inputMode="numeric"
                        aria-label={`${copy.reps} ${setNumber}`}
                        value={values.reps}
                        onChange={event => updateSet(key, "reps", event.target.value)}
                      />
                    </div>
                  );
                })}
              </article>
            ))}

            {!!currentDay?.exercises.length && (
              <button className="primary-button full routine-save" disabled={saveLogs.isPending} onClick={save}>
                {copy.saveLogs}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
