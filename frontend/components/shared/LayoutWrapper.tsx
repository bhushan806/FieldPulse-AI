'use client';

import React, { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { NotificationToast } from './NotificationToast';
import { AIAssistant } from './AIAssistant';
import { useAuthStore } from '@/store/authStore';
import { socket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { theme, addNotification } = useUIStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const projectId = user?.project_ids?.[0];
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
    <div className={`relative min-h-screen font-sans overflow-x-hidden ${theme}`}>
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" />
        
        {/* Subtle grid pattern for dark mode */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full min-h-screen">
        {children}
      </div>

      {/* Global Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <NotificationToast />
      </div>

      <AIAssistant />
    </div>
  );
}
