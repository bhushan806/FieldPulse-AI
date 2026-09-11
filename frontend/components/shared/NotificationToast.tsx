'use client';

import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { getUserProjectIds } from '@/lib/utils';
import { socket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import React, { useEffect } from 'react';

export function NotificationToast() {
  const { toasts, dismissNotification, addNotification } = useUIStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const projectId = getUserProjectIds(user)[0];

  useEffect(() => {
    if (!projectId) return;

    socket.connect(projectId);

    const handleNewAlert = (data: any) => {
      addNotification({
        type: data.type || 'info',
        title: data.title || 'New Notification',
        message: data.message || 'You have a new alert',
        duration: 8000
      });
      // Invalidate queries to refresh dashboard data immediately
      queryClient.invalidateQueries({ queryKey: ['portfolioDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    };

    socket.on('new_alert', handleNewAlert);

    return () => {
      socket.off('new_alert', handleNewAlert);
    };
  }, [projectId, queryClient, addNotification]);

  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((notif) => {
        let bgColor = 'bg-bg-surface';
        let borderColor = 'border-border';
        let textColor = 'text-text-primary';
        let Icon = Info;
        let iconColor = 'text-info';
        
        if (notif.type === 'success') {
          bgColor = 'bg-success-bg';
          borderColor = 'border-success';
          textColor = 'text-success';
          Icon = CheckCircle;
          iconColor = 'text-success';
        } else if (notif.type === 'error') {
          bgColor = 'bg-danger-bg';
          borderColor = 'border-danger';
          textColor = 'text-danger';
          Icon = AlertTriangle;
          iconColor = 'text-danger';
        } else if (notif.type === 'warning') {
          bgColor = 'bg-warning-bg';
          borderColor = 'border-warning';
          textColor = 'text-warning';
          Icon = AlertTriangle;
          iconColor = 'text-warning';
        }

        return (
          <div
            key={notif.id}
            className={`flex items-start p-4 rounded-lg shadow-lg border animate-slide-in-from-right ${bgColor} ${borderColor} ${textColor}`}
            role="alert"
          >
            <div className={`mr-3 mt-0.5 ${iconColor}`}>
               <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 mr-4 flex-1">
              {notif.title && (
                <span className="font-semibold text-sm">{notif.title}</span>
              )}
              <span className="text-sm">{notif.message}</span>
            </div>
            <button
              onClick={() => dismissNotification(notif.id)}
              className="text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </>
  );
}
