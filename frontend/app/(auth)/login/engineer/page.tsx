'use client';

/**
 * This route (/login/engineer) is a legacy path.
 * The canonical engineer login is at /login-engineer.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EngineerLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login-engineer');
  }, [router]);
  return null;
}
