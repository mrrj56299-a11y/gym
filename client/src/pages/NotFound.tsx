import { Dumbbell, Home } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const NOT_FOUND_PATH = "/404";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const isArabic = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    if (window.location.pathname.replace(/\/$/, "") !== NOT_FOUND_PATH) window.location.replace(NOT_FOUND_PATH);
    return () => robots.remove();
  }, []);

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen w-full flex items-center justify-center bg-[#0B0B0C] p-6 text-[#F2F2F2]">
      <section className="w-full max-w-lg rounded-xl border border-[#2A2A2E] bg-[#151517] p-8 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-[#2A2A2E] text-[#9A9AA0]">
          <Dumbbell aria-hidden="true" size={23} />
        </div>
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-[#9A9AA0]">404 · GYMPARTNER</p>
        <h1 className="mb-3 text-3xl font-semibold">{isArabic ? "الصفحة غير موجودة" : "Page not found"}</h1>
        <p className="mb-7 leading-7 text-[#9A9AA0]">
          {isArabic ? "يبدو أن هذا المسار غير متاح. ارجع إلى المخطط لمتابعة تدريبك." : "This route is unavailable. Return to the planner to continue your training."}
        </p>
        <button className="primary-button" onClick={() => setLocation("/")}>
          <Home aria-hidden="true" size={16} />
          {isArabic ? "العودة إلى المخطط" : "Back to planner"}
        </button>
      </section>
    </main>
  );
}
