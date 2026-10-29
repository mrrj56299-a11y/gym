import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const isArabic = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    return (
      <main dir={isArabic ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="flex w-full max-w-2xl flex-col items-center rounded-xl border border-border bg-card p-8 text-center">
          <AlertTriangle size={40} className="mb-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          <h1 className="mb-3 text-xl font-semibold">{isArabic ? "تعذر تحميل هذه الصفحة" : "This page could not load"}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{isArabic ? "أعد المحاولة؛ لم يتم حفظ أي تغيير غير مكتمل." : "Try reloading. Any unfinished change has not been saved."}</p>
          {this.state.error && <details className="mb-6 w-full text-start"><summary className="cursor-pointer text-sm text-muted-foreground">{isArabic ? "تفاصيل تقنية" : "Technical details"}</summary><pre className="mt-3 max-h-56 w-full overflow-auto whitespace-pre-wrap rounded border border-border bg-background p-4 text-xs text-muted-foreground">{this.state.error.stack}</pre></details>}
          <button onClick={() => window.location.reload()} className={cn("flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground", "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
            <RotateCcw size={16} aria-hidden="true" />
            {isArabic ? "إعادة تحميل الصفحة" : "Reload page"}
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
