import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Check, Download, FileUp, FileJson, Dumbbell, FileText, Layers3, LogOut, Plus, Search, ShieldAlert, Users, X, Trash2, Pencil, Upload, LoaderCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Section = "muscles" | "parts" | "exercises" | "splits" | "texts" | "users";
type Language = "en" | "ar";
type Field = { key: string; label: string; kind?: "text" | "long" | "number" | "select"; options?: string[]; wide?: boolean; hint?: string };
const sections: { id: Section; en: string; ar: string; icon: typeof Dumbbell }[] = [
  { id: "muscles", en: "Muscles", ar: "العضلات", icon: Dumbbell },
  { id: "parts", en: "Sub-parts", ar: "الأجزاء الفرعية", icon: Layers3 },
  { id: "exercises", en: "Exercises", ar: "التمارين", icon: Dumbbell },
  { id: "splits", en: "Ready-made splits", ar: "الأنظمة الجاهزة", icon: Layers3 },
  { id: "texts", en: "Site text & translations", ar: "نصوص الموقع والترجمات", icon: FileText },
  { id: "users", en: "Users · read only", ar: "المستخدمون · للقراءة فقط", icon: Users },
];
const muscleFields: Field[] = [
  { key: "nameAr", label: "الاسم بالعربية" }, { key: "nameEn", label: "English name" },
  { key: "slug", label: "Slug" }, { key: "view", label: "View", kind: "select", options: ["front", "back", "both"] },
  { key: "position", label: "Display order", kind: "number" },
];
const partFields: Field[] = [
  { key: "nameAr", label: "الاسم بالعربية" }, { key: "nameEn", label: "English name" },
  { key: "slug", label: "Slug" }, { key: "muscleId", label: "Parent muscle", kind: "select" },
  { key: "svgPathId", label: "3D zone / legacy path ID" }, { key: "position", label: "Display order", kind: "number" },
];
const exerciseFields: Field[] = [
  { key: "nameAr", label: "الاسم بالعربية" }, { key: "nameEn", label: "English name" }, { key: "slug", label: "Slug" },
  { key: "equipment", label: "Equipment", kind: "select", options: ["machine", "dumbbell", "barbell", "cable", "bodyweight"] },
  { key: "level", label: "Level", kind: "select", options: ["beginner", "intermediate"] },
  { key: "status", label: "Publication status", kind: "select", options: ["draft", "published"] },
  { key: "descriptionAr", label: "الوصف بالعربية", kind: "long", wide: true }, { key: "descriptionEn", label: "English description", kind: "long", wide: true },
  { key: "stepsAr", label: "خطوات الأداء بالعربية (كل خطوة في سطر)", kind: "long", wide: true }, { key: "stepsEn", label: "Form steps (one per line)", kind: "long", wide: true },
  { key: "mistakesAr", label: "أخطاء شائعة بالعربية (كل خطأ في سطر)", kind: "long", wide: true }, { key: "mistakesEn", label: "Common mistakes (one per line)", kind: "long", wide: true },
  { key: "mediaUrl", label: "Demo media URL", wide: true }, { key: "mediaType", label: "Media type", kind: "select", options: ["", "video", "gif", "image", "lottie"] },
  { key: "posterUrl", label: "Poster image URL", wide: true },
];
const splitFields: Field[] = [
  { key: "nameAr", label: "الاسم بالعربية" }, { key: "nameEn", label: "English name" }, { key: "slug", label: "Slug" },
  { key: "level", label: "Recommended level", kind: "select", options: ["beginner", "intermediate"] },
  { key: "descriptionAr", label: "الوصف بالعربية", kind: "long", wide: true }, { key: "descriptionEn", label: "English description", kind: "long", wide: true },
  { key: "daysJson", label: "Training days (JSON)", kind: "long", wide: true, hint: 'Each day: {"nameAr":"...","nameEn":"...","muscleIds":[1,2]}' },
];
const textFields: Field[] = [
  { key: "textKey", label: "Translation key" }, { key: "locale", label: "Language", kind: "select", options: ["ar", "en"] },
  { key: "value", label: "Text value", kind: "long", wide: true },
];
const emptyDraft = (section: Section): Record<string, any> => {
  if (section === "muscles") return { nameAr: "", nameEn: "", slug: "", view: "both", position: 0 };
  if (section === "parts") return { nameAr: "", nameEn: "", slug: "", muscleId: "", svgPathId: "", position: 0 };
  if (section === "exercises") return { slug: "", nameAr: "", nameEn: "", equipment: "bodyweight", level: "beginner", status: "draft", descriptionAr: "", descriptionEn: "", stepsAr: "", stepsEn: "", mistakesAr: "", mistakesEn: "", mediaUrl: "", mediaType: "", posterUrl: "" };
  if (section === "splits") return { slug: "", nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", level: "beginner", daysJson: '[\n  {"nameAr":"اليوم الأول","nameEn":"Day 1","muscleIds":[]}\n]' };
  return { textKey: "", locale: "ar", value: "" };
};
const bilingual = (lang: Language, ar: string, en: string) => lang === "ar" ? ar : en;
const fieldNames: Record<string, { ar: string; en: string }> = {
  nameAr:{ar:"الاسم بالعربية",en:"Arabic name"}, nameEn:{ar:"الاسم بالإنجليزية",en:"English name"}, slug:{ar:"المعرّف المختصر",en:"Slug"}, view:{ar:"منظور التشريح",en:"Anatomy view"}, position:{ar:"ترتيب العرض",en:"Display order"}, muscleId:{ar:"العضلة الأم",en:"Parent muscle"}, svgPathId:{ar:"معرّف المنطقة ثلاثية الأبعاد",en:"3D zone ID"}, equipment:{ar:"المعدات",en:"Equipment"}, level:{ar:"المستوى المقترح",en:"Recommended level"}, status:{ar:"حالة النشر",en:"Publication status"}, descriptionAr:{ar:"الوصف بالعربية",en:"Arabic description"}, descriptionEn:{ar:"الوصف بالإنجليزية",en:"English description"}, stepsAr:{ar:"خطوات الأداء بالعربية",en:"Arabic form steps"}, stepsEn:{ar:"خطوات الأداء بالإنجليزية",en:"English form steps"}, mistakesAr:{ar:"الأخطاء الشائعة بالعربية",en:"Arabic common mistakes"}, mistakesEn:{ar:"الأخطاء الشائعة بالإنجليزية",en:"English common mistakes"}, mediaUrl:{ar:"رابط الوسيط التوضيحي",en:"Demo media URL"}, mediaType:{ar:"نوع الوسيط",en:"Media type"}, posterUrl:{ar:"رابط صورة الملصق",en:"Poster image URL"}, daysJson:{ar:"أيام التدريب (JSON)",en:"Training days (JSON)"}, textKey:{ar:"مفتاح الترجمة",en:"Translation key"}, locale:{ar:"اللغة",en:"Language"}, value:{ar:"النص",en:"Text value"}
};
const fieldLabel = (field: Field, lang: Language) => fieldNames[field.key]?.[lang] ?? field.label;
const fieldHint = (field: Field, lang: Language) => field.key === "daysJson" ? bilingual(lang, 'كل يوم بصيغة JSON: {"nameAr":"…","nameEn":"…","muscleIds":[1,2]}', 'Each day: {"nameAr":"…","nameEn":"…","muscleIds":[1,2]}') : field.hint;
const enumLabel = (value: string, lang: Language) => {
  const labels: Record<string, { ar: string; en: string }> = { front:{ar:"أمامي",en:"Front"}, back:{ar:"خلفي",en:"Back"}, both:{ar:"أمامي وخلفي",en:"Front and back"}, machine:{ar:"جهاز",en:"Machine"}, dumbbell:{ar:"دمبل",en:"Dumbbell"}, barbell:{ar:"بار",en:"Barbell"}, cable:{ar:"كابل",en:"Cable"}, bodyweight:{ar:"وزن الجسم",en:"Bodyweight"}, beginner:{ar:"مبتدئ",en:"Beginner"}, intermediate:{ar:"متوسط",en:"Intermediate"}, draft:{ar:"مسودة",en:"Draft"}, published:{ar:"منشور",en:"Published"}, video:{ar:"فيديو",en:"Video"}, gif:{ar:"صورة متحركة",en:"GIF"}, image:{ar:"صورة",en:"Image"}, lottie:{ar:"Lottie",en:"Lottie"}, user:{ar:"مستخدم",en:"User"}, admin:{ar:"مشرف",en:"Admin"}, "—":{ar:"—",en:"—"} };
  return labels[value]?.[lang] ?? value;
};
const tableHeader = (key: string, lang: Language) => { const labels: Record<string,{ar:string;en:string}> = { id:{ar:"المعرّف",en:"ID"}, nameAr:{ar:"العربية",en:"Arabic"}, nameEn:{ar:"الإنجليزية",en:"English"}, slug:{ar:"المعرّف المختصر",en:"Slug"}, role:{ar:"الدور",en:"Role"}, locale:{ar:"اللغة",en:"Language"}, status:{ar:"الحالة",en:"Status"}, email:{ar:"البريد الإلكتروني",en:"Email"} }; return labels[key]?.[lang] ?? key.replaceAll("_", " "); };

export default function Admin() {
  const [lang, setLang] = useState<Language>("ar");
  const [section, setSection] = useState<Section>("exercises");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [targets, setTargets] = useState<{ subMuscleId: number; role: "primary" | "secondary" }[]>([]);
  const [importText, setImportText] = useState("");
  const [importKind, setImportKind] = useState<"exercises" | "splits">("exercises");
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json");
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const me = trpc.auth.me.useQuery();
  const list = trpc.admin.list.useQuery({ kind: section, q: query || undefined }, { enabled: me.data?.role === "admin" });
  const summary = trpc.admin.summary.useQuery(undefined, { enabled: me.data?.role === "admin" });
  const muscles = trpc.splits.muscles.useQuery(undefined, { enabled: me.data?.role === "admin" });
  const subParts = trpc.admin.list.useQuery({ kind: "parts" }, { enabled: me.data?.role === "admin" });
  const targetQuery = trpc.admin.getExerciseTargets.useQuery({ id: Number(draft.id) || 1 }, { enabled: modalOpen && section === "exercises" && !!draft.id });
  const splitQuery = trpc.admin.getSplitDetails.useQuery({ id: Number(draft.id) || 1 }, { enabled: modalOpen && section === "splits" && !!draft.id });
  const exportQuery = trpc.admin.exportContent.useQuery(undefined, { enabled: false });
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { location.href = "/"; } });
  const refresh = () => {
    void list.refetch(); void summary.refetch(); void subParts.refetch(); void muscles.refetch();
    setModalOpen(false); setDraft({}); setTargets([]);
  };
  const saveMuscle = trpc.admin.saveMuscle.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const savePart = trpc.admin.savePart.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const saveExercise = trpc.admin.saveExercise.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const saveSplit = trpc.admin.saveReadySplit.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const saveText = trpc.admin.saveText.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const deleteItem = trpc.admin.delete.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const previewImport = trpc.admin.previewImport.useMutation({ onError: error => toast.error(error.message) });
  const commitImport = trpc.admin.importContent.useMutation({ onSuccess: async result => { setImportResult({ ...importResult, committed: result }); await utils.admin.list.invalidate(); await summary.refetch(); toast.success(bilingual(lang, `تم استيراد ${result.imported} سجلًا`, `${result.imported} records imported`)); }, onError: error => toast.error(error.message) });

  useEffect(() => {
    if (section === "exercises" && targetQuery.data && modalOpen) {
      setTargets(targetQuery.data.map((target: any) => ({ subMuscleId: target.subMuscleId, role: target.role })));
    }
  }, [targetQuery.data, modalOpen, section]);
  useEffect(() => {
    if (section === "splits" && splitQuery.data && modalOpen && !draft.daysJson) {
      setDraft(current => ({ ...current, daysJson: JSON.stringify(splitQuery.data.days, null, 2) }));
    }
  }, [splitQuery.data, modalOpen, section, draft.daysJson]);

  const rows = (list.data ?? []) as any[];
  const visibleRows = useMemo(() => rows.filter(row => filter === "all" || (row.status && row.status === filter) || (row.role && row.role === filter) || (row.locale && row.locale === filter)), [rows, filter]);
  const fields = section === "muscles" ? muscleFields : section === "parts" ? partFields : section === "exercises" ? exerciseFields : section === "splits" ? splitFields : textFields;
  const openNew = () => { setDraft(emptyDraft(section)); setTargets([]); setModalOpen(true); };
  const openEdit = (row: any) => {
    setDraft({ ...row, id: Number(row.id), muscleId: String(row.muscleId ?? ""), position: Number(row.position ?? 0), svgPathId: row.svgPathId ?? "", daysJson: "" });
    setTargets([]); setModalOpen(true);
  };
  const save = () => {
    const id = draft.id ? Number(draft.id) : undefined;
    if (section === "muscles") saveMuscle.mutate({ ...draft, id, position: Number(draft.position || 0) } as any);
    else if (section === "parts") savePart.mutate({ ...draft, id, muscleId: Number(draft.muscleId), position: Number(draft.position || 0), svgPathId: draft.svgPathId || null } as any);
    else if (section === "exercises") {
      if (!targets.some(target => target.role === "primary")) { toast.error(bilingual(lang, "اختر هدفًا أساسيًا واحدًا على الأقل.", "Choose at least one primary target.")); return; }
      saveExercise.mutate({ ...draft, id, mediaUrl: draft.mediaUrl || null, mediaType: draft.mediaType || null, posterUrl: draft.posterUrl || null, targets } as any);
    } else if (section === "splits") {
      let days: any[];
      try { days = JSON.parse(draft.daysJson || "[]"); } catch { toast.error(bilingual(lang, "صيغة الأيام JSON غير صالحة.", "Training days must be valid JSON.")); return; }
      saveSplit.mutate({ ...draft, id, days } as any);
    } else if (section === "texts") saveText.mutate({ textKey: String(draft.textKey), locale: draft.locale, value: String(draft.value) });
  };
  const remove = (row: any) => {
    const title = row.nameEn ?? row.textKey ?? row.slug ?? row.email ?? String(row.id);
    if (!window.confirm(bilingual(lang, `تأكيد حذف «${title}»؟ لا يمكن التراجع عن هذا الإجراء.`, `Delete “${title}”? This cannot be undone.`))) return;
    const kind = section === "muscles" ? "muscle" : section === "parts" ? "part" : section === "exercises" ? "exercise" : section === "splits" ? "split" : "text";
    deleteItem.mutate({ kind, id: Number(row.id) });
  };
  const uploadMedia = async (file: File) => {
    setUploading(true);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": file.name }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setDraft(current => ({ ...current, mediaUrl: result.url, mediaType: result.mediaType, posterUrl: result.posterUrl || current.posterUrl || "" }));
      toast.success(bilingual(lang, "تم رفع الوسيط والتحقق منه.", "Media uploaded and validated."));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
    finally { setUploading(false); }
  };
  const chooseImport = async (file: File) => {
    const format = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
    const content = await file.text(); setImportFormat(format); setImportText(content); setImportResult(null);
    previewImport.mutate({ kind: importKind, format, content }, { onSuccess: result => setImportResult(result) });
  };
  const exportJson = async () => {
    try {
      const result = await exportQuery.refetch();
      if (!result.data) throw new Error("No export data returned.");
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `gym-content-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Export failed"); }
  };

  if (me.isLoading) return <div className="admin-page"><p>{bilingual(lang, "جارٍ التحقق من صلاحية الإدارة…", "Checking administrator access…")}</p></div>;
  if (me.data?.role !== "admin") return <div className="admin-page" dir={lang === "ar" ? "rtl" : "ltr"}><header className="admin-header"><Link href="/" className="admin-brand">FORM / FIELD</Link><button className="language-button" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "EN" : "عربي"}</button></header><div className="admin-empty"><ShieldAlert size={28}/><h1>{bilingual(lang, "الدخول للمشرفين فقط", "Administrator access required")}</h1><p>{bilingual(lang, "هذه الصفحة وواجهاتها البرمجية محمية. سجّل الدخول بحساب مشرف معتمد.", "This area and its APIs are protected. Sign in with an authorized administrator account.")}</p><Link href="/" className="primary-button">{bilingual(lang, "العودة إلى المخطط", "Return to planner")}</Link></div></div>;

  return <main className="admin-page" dir={lang === "ar" ? "rtl" : "ltr"}>
    <header className="admin-header">
      <div><div className="eyebrow">FORM / FIELD · CONTROL ROOM</div><h1 className="admin-title">{bilingual(lang, "مركز إدارة المحتوى", "Content control room")}</h1></div>
      <div className="admin-header-actions"><span className="admin-email">{me.data.email}</span><button className="language-button" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "EN" : "عربي"}</button><button className="icon-button" aria-label={bilingual(lang, "تسجيل الخروج", "Sign out")} onClick={() => logout.mutate()}><LogOut size={16}/></button><Link href="/" className="text-action"><ArrowLeft size={14}/>{bilingual(lang, "الموقع", "Public site")}</Link></div>
    </header>
    <div className="admin-layout">
      <nav className="admin-nav" aria-label={bilingual(lang, "أقسام الإدارة", "Admin sections")}>{sections.map(item => <button key={item.id} className={`nav-item ${section === item.id ? "active" : ""}`} onClick={() => { setSection(item.id); setFilter("all"); setQuery(""); setImportResult(null); }}><item.icon size={15}/><span>{bilingual(lang, item.ar, item.en)}</span></button>)}</nav>
      <section className="admin-content">
        <div className="admin-stats">{[[bilingual(lang, "المستخدمون", "Users"), summary.data?.users], [bilingual(lang, "العضلات", "Muscles"), summary.data?.muscles], [bilingual(lang, "التمارين", "Exercises"), summary.data?.exercises], [bilingual(lang, "الأنظمة الجاهزة", "Ready-made splits"), summary.data?.splits]].map(([label, value]) => <div key={String(label)} className="session-stamp"><span>{label}</span><strong>{value ?? "—"}</strong></div>)}</div>
        <div className="admin-section-head"><div><div className="eyebrow">{bilingual(lang, "إدارة المحتوى", "CONTENT MANAGEMENT")}</div><h2>{bilingual(lang, sections.find(item => item.id === section)!.ar, sections.find(item => item.id === section)!.en)}</h2></div><div className="admin-tools">{section !== "users" && <button className="primary-button" onClick={openNew}><Plus size={15}/>{bilingual(lang, "إضافة", "Add item")}</button>}{section !== "users" && <button className="text-action" onClick={() => void exportJson()}><Download size={14}/>{bilingual(lang, "تصدير JSON", "Export JSON")}</button>}</div></div>
        {section !== "users" && (section === "exercises" || section === "splits") && <div className="admin-import">
          <div className="admin-import-head"><div><div className="eyebrow">{bilingual(lang, "استيراد جماعي", "BULK IMPORT")}</div><b>{bilingual(lang, "راجع الملف قبل الحفظ", "Preview before saving")}</b></div><div className="admin-import-controls"><select className="form-input" value={importKind} onChange={event => { setImportKind(event.target.value as "exercises" | "splits"); setImportResult(null); }}><option value="exercises">{bilingual(lang, "تمارين", "Exercises")}</option><option value="splits">{bilingual(lang, "أنظمة", "Splits")}</option></select><label className="text-action file-pick"><FileUp size={14}/>{bilingual(lang, "اختيار JSON / CSV", "Choose JSON / CSV")}<input type="file" accept=".json,.csv,application/json,text/csv" onChange={event => { const file = event.target.files?.[0]; if (file) void chooseImport(file); }} /></label></div></div>
          {importResult && <div className="import-report"><div>{bilingual(lang, `الملف: ${importResult.count} صف · ${importResult.valid} صالح`, `File: ${importResult.count} rows · ${importResult.valid} valid`)}</div>{importResult.errors?.length > 0 && <div className="import-errors">{importResult.errors.map((error: any, index: number) => <p key={`${error.row}-${error.field}-${index}`}>{bilingual(lang, `صف ${error.row} · ${error.field}: ${error.message}`, `Row ${error.row} · ${error.field}: ${error.message}`)}</p>)}</div>}{importResult.preview?.length > 0 && <details className="import-preview"><summary>{bilingual(lang, "معاينة أول ٢٠ سجلًا", "Preview first 20 records")}</summary><pre>{JSON.stringify(importResult.preview, null, 2)}</pre></details>}{importResult.committed && <div className="import-final">{bilingual(lang, `تم الحفظ: ${importResult.committed.imported} · تعذر: ${importResult.committed.errors.length}`, `Saved: ${importResult.committed.imported} · Failed: ${importResult.committed.errors.length}`)}</div>}{importResult.committed?.errors?.length > 0 && <div className="import-errors">{importResult.committed.errors.map((error: any, index: number) => <p key={`commit-${error.row}-${index}`}>{bilingual(lang, `صف ${error.row} · ${error.field}: ${error.message}`, `Row ${error.row} · ${error.field}: ${error.message}`)}</p>)}</div>}{importResult.valid > 0 && !importResult.committed && <button className="primary-button" onClick={() => commitImport.mutate({ kind: importKind, format: importFormat, content: importText })} disabled={commitImport.isPending}><Check size={14}/>{bilingual(lang, "حفظ الصفوف الصالحة", "Save valid rows")}</button>}</div>}
        </div>}
        <div className="admin-filterbar"><label className="admin-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={bilingual(lang, `بحث في ${sections.find(item => item.id === section)!.ar}`, `Search ${section}…`)}/></label><select className="form-input admin-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{bilingual(lang, "كل العناصر", "All records")}</option>{section === "exercises" && <><option value="published">{enumLabel("published", lang)}</option><option value="draft">{enumLabel("draft", lang)}</option></>}{section === "users" && <><option value="user">{enumLabel("user", lang)}</option><option value="admin">{enumLabel("admin", lang)}</option></>}{section === "texts" && <><option value="ar">العربية</option><option value="en">English</option></>}</select></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{["id", "nameAr", "nameEn", "slug", section === "users" ? "role" : section === "texts" ? "locale" : "status"].map(key => <th key={key}>{tableHeader(key, lang)}</th>)}<th>{bilingual(lang, "الإجراءات", "Actions")}</th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.id ?? index}><td>{row.id ?? "—"}</td><td>{row.nameAr ?? row.textKey ?? row.name ?? "—"}</td><td>{row.nameEn ?? row.value ?? row.email ?? "—"}</td><td>{row.slug ?? row.locale ?? "—"}</td><td><span className="admin-status">{enumLabel(row.status ?? row.role ?? row.view ?? "—", lang)}</span></td><td className="admin-row-actions">{section !== "users" && <><button className="icon-button" aria-label={bilingual(lang, "تعديل", "Edit")} onClick={() => openEdit(row)}><Pencil size={14}/></button><button className="icon-button" aria-label={bilingual(lang, "حذف", "Delete")} onClick={() => remove(row)}><Trash2 size={14}/></button></>}</td></tr>)}</tbody></table>{!visibleRows.length && <div className="admin-empty">{bilingual(lang, "لا توجد عناصر مطابقة.", "No matching records.")}</div>}</div>
        <div className="admin-security-note"><ShieldAlert size={14}/>{bilingual(lang, "كل طلب إدارة يُتحقق منه على الخادم ويخضع لتحديد المعدل. بيانات المستخدمين للقراءة فقط.", "Every admin operation is authorized and rate-limited on the server. User records are read-only.")}</div>
      </section>
    </div>

    <AnimatePresence>{modalOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}><motion.section className="dialog-card admin-editor" initial={{ opacity: 0, y: 14, scale: .99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} aria-modal="true" role="dialog"><button className="dialog-close" onClick={() => setModalOpen(false)} aria-label={bilingual(lang, "إغلاق", "Close")}><X size={17}/></button><div className="eyebrow">{draft.id ? bilingual(lang, "تعديل سجل", "EDIT RECORD") : bilingual(lang, "سجل جديد", "NEW RECORD")}</div><h2>{bilingual(lang, `إدارة ${sections.find(item => item.id === section)!.ar}`, `Manage ${sections.find(item => item.id === section)!.en}`)}</h2><div className="admin-form-grid">
      {fields.map(field => <label className={`admin-field ${field.wide ? "wide" : ""}`} key={field.key}><span>{fieldLabel(field, lang)}</span>{field.hint && <small>{fieldHint(field, lang)}</small>}{field.kind === "long" ? <textarea className="form-input" rows={field.key.includes("Json") ? 9 : 4} value={draft[field.key] ?? ""} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))}/> : field.kind === "select" ? <select className="form-input" value={draft[field.key] ?? ""} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))}>{field.key === "muscleId" && <option value="">{bilingual(lang, "اختر العضلة", "Choose a muscle")}</option>}{field.key === "muscleId" && (muscles.data ?? []).map((muscle: any) => <option value={muscle.id} key={muscle.id}>{lang === "ar" ? muscle.nameAr : muscle.nameEn}</option>)}{field.options?.map(option => <option value={option} key={option}>{option ? enumLabel(option, lang) : bilingual(lang, "بلا وسيط", "None")}</option>)}</select> : <input className="form-input" type={field.kind === "number" ? "number" : "text"} value={draft[field.key] ?? ""} onChange={event => setDraft(current => ({ ...current, [field.key]: field.kind === "number" ? Number(event.target.value) : event.target.value }))}/>}</label>)}
      {section === "exercises" && <div className="admin-field wide"><span>{bilingual(lang, "أهداف العضلات", "Muscle targets")}</span><p className="admin-hint">{bilingual(lang, "اختر هدفًا أساسيًا؛ ويمكن تحديد أهداف ثانوية إضافية.", "Choose one primary target, then optional secondary targets.")}</p><label className="form-label">{bilingual(lang, "الهدف الأساسي", "Primary target")}<select className="form-input" value={targets.find(target => target.role === "primary")?.subMuscleId ?? ""} onChange={event => { const id = Number(event.target.value); setTargets(current => [...current.filter(target => target.role !== "primary" && target.subMuscleId !== id), { subMuscleId: id, role: "primary" }]); }}><option value="">{bilingual(lang, "اختر جزءًا فرعيًا", "Choose a sub-part")}</option>{(subParts.data ?? []).map((part: any) => <option key={part.id} value={part.id}>{part.nameEn} / {part.nameAr}</option>)}</select></label><div className="admin-target-grid">{(subParts.data ?? []).map((part: any) => { const checked = targets.some(target => target.subMuscleId === part.id && target.role === "secondary"); return <label key={part.id}><input type="checkbox" disabled={targets.some(target => target.role === "primary" && target.subMuscleId === part.id)} checked={checked} onChange={event => setTargets(current => event.target.checked ? [...current.filter(target => target.subMuscleId !== part.id), { subMuscleId: part.id, role: "secondary" }] : current.filter(target => !(target.subMuscleId === part.id && target.role === "secondary")))}/><span>{lang === "ar" ? part.nameAr : part.nameEn}</span></label>; })}</div></div>}
      {section === "exercises" && <div className="admin-field wide"><span>{bilingual(lang, "رفع وسائط العرض", "Upload demo media")}</span><p className="admin-hint">{bilingual(lang, "MP4، WebM، GIF، WebP، PNG، JPG أو Lottie JSON صالح فقط؛ الحد 25 MB.", "MP4, WebM, GIF, WebP, PNG, JPG or valid Lottie JSON only; 25 MB maximum.")}</p><label className="text-action file-pick"><Upload size={14}/>{uploading ? bilingual(lang, "جارٍ الرفع…", "Uploading…") : bilingual(lang, "اختيار ملف", "Choose file")}<input type="file" accept=".mp4,.webm,.gif,.webp,.png,.jpg,.jpeg,.json,video/mp4,video/webm,image/gif,image/webp,image/png,image/jpeg,application/json" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadMedia(file); }}/></label>{uploading && <LoaderCircle className="spin" size={16}/ >}{draft.mediaUrl && <p className="admin-hint">{bilingual(lang, "تم اختيار الوسيط:", "Current media:")} <a href={draft.mediaUrl} target="_blank" rel="noreferrer">{draft.mediaUrl}</a></p>}</div>}
      </div><div className="admin-editor-actions"><button className="text-action" onClick={() => setModalOpen(false)}>{bilingual(lang, "إلغاء", "Cancel")}</button><button className="primary-button" onClick={save}><Check size={15}/>{bilingual(lang, "حفظ التغييرات", "Save changes")}</button></div></motion.section></motion.div>}</AnimatePresence>
  </main>;
}
