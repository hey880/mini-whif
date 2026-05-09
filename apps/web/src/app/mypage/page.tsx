'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { formatNumber, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function MyPage() {
  const { user } = useAuthStore();

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

  // Fetch gem logs
  const { data: logsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['gemLogs'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/mypage/gem-logs?limit=20`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      return response.json();
    },
  });

  const wallet = walletData?.data;
  const logs = logsData?.data || [];

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display-small font-display mb-2">Profile</h1>
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
            <button
              className="glow-button w-full"
              onClick={() => alert('Payment integration coming soon!')}
            >
              Purchase Gems
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-card p-6">
          <h2 className="text-headline-small font-headline mb-4">
            Transaction History
          </h2>

          {loadingLogs ? (
            <div className="space-y-2">
              {[...Array(5)].map((_: undefined, i: number) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
                receipt_long
              </span>
              <p className="text-body-medium text-on-surface-variant">
                No transactions yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: { id: string; amount: number; logType: string; createdAt: string }) => (
                <div
                  key={log.id}
                  className="glass-panel p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined ${
                        log.amount > 0 ? 'text-primary' : 'text-error'
                      }`}
                    >
                      {log.amount > 0 ? 'add_circle' : 'remove_circle'}
                    </span>
                    <div>
                      <div className="text-body-medium font-medium">
                        {log.logType === 'purchase'
                          ? 'Gem Purchase'
                          : log.logType === 'chat_message'
                          ? 'Chat Message'
                          : log.logType === 'daily_bonus'
                          ? 'Daily Bonus'
                          : 'Transaction'}
                      </div>
                      <div className="text-label-small text-on-surface-variant">
                        {formatDate(log.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`text-title-medium font-medium ${
                      log.amount > 0 ? 'text-primary' : 'text-error'
                    }`}
                  >
                    {log.amount > 0 ? '+' : ''}
                    {formatNumber(log.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </>
  );
}
