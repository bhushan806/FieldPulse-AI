'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, ListTodo, User, Plus } from 'lucide-react';
import { RoleGuard } from '@/components/shared/RoleGuard';

export default function EngineerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/engineer/home', icon: Home },
    { name: 'Capture', href: '/engineer/capture', icon: Camera, isFab: true },
    { name: 'Submissions', href: '/engineer/my-submissions', icon: ListTodo },
    { name: 'Profile', href: '/engineer/profile', icon: User },
  ];

  return (
    <RoleGuard allowedRoles={['site_engineer']}>
      <div className="flex flex-col min-h-screen bg-transparent pb-20">
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-lg mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-b-none border-b-0 px-6 py-2 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-w-lg mx-auto">
          <ul className="flex items-center justify-between relative">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              if (item.isFab) {
                return (
                  <li key={item.name} className="relative -top-6">
                    <Link href={item.href}>
                      <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 ${isActive ? 'bg-orange-500 scale-110 shadow-orange-500/50' : 'bg-slate-800 text-orange-400 border-2 border-orange-500/50 hover:bg-slate-700'}`}>
                        {isActive ? <Camera className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6" />}
                      </div>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    className={`flex flex-col items-center p-2 transition-colors duration-200 ${isActive ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-orange-400/20' : ''}`} strokeWidth={isActive ? 2.5 : 1.5} />
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
