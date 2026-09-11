'use client';

import React, { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { NotificationToast } from './NotificationToast';
import { AIAssistant } from './AIAssistant';
import { useAuthStore } from '@/store/authStore';
import { getUserProjectIds } from '@/lib/utils';
import { socket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { theme, addNotification } = useUIStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const projectId = getUserProjectIds(user)[0];
    if (projectId) {
      socket.connect(projectId);

      const handleNewAlert = (data: any) => {
        addNotification({
          type: data.type || 'info',
          title: data.title || 'New Update',
          message: data.message || 'There is a new update on your project.',
        });
        
        // Invalidate queries to refresh dashboard data
        queryClient.invalidateQueries({ queryKey: ['portfolioDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      };

      socket.on('new_alert', handleNewAlert);

      return () => {
        socket.off('new_alert', handleNewAlert);
      };
    }
  }, [user, addNotification, queryClient]);

  return (
    <div className="relative min-h-screen font-sans overflow-x-hidden bg-background text-text-primary">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full min-h-screen">
        {children}
      </div>

      {/* Global Notifications */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none [&>*]:pointer-events-auto">
        <NotificationToast />
      </div>

      <AIAssistant />
    </div>
  );
}
