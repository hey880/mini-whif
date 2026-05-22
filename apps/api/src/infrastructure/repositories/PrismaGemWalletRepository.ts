import { PrismaClient, GemWallet } from '@prisma/client';
import {
  IGemWalletRepository,
  GemBalance,
  GemType,
  DeductGemsResult,
} from '../../domain/repositories/IGemWalletRepository.js';

/**
 * Prisma 기반 GemWallet Repository 구현
 */
export class PrismaGemWalletRepository implements IGemWalletRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<GemWallet | null> {
    return await this.prisma.gemWallet.findUnique({
      where: { userId },
    });
  }

  async getBalance(userId: string): Promise<GemBalance> {
    const wallet = await this.findByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return {
      totalGems:
        wallet.freeDailyGemAmount + wallet.freePromoGemAmount + wallet.paidGemAmount,
      paidGemAmount: wallet.paidGemAmount,
      freeDailyGemAmount: wallet.freeDailyGemAmount,
      freePromoGemAmount: wallet.freePromoGemAmount,
      freeDailyGemLastRefillDate: wallet.freeDailyGemLastRefillDate,
    };
  }

  async deductGems(userId: string, amount: number): Promise<DeductGemsResult> {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.gemWallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const totalGems =
        wallet.freeDailyGemAmount + wallet.freePromoGemAmount + wallet.paidGemAmount;

      if (totalGems < amount) {
        return {
          success: false,
          remainingGems: totalGems,
          deductedFrom: {
            freeDaily: 0,
            freePromo: 0,
            paid: 0,
          },
        };
      }

      // 차감 우선순위: 일일 무료 → 프로모션 무료 → 유료
      let remaining = amount;
      let deductedFreeDaily = 0;
      let deductedFreePromo = 0;
      let deductedPaid = 0;

      // 1. 일일 무료 차감
      if (remaining > 0 && wallet.freeDailyGemAmount > 0) {
        const deduct = Math.min(remaining, wallet.freeDailyGemAmount);
        deductedFreeDaily = deduct;
        remaining -= deduct;
      }

      // 2. 프로모션 무료 차감
      if (remaining > 0 && wallet.freePromoGemAmount > 0) {
        const deduct = Math.min(remaining, wallet.freePromoGemAmount);
        deductedFreePromo = deduct;
        remaining -= deduct;
      }

      // 3. 유료 차감
      if (remaining > 0 && wallet.paidGemAmount > 0) {
        const deduct = Math.min(remaining, wallet.paidGemAmount);
        deductedPaid = deduct;
        remaining -= deduct;
      }

      // 업데이트
      await tx.gemWallet.update({
        where: { userId },
        data: {
          freeDailyGemAmount: wallet.freeDailyGemAmount - deductedFreeDaily,
          freePromoGemAmount: wallet.freePromoGemAmount - deductedFreePromo,
          paidGemAmount: wallet.paidGemAmount - deductedPaid,
        },
      });

      const newTotal = totalGems - amount;

      return {
        success: true,
        remainingGems: newTotal,
        deductedFrom: {
          freeDaily: deductedFreeDaily,
          freePromo: deductedFreePromo,
          paid: deductedPaid,
        },
      };
    });
  }

  async addGems(userId: string, amount: number, type: GemType): Promise<GemWallet> {
    const fieldMap: Record<GemType, string> = {
      paid: 'paidGemAmount',
      freeDaily: 'freeDailyGemAmount',
      freePromo: 'freePromoGemAmount',
    };

    return await this.prisma.gemWallet.update({
      where: { userId },
      data: {
        [fieldMap[type]]: {
          increment: amount,
        },
      },
    });
  }

  async refillDailyGems(userId: string): Promise<GemWallet> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.prisma.gemWallet.update({
      where: { userId },
      data: {
        freeDailyGemAmount: 200, // 매일 200 Gem
        freeDailyGemLastRefillDate: today,
      },
    });
  }

  async hasSufficientBalance(userId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance.totalGems >= requiredAmount;
  }
}
