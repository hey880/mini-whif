'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get('returnUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // AuthProvider가 자동으로 세션을 동기화하므로 여기서는 제거
      router.push(returnUrl);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnUrl=${returnUrl}`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Ambiance backgrounds */}
      <div className="fixed top-0 left-1/4 w-96 h-96 ambiance-primary" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 ambiance-tertiary" />

      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-tertiary/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-display-large font-display text-primary mb-4">
              Persona Chat
            </h2>
            <p className="text-title-large text-on-surface-variant">
              AI 캐릭터 롤플레이
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo (mobile only) */}
          <div className="md:hidden text-center mb-8">
            <h1 className="text-headline-large font-headline text-primary">
              Persona Chat
            </h1>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-headline-medium font-headline mb-6">
              환영합니다
            </h2>

            {error && (
              <div className="mb-4 p-4 rounded-lg bg-error/10 border border-error text-error text-body-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-label-large mb-2">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full input-glow"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-label-large mb-2">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full input-glow"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '로딩 중...' : '로그인'}
              </button>
            </form>

            <div className="my-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center text-label-small">
                <span className="px-2 bg-surface-container-high text-on-surface-variant">
                  또는
                </span>
              </div>
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium transition-all border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google 계정으로 계속하기
            </button>

            {/* Link to sign up */}
            <div className="mt-6 text-center text-body-medium text-on-surface-variant">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                회원가입
              </Link>
            </div>

            {/* Back to home */}
            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-body-small text-on-surface-variant hover:text-primary transition-colors"
              >
                ← 홈으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
          <div className="skeleton w-48 h-6 rounded mx-auto" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
