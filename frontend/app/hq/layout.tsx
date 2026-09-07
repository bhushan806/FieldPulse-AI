'use client';

import React, { useState } from 'react';
import { Globe, AlertTriangle, FileText, Briefcase } from 'lucide-react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopNav } from '@/components/shared/TopNav';

export default function HQLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Portfolio View', href: '/hq/portfolio', icon: Globe },
    { name: 'Projects', href: '/hq/projects', icon: Briefcase },
    { name: 'Alerts Center', href: '/hq/alerts', icon: AlertTriangle },
    { name: 'Reports', href: '/hq/reports', icon: FileText },
  ];

  return (
    <RoleGuard allowedRoles={['hq_admin', 'auditor']}>
      <div className="flex h-screen bg-background overflow-hidden text-text-primary">
        
        <Sidebar 
          navItems={navItems} 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopNav onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-background">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
