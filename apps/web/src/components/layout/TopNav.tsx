'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function TopNav() {
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
            {user ? (
              <>
                <Link
                  href="/mypage"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-primary">
                    account_circle
                  </span>
                  <span className="text-label-large">My Page</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors text-label-large"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="glow-button"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
