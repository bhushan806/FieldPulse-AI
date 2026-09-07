import React from 'react';
import { cn } from '@/lib/utils';
import { ProjectStatus, ActivityStatus } from '@/types/api';

type Status = ProjectStatus | ActivityStatus | 'critical' | 'high' | 'medium' | 'low';

interface StatusPillProps {
  status: Status | string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const normalized = status.toLowerCase();

  let colorClasses = 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800';

  if (['on_track', 'completed', 'approved', 'low'].includes(normalized)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  } else if (['at_risk', 'in_progress', 'medium', 'high'].includes(normalized)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
  } else if (['delayed', 'critical', 'rejected'].includes(normalized)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
  }

  const label = status.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide whitespace-nowrap',
        colorClasses,
        className
      )}
    >
      {label}
    </span>
  );
}
