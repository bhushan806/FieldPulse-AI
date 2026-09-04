'use client';

/**
 * This route (/login/office) is a legacy path.
 * The canonical office login is at /login-office.
 * Redirecting to keep browser history clean.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficeLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login-office');
  }, [router]);

  return null;
}
