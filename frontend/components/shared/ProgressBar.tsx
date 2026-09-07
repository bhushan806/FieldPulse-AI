import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
  indicatorClassName?: string;
}

export function ProgressBar({ progress, label, className, indicatorClassName }: ProgressBarProps) {
  const boundedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-text-primary">{label}</span>
          <span className="text-xs font-semibold text-text-secondary">{boundedProgress.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full bg-brand-500 rounded-full transition-all duration-500 ease-out', indicatorClassName)}
          style={{ width: `${boundedProgress}%` }}
        />
      </div>
    </div>
  );
}
