'use client';

import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) {
  const { role, authStatus, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Do nothing while auth is still initializing — prevents premature redirects
    if (authStatus === 'AUTH_INITIALIZING') return;

    if (authStatus === 'UNAUTHENTICATED' || authStatus === 'AUTH_ERROR') {
      const loginPath = allowedRoles.includes('site_engineer')
        ? '/login-engineer'
        : allowedRoles.includes('platform_admin')
          ? '/login-admin'
          : '/login-office';
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUTH] RoleGuard: ${authStatus} → redirecting to ${loginPath}`);
      }
      router.replace(loginPath);
      return;
    }

    // AUTHENTICATED but wrong role (platform_admin bypasses this check)
    if (authStatus === 'AUTHENTICATED' && role && role !== 'platform_admin' && !allowedRoles.includes(role)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUTH] RoleGuard: Role "${role}" not in [${allowedRoles.join(', ')}] → redirecting to /`);
      }
      router.replace('/');
    }
  }, [authStatus, role, allowedRoles, router]);

  // Show loading spinner during initialization, or when about to redirect
  if (
    authStatus === 'AUTH_INITIALIZING' ||
    authStatus === 'UNAUTHENTICATED' ||
    authStatus === 'AUTH_ERROR' ||
    !isAuthenticated() ||
    (role && role !== 'platform_admin' && !allowedRoles.includes(role))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
