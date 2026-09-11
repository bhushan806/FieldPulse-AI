'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, ListTodo, User, Plus } from 'lucide-react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { getUserProjectIds } from '@/lib/utils';

export default function EngineerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, selectedProjectId, setSelectedProject } = useAuthStore();

  useEffect(() => {
    const ids = getUserProjectIds(user);
    if (ids.length > 0 && !selectedProjectId) {
      setSelectedProject(ids[0]);
    }
  }, [user, selectedProjectId, setSelectedProject]);

  const navItems = [
    { name: 'Home', href: '/engineer/home', icon: Home },
    { name: 'Capture', href: '/engineer/capture', icon: Camera, isFab: true },
    { name: 'Submissions', href: '/engineer/my-submissions', icon: ListTodo },
    { name: 'Profile', href: '/engineer/profile', icon: User },
  ];

  return (
    <RoleGuard allowedRoles={['site_engineer']}>
      <div className="flex flex-col min-h-screen bg-background pb-24">
        <main className="flex-1 w-full max-w-lg mx-auto min-w-0">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-4 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
          <ul className="flex items-center justify-between relative max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              if (item.isFab) {
                return (
                  <li key={item.name} className="relative -top-5">
                    <Link href={item.href} aria-label="Capture progress">
                      <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${isActive ? 'bg-brand-600 scale-110 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                        {isActive ? <Camera className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                      </div>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center p-2 transition-colors duration-200 ${isActive ? 'text-brand-600' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 1.5} />
                    <span className="text-[10px] font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </RoleGuard>
  );
}
