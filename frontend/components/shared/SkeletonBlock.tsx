'use client';

import React from 'react';

interface SkeletonBlockProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBlock({ className = '', style }: SkeletonBlockProps) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/** Pre-built skeleton for a KPI card row */
export function SkeletonKPICard() {
  return (
    <div className="card p-5">
      <div className="flex justify-between items-start mb-4">
        <SkeletonBlock className="w-10 h-10 rounded-xl" />
        <SkeletonBlock className="w-14 h-8 rounded-lg" />
      </div>
      <SkeletonBlock className="w-32 h-4 rounded mb-2" />
      <SkeletonBlock className="w-20 h-3 rounded" />
    </div>
  );
}

/** Pre-built skeleton for a table row */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <SkeletonBlock className={`h-4 rounded ${i === 0 ? 'w-40' : 'w-24'}`} />
        </td>
      ))}
    </tr>
  );
}

/** Pre-built skeleton for a queue list item */
export function SkeletonQueueItem() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex justify-between">
        <SkeletonBlock className="w-20 h-3 rounded" />
        <SkeletonBlock className="w-12 h-3 rounded" />
      </div>
      <SkeletonBlock className="w-3/4 h-4 rounded" />
      <div className="flex justify-between items-center">
        <SkeletonBlock className="w-24 h-3 rounded" />
        <SkeletonBlock className="w-20 h-5 rounded-full" />
      </div>
    </div>
  );
}

/** Pre-built skeleton for a dashboard — matches the PM layout */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-in">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <SkeletonKPICard key={i} />)}
      </div>
      {/* Chart + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-6 min-h-[340px]">
          <SkeletonBlock className="w-40 h-5 rounded mb-6" />
          <div className="space-y-3 h-64">
            {[80, 60, 90, 70, 50].map((w, i) => (
              <div key={i} className="flex items-end gap-2 h-8">
                <SkeletonBlock className="h-3 rounded" style={{ width: `${w}%` } as React.CSSProperties} />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <SkeletonBlock className="w-32 h-5 rounded mb-6" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <SkeletonBlock className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-3/4 rounded" />
                  <SkeletonBlock className="h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
