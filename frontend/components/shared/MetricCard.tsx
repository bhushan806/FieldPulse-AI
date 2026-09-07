import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn('card p-6 flex flex-col', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{title}</h3>
        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="text-3xl font-bold text-text-primary mb-2 tabular-nums">
          {value}
        </div>
        
        {trend && (
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                'font-semibold',
                trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                trend.direction === 'down' ? 'text-rose-600 dark:text-rose-400' :
                'text-neutral-500 dark:text-neutral-400'
              )}
            >
              {trend.value}
            </span>
            <span className="text-text-muted">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
