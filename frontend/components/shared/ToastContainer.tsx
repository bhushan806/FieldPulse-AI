"use client";

/**
 * frontend/components/shared/ToastContainer.tsx
 * Global toast notification overlay.
 */
import { useUiStore } from "@/store/uiStore";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-cyan-400" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass flex items-start gap-3 p-4 shadow-xl animate-in slide-in-from-right"
        >
          {icons[t.type]}
          <p className="flex-1 text-sm text-slate-200">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
