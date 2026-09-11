'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CheckSquare, CalendarDays, Users, AlertCircle, Menu, Bell, LogOut, Search, ChevronDown } from 'lucide-react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { getUserProjectIds } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { FieldPulseLogo } from '@/components/shared/FieldPulseLogo';

export default function PMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, selectedProjectId, setSelectedProject } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const ids = getUserProjectIds(user);
    if (ids.length > 0 && !selectedProjectId) {
      setSelectedProject(ids[0]);
    }
  }, [user, selectedProjectId, setSelectedProject]);

  const navItems = [
    { name: 'Dashboard', href: '/pm/dashboard', icon: LayoutDashboard },
    { name: 'Review Queue', href: '/pm/review-queue', icon: CheckSquare },
    { name: 'Schedule', href: '/pm/schedule', icon: CalendarDays },
    { name: 'Issues', href: '/pm/issues', icon: AlertCircle },
    { name: 'Team', href: '/pm/team', icon: Users },
  ];

  return (
    <RoleGuard allowedRoles={['project_manager']}>
      <div className="flex h-screen bg-background overflow-hidden">
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-text-primary/20 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Desktop Sidebar Spacer */}
        <div className="hidden lg:block w-64 shrink-0" />

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 border-b border-border">
            <div className="mb-4">
              <FieldPulseLogo size="md" href="/pm/dashboard" />
            </div>
            
            <div className="relative">
              <select 
                value={selectedProjectId ?? ''}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full appearance-none bg-bg-muted border border-border text-sm text-text-primary px-3 py-2 rounded-lg outline-none focus:border-brand-500 pr-8"
              >
                {getUserProjectIds(user).map((id) => (
                  <option key={id} value={id}>Project {id}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    isActive 
                      ? 'bg-brand-50 text-brand-600 border border-brand-100' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-text-muted'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <button 
              onClick={() => { logout(); router.push('/'); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-danger hover:bg-danger-bg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-8 z-30 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 text-text-muted hover:text-text-primary"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-bg-muted border border-border rounded-lg w-64 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
                <Search className="w-4 h-4 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Search activities..." 
                  className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder-text-muted"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NotificationBell />
              
              <div className="flex items-center gap-3 border-l border-border pl-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-text-primary">{user?.name || 'Project Manager'}</p>
                  <p className="text-xs text-text-secondary">
                    {selectedProjectId ? `Project: ${selectedProjectId.slice(0, 8)}...` : 'No Project Selected'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-500 flex items-center justify-center text-brand-600 font-bold text-sm">
                  {user?.name?.charAt(0) || 'P'}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
