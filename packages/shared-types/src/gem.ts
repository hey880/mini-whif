import { WithTimestamps } from './common';

/**
 * Gem wallet and transaction types
 */

export interface GemWallet extends WithTimestamps {
  id: string;
  userId: string;
  paidGemAmount: number;
  freeDailyGemAmount: number;
  freePromoGemAmount: number;
  freeDailyGemLastRefillDate?: Date;
}

export interface GemWalletSummary {
  totalGems: number;
  paidGems: number;
  freeDailyGems: number;
  freePromoGems: number;
  lastRefillDate?: Date;
}

export interface GemLog extends WithTimestamps {
  id: string;
  userId: string;
  amount: number;
  gemType: 'paid' | 'free_daily' | 'free_promo';
  logType: 'chat_message' | 'purchase' | 'refund' | 'daily_refill' | 'promo_grant' | 'admin_adjustment';
  relatedOrderId?: string;
  relatedMessageId?: string;
  memo?: string;
}

export interface GemOrder extends WithTimestamps {
  id: string;
  userId: string;
  productId: string;
  gemAmount: number;
  currency: string;
  priceAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentTransactionId?: string;
  paidAt?: Date;
}

export interface GemProduct {
  id: string;
  label: string;
  gemAmount: number;
  price: number;
  currency?: string;
  badge?: string;
  discount?: number;
}

export const GEM_PRODUCTS: GemProduct[] = [
  {
    id: 'gem_500',
    label: 'Starter',
    gemAmount: 500,
    price: 1100,
    currency: 'KRW'
  },
  {
    id: 'gem_1200',
    label: 'Pro',
    gemAmount: 1200,
    price: 2200,
    currency: 'KRW',
    badge: 'Popular',
    discount: 8
  },
  {
    id: 'gem_3000',
    label: 'Whale',
    gemAmount: 3000,
    price: 5500,
    currency: 'KRW',
    discount: 8
  }
];

export interface PurchaseGemInput {
  productId: string;
}

export interface ConfirmPaymentInput {
  orderId: string;
  paymentTransactionId?: string;
}

export interface RefillDailyGemsResponse {
  success: boolean;
  newAmount: number;
  nextRefillDate: Date;
}
