import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { routineCopy, type Lang } from "@/lib/routineCopy";

export type RoutineExerciseInput = {
  exerciseId: number;
  nameAr: string;
  nameEn: string;
  equipment: string;
  level: string;
  sets: number;
  reps: string;
  restSeconds: number;
};

export type RoutineDayInput = { name: string; items: RoutineExerciseInput[] };

export default function SaveRoutineDialog({ lang, days, onClose, onSaved }: {
  lang: Lang;
  days: RoutineDayInput[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const copy = routineCopy[lang];
  const [name, setName] = useState("");
  const exerciseCount = days.reduce((total, day) => total + day.items.length, 0);
  const create = trpc.routines.create.useMutation({
    onSuccess: () => {
      toast.success(copy.routineSaved);
      onSaved();
    },
    onError: error => toast.error(error.message),
  });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || !exerciseCount) return;
    create.mutate({ name: trimmed, days });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="dialog-card" role="dialog" aria-modal="true" aria-label={copy.dialogTitle} dir={lang === "ar" ? "rtl" : "ltr"} onClick={event => event.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label={copy.close}><X size={17} /></button>
        <div className="eyebrow">ROUTINE</div>
        <h2>{copy.dialogTitle}</h2>
        <p>{copy.dialogHelp}</p>
        <label className="form-label">
          {copy.nameLabel}
          <input className="form-input" value={name} maxLength={180} onChange={event => setName(event.target.value)} autoFocus />
        </label>
        {!exerciseCount && <p className="routine-error">{copy.needExercise}</p>}
        <button className="primary-button full" disabled={create.isPending || !name.trim() || !exerciseCount} onClick={submit}>
          {copy.saveRoutine}
        </button>
      </div>
    </div>
  );
}
