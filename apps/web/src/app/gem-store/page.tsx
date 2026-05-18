'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import * as PortOne from '@portone/browser-sdk/v2';

interface GemProduct {
  id: string;
  gemAmount: number;
  baseAmount: number;
  bonusAmount: number;
  price: number;
  badge?: string;
}

export default function GemStorePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch gem products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['gemProducts'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/payments/products`);
      return response.json();
    },
  });

  const products: GemProduct[] = productsData?.data || [];

  // Prepare order mutation
  const prepareOrderMutation = useMutation({
    mutationFn: async (productId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/payments/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to prepare order');
      }

      return response.json();
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async ({
      orderId,
      paymentId,
    }: {
      orderId: string;
      paymentId: string;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          orderId,
          paymentTransactionId: paymentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`${formatNumber(data.data.gemsAdded)} 젬이 충전되었습니다!`);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      router.push('/mypage');
    },
    onError: () => {
      toast.error('결제 확인에 실패했습니다');
    },
  });

  const handlePurchase = async (product: GemProduct) => {
    try {
      // Prepare order
      const orderData = await prepareOrderMutation.mutateAsync(product.id);
      const { orderId, amount } = orderData.data;

      // Request PortOne payment (Test mode)
      const response = await PortOne.requestPayment({
        // Test credentials - 실제 결제는 발생하지 않습니다
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || 'store-test',
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || 'channel-key-test',
        paymentId: `payment-${orderId}`,
        orderName: `${formatNumber(product.gemAmount)} 젬`,
        totalAmount: amount,
        currency: 'CURRENCY_KRW' as const,
        payMethod: 'CARD' as const,
        windowType: {
          pc: 'IFRAME' as const,
          mobile: 'REDIRECTION' as const,
        },
      } as any);

      if (response?.code) {
        // Payment failed or cancelled
        console.log('Payment response:', response);

        if (response.code === 'PORTONE_ERROR') {
          toast.error('결제창을 열 수 없습니다. 테스트 모드에서는 실제 결제가 진행되지 않습니다.');
        } else if (
          response.code === 'USER_CANCEL' ||
          response.code === 'FAILURE_TYPE_PG' ||
          response.message?.toLowerCase().includes('cancel')
        ) {
          toast.info('결제가 취소되었습니다.');
        } else {
          toast.error(response.message || '결제가 취소되었습니다.');
        }
        return;
      }

      // Confirm payment with backend
      if (response?.paymentId) {
        await confirmPaymentMutation.mutateAsync({
          orderId,
          paymentId: response.paymentId,
        });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error?.message || '결제 처리 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass-surface border-b border-outline-variant">
        <div className="max-w-5xl mx-auto px-container-padding py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="icon-button"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-headline-large font-headline">Gem Store</h1>
              <p className="text-body-medium text-on-surface-variant">
                Purchase gems for AI conversations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-container-padding py-8 pb-32 lg:pb-24">
        {/* Test Mode Notice */}
        <div className="glass-panel p-4 mb-6 border-2 border-tertiary">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary text-2xl">
              science
            </span>
            <div className="text-body-medium">
              <span className="font-bold text-tertiary">테스트 모드</span>
              <span className="text-on-surface-variant">
                {' '}
                - 실제 결제가 발생하지 않습니다. 결제 플로우만 확인할 수 있습니다.
              </span>
            </div>
          </div>
        </div>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Products List */}
        {!isLoading && (
          <div className="space-y-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handlePurchase(product)}
                disabled={
                  prepareOrderMutation.isPending ||
                  confirmPaymentMutation.isPending
                }
                className="glass-card p-6 hover:bg-surface-container-high transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed text-left relative overflow-hidden w-full"
              >
                <div className="flex items-center gap-6">
                  {/* Gem Icon & Amount */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="material-symbols-filled text-primary text-5xl">
                      diamond
                    </span>
                    <div>
                      <div className="text-display-small font-display text-primary leading-tight">
                        {formatNumber(product.gemAmount)}
                      </div>
                      <div className="text-label-medium text-on-surface-variant">
                        젬
                      </div>
                    </div>
                  </div>

                  {/* Bonus Info */}
                  <div className="flex-1">
                    {product.bonusAmount > 0 ? (
                      <div className="flex items-center gap-4">
                        <div className="text-label-large text-on-surface-variant">
                          기본 {formatNumber(product.baseAmount)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary">
                            add_circle
                          </span>
                          <div className="text-headline-small text-secondary font-bold">
                            보너스 +{formatNumber(product.bonusAmount)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-label-large text-on-surface-variant">
                        간편결제 가능
                      </div>
                    )}
                  </div>

                  {/* Badge */}
                  {product.badge && (
                    <div className="px-4 py-2 rounded-full bg-primary text-on-primary text-label-medium font-medium">
                      {product.badge}
                    </div>
                  )}

                  {/* Price */}
                  <div className="min-w-[140px] text-right">
                    <div className="text-headline-large font-headline text-primary">
                      ₩{formatNumber(product.price)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Payment Methods Info */}
        <div className="glass-card p-6 mt-8">
          <h2 className="text-title-large font-medium mb-4">결제 수단</h2>
          <div className="flex flex-wrap gap-3">
            <div className="glass-panel px-4 py-2 rounded-full text-label-large">
              카카오페이
            </div>
            <div className="glass-panel px-4 py-2 rounded-full text-label-large">
              토스페이
            </div>
            <div className="glass-panel px-4 py-2 rounded-full text-label-large">
              페이코
            </div>
            <div className="glass-panel px-4 py-2 rounded-full text-label-large">
              신용카드
            </div>
          </div>
        </div>

        {/* Payment & Refund Policy */}
        <div className="glass-card p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary text-2xl">
              info
            </span>
            <h2 className="text-title-large font-medium">결제 및 환불 안내</h2>
          </div>
          <div className="text-body-medium text-on-surface-variant space-y-2">
            <p>• 젬 묶음은 구매 후 바로 사용 가능합니다.</p>
            <p>• 모든 결제 상품은 결제일로 부터 7일 이내 환불을 요청할 수 있습니다.</p>
            <p>• 7일 이내여도 구매한 젬 묶음을 사용한 이력이 있다면 환불이 불가능합니다.</p>
            <p>• 사용 이력이 있을 경우, 남은 젬에 대한 환불은 불가능합니다.</p>
            <p>• 주관적인 답변 생성의 불만족으로 인한 환불은 불가능합니다.</p>
            <p>• 환불 요청 및 문의는 앱 결제의 경우 구글 플레이 고객센터 혹은 애플 고객지원에서, 웹 결제의 경우 위프 고객센터에서 가능합니다.</p>
            <p>• 그 외 모든 문제는 고객센터로 문의주세요.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
