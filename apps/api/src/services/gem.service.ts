import { prisma } from '../config/prisma.js';

export class GemService {
  /**
   * Deduct gems from user wallet with priority:
   * 1. Free daily gems
   * 2. Free promo gems
   * 3. Paid gems
   */
  async deductGems(userId: string, amount: number, relatedMessageId?: string) {
    const wallet = await prisma.gemWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Gem wallet not found');
    }

    const totalGems =
      wallet.paidGemAmount +
      wallet.freeDailyGemAmount +
      wallet.freePromoGemAmount;

    if (totalGems < amount) {
      throw new Error('Insufficient gems');
    }

    let remaining = amount;
    const updates: any = {};
    const logs: Array<{
      amount: number;
      gemType: string;
      logType: string;
    }> = [];

    // Priority 1: Free daily
    if (wallet.freeDailyGemAmount >= remaining) {
      updates.freeDailyGemAmount = wallet.freeDailyGemAmount - remaining;
      logs.push({
        amount: -remaining,
        gemType: 'free_daily',
        logType: 'chat_message',
      });
      remaining = 0;
    } else if (wallet.freeDailyGemAmount > 0) {
      const deducted = wallet.freeDailyGemAmount;
      updates.freeDailyGemAmount = 0;
      logs.push({
        amount: -deducted,
        gemType: 'free_daily',
        logType: 'chat_message',
      });
      remaining -= deducted;
    }

    // Priority 2: Free promo
    if (remaining > 0 && wallet.freePromoGemAmount >= remaining) {
      updates.freePromoGemAmount = wallet.freePromoGemAmount - remaining;
      logs.push({
        amount: -remaining,
        gemType: 'free_promo',
        logType: 'chat_message',
      });
      remaining = 0;
    } else if (remaining > 0 && wallet.freePromoGemAmount > 0) {
      const deducted = wallet.freePromoGemAmount;
      updates.freePromoGemAmount = 0;
      logs.push({
        amount: -deducted,
        gemType: 'free_promo',
        logType: 'chat_message',
      });
      remaining -= deducted;
    }

    // Priority 3: Paid
    if (remaining > 0) {
      updates.paidGemAmount = wallet.paidGemAmount - remaining;
      logs.push({
        amount: -remaining,
        gemType: 'paid',
        logType: 'chat_message',
      });
    }

    // Update wallet and create logs in transaction
    await prisma.$transaction([
      prisma.gemWallet.update({
        where: { userId },
        data: updates,
      }),
      ...logs.map((log) =>
        prisma.gemLog.create({
          data: {
            userId,
            amount: log.amount,
            gemType: log.gemType,
            logType: log.logType,
            relatedMessageId,
          },
        })
      ),
    ]);

    return {
      deducted: amount,
      remainingGems: totalGems - amount,
    };
  }

  /**
   * Get user's total gem balance
   */
  async getBalance(userId: string) {
    const wallet = await prisma.gemWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Gem wallet not found');
    }

    return {
      totalGems:
        wallet.paidGemAmount +
        wallet.freeDailyGemAmount +
        wallet.freePromoGemAmount,
      paidGems: wallet.paidGemAmount,
      freeDailyGems: wallet.freeDailyGemAmount,
      freePromoGems: wallet.freePromoGemAmount,
      lastRefillDate: wallet.freeDailyGemLastRefillDate,
    };
  }

  /**
   * Refill daily free gems (200 gems per day)
   */
  async refillDailyGems(userId: string) {
    const wallet = await prisma.gemWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Gem wallet not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastRefill = wallet.freeDailyGemLastRefillDate;

    // Check if already refilled today
    if (lastRefill) {
      const lastRefillDate = new Date(lastRefill);
      lastRefillDate.setHours(0, 0, 0, 0);

      if (lastRefillDate.getTime() === today.getTime()) {
        return {
          success: false,
          newAmount: wallet.freeDailyGemAmount,
          nextRefillDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      }
    }

    // Refill to 200 gems
    const updated = await prisma.gemWallet.update({
      where: { userId },
      data: {
        freeDailyGemAmount: 200,
        freeDailyGemLastRefillDate: today,
      },
    });

    // Log the refill
    await prisma.gemLog.create({
      data: {
        userId,
        amount: 200 - wallet.freeDailyGemAmount,
        gemType: 'free_daily',
        logType: 'daily_refill',
      },
    });

    return {
      success: true,
      newAmount: updated.freeDailyGemAmount,
      nextRefillDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    };
  }
}
