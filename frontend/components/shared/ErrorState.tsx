'use client';

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  backLabel?: string;
  backHref?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  backLabel = 'Go to Dashboard',
  backHref,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-10 px-6' : 'py-20 px-8'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-danger-bg flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-danger" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mb-5 leading-relaxed">{message}</p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
        {backHref && (
          <a
            href={backHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn border border-border text-text-secondary text-sm font-medium hover:bg-bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </a>
        )}
      </div>
    </div>
  );
}
