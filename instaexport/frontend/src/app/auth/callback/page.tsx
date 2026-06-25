'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Instagram } from 'lucide-react';

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false); // prevent double execution

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = params.get('token');
    const reason = params.get('reason');
    const warning = params.get('warning');

    if (reason) {
      router.replace(`/auth/error?reason=${reason}`);
      return;
    }

    if (!token) {
      router.replace('/auth/error?reason=no_token');
      return;
    }

    // Store token and load user, then redirect
    login(token).then(() => {
      if (warning === 'no_ig_account') {
        router.replace('/dashboard?warning=no_ig_account');
      } else {
        router.replace('/dashboard');
      }
    }).catch(() => {
      router.replace('/auth/error?reason=login_failed');
    });
  }, []); // empty deps — run once only

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Instagram className="w-7 h-7 text-white" />
        </div>
        <p className="text-gray-700 font-medium">Connecting your account...</p>
        <p className="text-gray-400 text-sm mt-1">Please wait, do not close this tab</p>
      </div>
    </div>
  );
}
