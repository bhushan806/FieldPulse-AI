'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  compact = false,
}: EmptyStateProps) {
  const ActionEl = actionLabel ? (
    actionHref ? (
      <a
        href={actionHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
      >
        {actionLabel}
      </a>
    ) : (
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
      >
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-10 px-6' : 'py-20 px-8'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-text-muted" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-xs mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {ActionEl}
    </div>
  );
}
