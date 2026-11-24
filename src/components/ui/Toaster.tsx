import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { usePOS } from '@/src/hooks/usePOS';

export function Toaster() {
  const { toasts, dismissToast } = usePOS();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'error'
            ? AlertCircle
            : toast.variant === 'info'
            ? Info
            : CheckCircle2;
        const iconColor =
          toast.variant === 'error'
            ? 'text-red-600'
            : toast.variant === 'info'
            ? 'text-indigo-600'
            : 'text-emerald-600';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.16)]"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-slate-500">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
