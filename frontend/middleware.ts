import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes accessible without a token
const publicRoutes = ['/', '/login-office', '/login-engineer', '/login-admin', '/set-password', '/verify-otp'];

// Protected role prefixes — anyone without a token gets redirected to /
const protectedPrefixes = ['/engineer', '/pm', '/hq', '/admin'];

const roleRoutes: Record<string, string> = {
  site_engineer: '/engineer',
  project_manager: '/pm',
  hq_admin: '/hq',
  auditor: '/hq',
  platform_admin: '/admin',
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const role = request.cookies.get('role')?.value;
  const path = request.nextUrl.pathname;

  // Allow Next.js internals and static assets
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some((prefix) => path.startsWith(prefix));

  // Unauthenticated user trying to hit a protected route → send to landing
  if (!token && isProtected) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUTH] No token. Redirecting ${path} → /`);
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Authenticated user with wrong role trying to access another role's area
  if (token && role && isProtected) {
    const allowedPrefix = roleRoutes[role];
    if (allowedPrefix && !path.startsWith(allowedPrefix)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUTH] Role mismatch. Redirecting ${path} → ${allowedPrefix}`);
      }
      const dashboardPaths: Record<string, string> = {
        site_engineer: '/engineer/home',
        project_manager: '/pm/dashboard',
        hq_admin: '/hq/portfolio',
        auditor: '/hq/portfolio',
        platform_admin: '/admin/dashboard',
      };
      return NextResponse.redirect(new URL(dashboardPaths[role] ?? '/', request.url));
    }
  }

  // If already authenticated and visiting landing page or login screens, redirect immediately to role dashboard
  if (token && role && (path === '/' || path.startsWith('/login'))) {
    const dashboardPaths: Record<string, string> = {
      site_engineer: '/engineer/home',
      project_manager: '/pm/dashboard',
      hq_admin: '/hq/portfolio',
      auditor: '/hq/portfolio',
      platform_admin: '/admin/dashboard',
    };
    const dest = dashboardPaths[role];
    if (dest) {
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
