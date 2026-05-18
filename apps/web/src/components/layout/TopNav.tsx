'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface TopNavProps {
  showNsfwToggle?: boolean;
  showNsfw?: boolean;
  onToggleNsfw?: () => void;
}

export function TopNav({ showNsfwToggle, showNsfw, onToggleNsfw }: TopNavProps = {}) {
  const { user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-outline-variant/30">
      <div className="max-w-7xl mx-auto px-container-padding">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-headline-medium font-headline text-primary">
              Persona Chat
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            {/* NSFW Toggle (only on home page) */}
            {showNsfwToggle && onToggleNsfw && (
              <button
                type="button"
                onClick={onToggleNsfw}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  showNsfw
                    ? 'bg-error text-on-error'
                    : 'bg-surface-container-high text-on-surface'
                }`}
              >
                {showNsfw ? 'UNSAFE' : 'SAFE'}
              </button>
            )}

            {user ? (
              <>
                <Link
                  href="/mypage"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-primary">
                    account_circle
                  </span>
                  <span className="text-label-large">마이페이지</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-label-large"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="glow-button"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
