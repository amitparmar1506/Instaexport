'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const ERRORS: Record<string, { title: string; desc: string }> = {
  oauth_failed: { title: 'Instagram login failed', desc: 'Something went wrong during the Instagram connection. Please try again.' },
  access_denied: { title: 'Access cancelled', desc: 'You cancelled the Instagram login. Click below to try again.' },
  token_expired: { title: 'Session expired', desc: 'Your session has expired. Please log in again.' },
  no_token: { title: 'Authentication failed', desc: 'No authentication token received. Please try logging in again.' },
  login_failed: { title: 'Login failed', desc: 'Could not complete the login process. Please try again.' },
  default: { title: 'Something went wrong', desc: 'An unexpected error occurred. Please try again.' },
};

export default function AuthErrorPage() {
  const params = useSearchParams();
  const router = useRouter();
  const reason = params.get('reason') || 'default';
  const { title, desc } = ERRORS[reason] || ERRORS.default;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F7F6F3' }}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">{desc}</p>
        <button
          onClick={() => router.push('/')}
          className="btn-primary mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to homepage
        </button>
      </div>
    </div>
  );
}
