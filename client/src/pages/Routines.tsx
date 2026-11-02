import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { routineCopy, type Lang } from "@/lib/routineCopy";

export default function Routines() {
  const [lang, setLang] = useState<Lang>("ar");
  const copy = routineCopy[lang];
  const me = trpc.auth.me.useQuery();
  const routines = trpc.routines.list.useQuery(undefined, { enabled: !!me.data });
  const remove = trpc.routines.delete.useMutation({
    onSuccess: () => {
      toast.success(copy.deleted);
      routines.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const dateFormat = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" });

  return (
    <div className="routines-page" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="routines-header">
        <Link href="/" className="routines-back"><ArrowLeft size={16} />{copy.backToPlanner}</Link>
        <button className="language-button" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "EN" : "عربي"}</button>
      </header>

      <section className="routines-main">
        <div className="eyebrow">ROUTINES</div>
        <h1>{copy.title}</h1>
        <p className="routines-subtitle">{copy.subtitle}</p>

        {me.isLoading && <p className="routines-note">{copy.loading}</p>}
        {!me.isLoading && !me.data && <p className="routines-note">{copy.signIn}</p>}

        {me.data && routines.isLoading && <p className="routines-note">{copy.loading}</p>}
        {me.data && routines.error && <p className="routines-note">{routines.error.message}</p>}

        {me.data && routines.data && !routines.data.length && <p className="routines-note">{copy.empty}</p>}

        {me.data && !!routines.data?.length && (
          <ul className="routine-list">
            {routines.data.map(routine => (
              <li key={routine.id} className="routine-row">
                <div className="routine-row-copy">
                  <b>{routine.name}</b>
                  <small>{copy.updated}: {dateFormat.format(new Date(routine.updatedAt))}</small>
                </div>
                <Link href={`/routines/${routine.id}`} className="routine-open">{copy.open}<ArrowUpRight size={15} /></Link>
                <button
                  className="icon-button"
                  aria-label={copy.deleteLabel}
                  disabled={remove.isPending}
                  onClick={() => window.confirm(copy.confirmDelete) && remove.mutate({ id: routine.id })}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
