import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ navItems, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role, logout } = useAuthStore();

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Desktop Sidebar Spacer (reserves space in flex flow) */}
      <div className="hidden lg:block w-64 shrink-0" />

      {/* Sidebar (always fixed, covers the spacer on desktop) */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border',
        'transform transition-transform duration-300 ease-in-out flex flex-col shadow-sm',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-6 border-b border-border bg-surface">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span className="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">FP</span>
            <span>FieldPulse <span className="font-light text-text-secondary">AI</span></span>
          </h1>
          <p className="text-xs font-bold text-text-muted mt-3 uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 inline-block px-2 py-1 rounded border border-border">
            {role === 'auditor' ? 'Auditor / Read-Only' : 'HQ Admin'}
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto bg-surface custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold',
                  isActive 
                    ? 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20 shadow-sm border' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'text-brand-600 dark:text-brand-500' : 'text-text-muted')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1.5 bg-surface">
          {role === 'hq_admin' && (
            <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-semibold">
              <Settings className="w-5 h-5 text-text-muted" />
              <span>System Settings</span>
            </button>
          )}
          <button 
            onClick={() => { logout(); window.location.href = '/'; }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors font-semibold"
          >
            <LogOut className="w-5 h-5 text-text-muted group-hover:text-danger" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
