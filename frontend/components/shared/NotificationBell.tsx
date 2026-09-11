'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, AlertCircle, Info, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

interface AlertItem {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  project_id?: string;
  project_name?: string;
  created_at: string;
  read_by?: string[];
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, role } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch recent alerts
  const { data } = useQuery<{ items: AlertItem[]; total: number }>({
    queryKey: ['notifications_bell'],
    queryFn: async () => {
      const res = await apiClient.get('/api/alerts/?limit=10');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const alerts = data?.items || [];
  const currentUserId = user?.id || '';

  const unreadAlerts = alerts.filter(
    (item) => !item.read_by || !item.read_by.includes(currentUserId)
  );
  const unreadCount = unreadAlerts.length;

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await apiClient.post(`/api/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications_bell'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await Promise.all(
        unreadAlerts.map((a) => apiClient.post(`/api/alerts/${a.id}/read`))
      );
      queryClient.invalidateQueries({ queryKey: ['notifications_bell'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } catch {
      // ignore
    }
  };

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alertsCenterHref = role === 'project_manager' ? '/pm/issues' : '/hq/alerts';

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="p-1 rounded-md bg-danger/15 text-danger flex-shrink-0">
            <AlertCircle className="w-4 h-4" />
          </span>
        );
      case 'warning':
        return (
          <span className="p-1 rounded-md bg-warning/15 text-warning flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </span>
        );
      default:
        return (
          <span className="p-1 rounded-md bg-brand-500/15 text-brand-600 dark:text-brand-400 flex-shrink-0">
            <Info className="w-4 h-4" />
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        title="View Notifications"
        className="relative p-2.5 text-text-muted hover:text-text-primary transition-all duration-200 bg-surface border border-border rounded-lg shadow-sm hover:border-brand-500/50 hover:bg-bg-muted"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-brand-500/15 text-brand-600 dark:text-brand-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-bg-muted flex items-center justify-center text-text-muted">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <p className="text-sm font-semibold text-text-primary">All caught up!</p>
                <p className="text-xs text-text-muted mt-0.5">No recent alerts or notifications.</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isUnread =
                  !alert.read_by || !alert.read_by.includes(currentUserId);

                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (isUnread) markReadMutation.mutate(alert.id);
                    }}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-bg-muted/50 ${
                      isUnread ? 'bg-brand-500/[0.04]' : ''
                    }`}
                  >
                    {getSeverityBadge(alert.severity)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-bold truncate ${isUnread ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {alert.title}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted">
                        {alert.project_name && (
                          <span className="font-semibold text-text-muted truncate max-w-[130px]">
                            {alert.project_name}
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {alert.created_at
                            ? new Date(alert.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-surface text-center">
            <Link
              href={alertsCenterHref}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1.5"
            >
              <span>Go to Alerts Center</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
