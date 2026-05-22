'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { formatNumber } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function MyPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Fetch gem wallet
  const { data: walletData, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/mypage/wallet`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      return response.json();
    },
  });

  const wallet = walletData?.data;

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/auth/account`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '회원 탈퇴에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: async () => {
      toast.success('회원 탈퇴가 완료되었습니다');
      await supabase.auth.signOut();
      logout();
      router.push('/login');
    },
    onError: (error: any) => {
      toast.error(error?.message || '회원 탈퇴에 실패했습니다');
    },
  });

  const handleDeleteAccount = () => {
    if (
      confirm(
        '정말로 회원 탈퇴하시겠습니까?\n\n모든 데이터가 삭제되며 복구할 수 없습니다.'
      )
    ) {
      deleteAccountMutation.mutate();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="icon-button"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-display-small font-display mb-2">Profile</h1>
          </div>
        </div>
        <p className="text-body-large text-on-surface-variant">
          Manage your profile and gems
        </p>
      </div>

        {/* Profile Card */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary font-headline text-headline-large">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-title-large font-medium">
                {user?.user_metadata?.display_name || 'User'}
              </h2>
              <p className="text-body-medium text-on-surface-variant">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Gem Wallet */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-filled text-primary text-4xl">
              diamond
            </span>
            <div>
              <h2 className="text-headline-medium font-headline">Gem Treasury</h2>
              <p className="text-body-medium text-on-surface-variant">
                Your virtual currency for AI conversations
              </p>
            </div>
          </div>

          {loadingWallet ? (
            <div className="skeleton h-32 rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 text-center">
                <div className="text-display-small font-display text-primary mb-1">
                  {formatNumber(wallet?.totalGems || 0)}
                </div>
                <div className="text-label-medium text-on-surface-variant">
                  Total Gems
                </div>
              </div>

              <div className="glass-panel p-4 text-center">
                <div className="text-headline-large text-tertiary font-medium mb-1">
                  {formatNumber(wallet?.paidGemAmount || 0)}
                </div>
                <div className="text-label-medium text-on-surface-variant">
                  Paid
                </div>
              </div>

              <div className="glass-panel p-4 text-center">
                <div className="text-headline-large text-secondary font-medium mb-1">
                  {formatNumber(wallet?.freeDailyGemAmount || 0)}
                </div>
                <div className="text-label-medium text-on-surface-variant">
                  Daily Free
                </div>
              </div>

              <div className="glass-panel p-4 text-center">
                <div className="text-headline-large text-secondary font-medium mb-1">
                  {formatNumber(wallet?.freePromoGemAmount || 0)}
                </div>
                <div className="text-label-medium text-on-surface-variant">
                  Promo
                </div>
              </div>
            </div>
          )}

          {/* Purchase Button */}
          <div className="mt-6">
            <Link href="/gem-store" className="glow-button w-full block text-center">
              Purchase Gems
            </Link>
          </div>
        </div>

        {/* My Content Section */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-headline-small font-headline mb-4">내 컨텐츠</h2>
          <div className="space-y-2">
            <Link
              href="/mypage/my-universes"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container transition-colors text-label-large"
            >
              <span className="material-symbols-outlined text-primary">auto_stories</span>
              <span className="flex-1">내 작품/캐릭터</span>
              <span className="material-symbols-outlined text-on-surface-variant">
                chevron_right
              </span>
            </Link>
            <Link
              href="/mypage/personas"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container transition-colors text-label-large"
            >
              <span className="material-symbols-outlined text-primary">face</span>
              <span className="flex-1">내 페르소나</span>
              <span className="material-symbols-outlined text-on-surface-variant">
                chevron_right
              </span>
            </Link>
            <Link
              href="/mypage/transactions"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container transition-colors text-label-large"
            >
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              <span className="flex-1">거래 내역</span>
              <span className="material-symbols-outlined text-on-surface-variant">
                chevron_right
              </span>
            </Link>
          </div>
        </div>

        {/* Account Settings Section */}
        <div className="glass-card p-6">
          <h2 className="text-headline-small font-headline mb-4">계정 설정</h2>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error/10 transition-colors text-label-large text-error w-full disabled:opacity-50"
          >
            <span className="material-symbols-outlined">person_remove</span>
            <span className="flex-1 text-left">
              {deleteAccountMutation.isPending ? '탈퇴 처리 중...' : '회원 탈퇴'}
            </span>
          </button>
        </div>
    </>
  );
}
