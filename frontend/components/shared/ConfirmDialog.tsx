'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Focus confirm button when dialog opens for keyboard accessibility
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  // Trap Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-text-primary/20 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative card p-6 w-full max-w-sm shadow-float animate-in">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
            destructive ? 'bg-danger-bg' : 'bg-warning-bg'
          }`}
        >
          <AlertTriangle
            className={`w-6 h-6 ${destructive ? 'text-danger' : 'text-warning'}`}
          />
        </div>

        <h2 id="confirm-dialog-title" className="text-base font-bold text-text-primary mb-2">
          {title}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-btn border border-border text-sm font-semibold text-text-secondary hover:bg-bg-muted transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-btn text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              destructive
                ? 'bg-danger hover:bg-red-700'
                : 'bg-brand-500 hover:bg-brand-600'
            }`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
