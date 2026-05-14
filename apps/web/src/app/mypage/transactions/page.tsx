'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';

interface GemLog {
  id: string;
  amount: number;
  gemType: 'paid' | 'free_daily' | 'free_promo';
  logType: 'earn' | 'spend' | 'refund' | 'expire';
  memo: string | null;
  createdAt: string;
}

interface WalletBalance {
  totalGems: number;
  paidGemAmount: number;
  freeDailyGemAmount: number;
  freePromoGemAmount: number;
}

export default function TransactionsPage() {
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Fetch wallet balance
  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${apiUrl}/mypage/wallet`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch wallet');
      const result = await response.json();
      return result.data as WalletBalance;
    },
  });

  // Fetch gem logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['gem-logs', limit, offset],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${apiUrl}/mypage/gem-logs?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch logs');
      return await response.json();
    },
  });

  // Calculate balance after each transaction (in reverse chronological order)
  const logsWithBalance = useMemo(() => {
    if (!logsData?.data || !walletData) return [];

    const logs = logsData.data as GemLog[];
    let currentBalance = walletData.totalGems;

    return logs.map((log) => {
      const balanceAtTransaction = currentBalance;
      // Move backwards: subtract the transaction to get previous balance
      if (log.logType === 'earn' || log.logType === 'refund') {
        currentBalance -= log.amount;
      } else if (log.logType === 'spend' || log.logType === 'expire') {
        currentBalance += Math.abs(log.amount);
      }

      return {
        ...log,
        balanceAfter: balanceAtTransaction,
      };
    });
  }, [logsData, walletData]);

  const getLogTypeLabel = (logType: string) => {
    switch (logType) {
      case 'earn': return '획득';
      case 'spend': return '사용';
      case 'refund': return '환불';
      case 'expire': return '만료';
      default: return logType;
    }
  };

  const getGemTypeLabel = (gemType: string) => {
    switch (gemType) {
      case 'paid': return '유료';
      case 'free_daily': return '일일 무료';
      case 'free_promo': return '프로모션';
      default: return gemType;
    }
  };

  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case 'earn': return 'text-success';
      case 'spend': return 'text-error';
      case 'refund': return 'text-primary';
      case 'expire': return 'text-on-surface-variant';
      default: return 'text-on-surface';
    }
  };

  return (
    <div className="space-y-6 pb-32 lg:pb-24">
      <div>
        <h1 className="text-headline-large font-headline mb-2">거래 내역</h1>
        <p className="text-body-medium text-on-surface-variant">
          Gem 획득 및 사용 내역을 확인할 수 있습니다
        </p>
      </div>

      {/* Transaction List */}
      <div className="glass-card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-primary">
              progress_activity
            </span>
          </div>
        ) : logsWithBalance.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">
              receipt_long
            </span>
            <p className="text-body-large text-on-surface-variant">
              거래 내역이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logsWithBalance.map((log) => (
              <div
                key={log.id}
                className="glass-panel p-4 rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Type and Memo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-label-large font-medium ${getLogTypeColor(log.logType)}`}>
                        {getLogTypeLabel(log.logType)}
                      </span>
                      <span className="text-label-small text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container">
                        {getGemTypeLabel(log.gemType)}
                      </span>
                    </div>
                    {log.memo && (
                      <p className="text-body-small text-on-surface-variant truncate">
                        {log.memo}
                      </p>
                    )}
                    <p className="text-label-small text-on-surface-variant mt-1">
                      {new Date(log.createdAt).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Right: Amount and Balance */}
                  <div className="text-right">
                    <p className={`text-title-large font-medium ${getLogTypeColor(log.logType)}`}>
                      {log.logType === 'earn' || log.logType === 'refund' ? '+' : ''}
                      {log.amount?.toLocaleString()}
                    </p>
                    <p className="text-label-small text-on-surface-variant mt-1">
                      잔액: {log.balanceAfter?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {logsData?.meta && logsData.meta.total > limit && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-surface-container-high">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-body-medium text-on-surface-variant px-4">
              {Math.floor(offset / limit) + 1} / {Math.ceil(logsData.meta.total / limit)}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!logsData.meta.hasMore}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
