import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ToastContext, type ToastApi, type ToastTone } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

/** Short confirmations in a polite live region, bottom-right on desktop and full width on phones. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = next.current++;
      setToasts((t) => [...t.slice(-3), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ show, success: (m) => show(m, "success"), error: (m) => show(m, "error") }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-stretch gap-2 sm:left-auto sm:w-96"
      >
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? XCircle : Info;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-card border bg-canvas p-3.5 shadow-raised",
                t.tone === "error" ? "border-alert/40" : "border-line",
              )}
            >
              <Icon
                className={cn("mt-0.5 h-5 w-5 shrink-0", t.tone === "error" ? "text-alert" : "text-brand")}
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 text-[14px] text-ink">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-m-1.5 inline-flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
