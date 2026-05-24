import type { ToastItem } from "@/lib/types";

const toneStyles: Record<ToastItem["type"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  pr: "border-amber-200 bg-gradient-to-r from-amber-50 to-emerald-50 text-emerald-900",
};

const icons: Record<ToastItem["type"], string> = {
  success: "✓",
  error: "✕",
  pr: "🏆",
};

type ToastProps = {
  toast: ToastItem;
  onDismiss: (id: string) => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-slate-200/60 backdrop-blur-sm animate-toast-in ${toneStyles[toast.type]}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-bold shadow-sm">
        {icons[toast.type]}
      </span>
      <p className="flex-1 text-sm font-medium leading-snug pr-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-1 text-xs opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
}

type ToastContainerProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 pointer-events-none px-4 sm:px-0"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
