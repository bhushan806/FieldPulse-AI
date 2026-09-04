'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, AlertTriangle, FileText, Settings, Menu, Bell, LogOut, Search } from 'lucide-react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useAuthStore } from '@/store/authStore';

export default function HQLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Portfolio View', href: '/hq/portfolio', icon: Globe },
    { name: 'Alerts Center', href: '/hq/alerts', icon: AlertTriangle },
    { name: 'Reports', href: '/hq/reports', icon: FileText },
  ];

  return (
    <RoleGuard allowedRoles={['hq_admin', 'auditor']}>
      <div className="flex h-screen bg-bg-app overflow-hidden text-text-primary">
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border
          transform transition-transform duration-300 ease-in-out flex flex-col shadow-sm
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 border-b border-border bg-white">
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-1.5">
              <span className="bg-brand-600 text-white p-1 rounded">FP</span>
              <span>FieldPulse <span className="font-light text-text-secondary">AI</span></span>
            </h1>
            <p className="text-xs font-bold text-text-muted mt-2 uppercase tracking-wider bg-bg-muted inline-block px-2 py-0.5 rounded border border-border">
              {role === 'auditor' ? 'Auditor / Read-Only' : 'HQ Admin'}
            </p>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto bg-surface">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold ${
                    isActive 
                      ? 'bg-brand-50 text-brand-700 border border-brand-100 shadow-sm' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-text-muted'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-1 bg-surface">
            {role === 'hq_admin' && (
              <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-muted transition-colors font-semibold">
                <Settings className="w-5 h-5 text-text-muted" />
                <span>System Settings</span>
              </button>
            )}
            <button 
              onClick={() => { logout(); router.push('/'); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-text-secondary hover:text-danger hover:bg-danger-bg transition-colors font-semibold"
            >
              <LogOut className="w-5 h-5 text-text-muted" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-8 z-30 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 text-text-muted hover:text-text-primary transition-colors bg-bg-muted rounded-lg border border-border"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-lg w-64 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all shadow-sm">
                <Search className="w-4 h-4 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder-text-muted font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2.5 text-text-muted hover:text-text-primary transition-colors bg-white border border-border rounded-lg shadow-sm hover:border-border-strong">
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border border-white"></span>
              </button>
              
              <div className="flex items-center gap-3 border-l border-border pl-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-bold text-text-primary">{user?.name || 'HQ Admin'}</p>
                  <p className="text-xs font-semibold text-text-muted">Headquarters</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold shadow-sm">
                  {user?.name?.charAt(0) || 'H'}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-bg-app">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
