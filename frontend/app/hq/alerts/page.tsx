'use client';

import { AlertTriangle, Clock, Activity, Search, Building2, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAlerts, markAlertRead } from '@/lib/api/dashboard';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/authStore';

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Recently';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export default function AlertsCenter() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'delay' | 'warning' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: alertsResponse, isLoading, isError } = useQuery({
    queryKey: ['portfolioAlerts'],
    queryFn: () => listAlerts(),
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markAlertRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolioAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['adminAlerts'] });
    },
  });

  const alerts = alertsResponse?.items || [];

  const filteredAlerts = alerts.filter((alert) => {
    // Type match
    if (filter !== 'all') {
      if (filter === 'critical') {
        if (alert.type !== 'critical' && alert.type !== 'critical_path') return false;
      } else if (alert.type !== filter) {
        return false;
      }
    }

    // Search query match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchMsg = alert.message?.toLowerCase().includes(q);
      const matchTitle = alert.title?.toLowerCase().includes(q);
      const matchProject = (alert.projectName || alert.projectId || '').toLowerCase().includes(q);
      const matchActivity = (alert.activityId || '').toLowerCase().includes(q);
      if (!matchMsg && !matchTitle && !matchProject && !matchActivity) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader 
          title="Alerts Center" 
          subtitle="Global portfolio notifications and AI anomalies in real time."
        />
      </div>

      <div className="card flex-1 flex flex-col min-h-0 overflow-hidden p-0">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-muted/50">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Alerts' },
              { id: 'critical', label: 'Critical' },
              { id: 'delay', label: 'Delays' },
              { id: 'warning', label: 'Warnings' },
              { id: 'info', label: 'Info' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  filter === f.id 
                    ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm' 
                    : 'bg-surface text-text-secondary hover:bg-bg-muted border border-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by project, keyword..." 
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm font-medium"
              />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-bg-muted/30">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
              <p className="text-sm font-semibold text-text-secondary">Loading live notifications...</p>
            </div>
          ) : isError ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted bg-surface border border-border border-dashed rounded-xl shadow-sm">
              <AlertTriangle className="w-12 h-12 mb-4 text-danger" />
              <p className="font-semibold text-text-secondary">Failed to retrieve alerts.</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted bg-surface border border-border border-dashed rounded-xl shadow-sm">
              <CheckCircle2 className="w-12 h-12 mb-4 text-success" />
              <p className="font-semibold text-text-secondary">No alerts found for this filter.</p>
              <p className="text-xs text-text-muted mt-1">All projects are currently operating within expected parameters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const isRead = user?.id ? alert.readBy?.includes(user.id) : false;
                const isCritical = alert.type === 'critical' || alert.type === 'critical_path';
                const isDelay = alert.type === 'delay';
                const isWarning = alert.type === 'warning';

                return (
                  <div 
                    key={alert.id} 
                    className={`flex flex-col sm:flex-row gap-4 p-5 rounded-xl bg-surface hover:shadow-md transition-all border ${
                      isRead ? 'border-border opacity-80' : 'border-border-strong hover:border-brand-500/50 shadow-sm'
                    } group`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {isCritical ? (
                        <div className="w-10 h-10 rounded-full bg-danger-bg border border-danger/20 flex items-center justify-center text-danger shadow-sm">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                      ) : isDelay ? (
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                          <Clock className="w-5 h-5" />
                        </div>
                      ) : isWarning ? (
                        <div className="w-10 h-10 rounded-full bg-warning-bg border border-warning/20 flex items-center justify-center text-warning shadow-sm">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                          <Activity className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isCritical ? 'bg-danger-bg text-danger border-danger/20' :
                          isDelay ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          isWarning ? 'bg-warning-bg text-warning border-warning/20' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {alert.type}
                        </span>
                        <span className="text-xs text-text-muted font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTimeAgo(alert.createdAt)}
                        </span>
                        {isRead && (
                          <span className="text-[10px] text-text-muted bg-bg-muted px-1.5 py-0.5 rounded">
                            Read
                          </span>
                        )}
                      </div>
                      
                      {alert.title && (
                        <h4 className="text-sm font-bold text-text-primary mb-1">{alert.title}</h4>
                      )}
                      <p className="text-sm text-text-primary mb-2.5 font-medium leading-relaxed">{alert.message}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-text-secondary font-bold flex items-center gap-1.5 bg-bg-muted px-2 py-1 rounded border border-border">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" />
                          {alert.projectName || `Project ${alert.projectId?.slice(0, 8)}`}
                        </span>
                        {alert.activityId && (
                          <span className="text-text-muted font-semibold bg-bg-muted px-2 py-1 rounded border border-border">
                            Activity: {alert.activityId}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-col justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
                      {alert.projectId && (
                        <Link 
                          href={`/hq/projects/${alert.projectId}/setup`}
                          className="px-4 py-2 rounded-lg bg-surface border border-border hover:bg-bg-muted text-xs text-text-primary font-bold shadow-sm transition-colors text-center"
                        >
                          View Project
                        </Link>
                      )}
                      {!isRead && (
                        <button 
                          onClick={() => markReadMutation.mutate(alert.id)}
                          disabled={markReadMutation.isPending}
                          className="px-4 py-2 rounded-lg border border-border hover:bg-success-bg hover:text-success hover:border-success/30 text-xs text-text-secondary font-bold shadow-sm transition-colors text-center disabled:opacity-50"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
