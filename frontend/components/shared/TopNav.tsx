import React from 'react';
import { Menu, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-8 z-30 shadow-sm sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden p-2 text-text-muted hover:text-text-primary transition-colors bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-border"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-border rounded-lg w-64 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all shadow-sm">
          <Search className="w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder:text-text-muted font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <NotificationBell />
        
        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-text-primary">{user?.name || 'HQ Admin'}</p>
            <p className="text-xs font-semibold text-text-muted">Headquarters</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold shadow-sm">
            {user?.name?.charAt(0) || 'H'}
          </div>
        </div>
      </div>
    </header>
  );
}
