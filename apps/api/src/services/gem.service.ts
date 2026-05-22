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
      balanceAfter: number;
    }> = [];

    // 거래 중 잔액 추적
    let currentPaid = wallet.paidGemAmount;
    let currentDaily = wallet.freeDailyGemAmount;
    let currentPromo = wallet.freePromoGemAmount;

    // Priority 1: Free daily
    if (currentDaily >= remaining) {
      currentDaily -= remaining;
      updates.freeDailyGemAmount = currentDaily;
      logs.push({
        amount: -remaining,
        gemType: 'free_daily',
        logType: 'chat_message',
        balanceAfter: currentPaid + currentDaily + currentPromo,
      });
      remaining = 0;
    } else if (currentDaily > 0) {
      const deducted = currentDaily;
      currentDaily = 0;
      updates.freeDailyGemAmount = 0;
      logs.push({
        amount: -deducted,
        gemType: 'free_daily',
        logType: 'chat_message',
        balanceAfter: currentPaid + currentDaily + currentPromo,
      });
      remaining -= deducted;
    }

    // Priority 2: Free promo
    if (remaining > 0 && currentPromo >= remaining) {
      currentPromo -= remaining;
      updates.freePromoGemAmount = currentPromo;
      logs.push({
        amount: -remaining,
        gemType: 'free_promo',
        logType: 'chat_message',
        balanceAfter: currentPaid + currentDaily + currentPromo,
      });
      remaining = 0;
    } else if (remaining > 0 && currentPromo > 0) {
      const deducted = currentPromo;
      currentPromo = 0;
      updates.freePromoGemAmount = 0;
      logs.push({
        amount: -deducted,
        gemType: 'free_promo',
        logType: 'chat_message',
        balanceAfter: currentPaid + currentDaily + currentPromo,
      });
      remaining -= deducted;
    }

    // Priority 3: Paid
    if (remaining > 0) {
      currentPaid -= remaining;
      updates.paidGemAmount = currentPaid;
      logs.push({
        amount: -remaining,
        gemType: 'paid',
        logType: 'chat_message',
        balanceAfter: currentPaid + currentDaily + currentPromo,
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
            balanceAfter: log.balanceAfter,
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
      paidGemAmount: wallet.paidGemAmount,
      freeDailyGemAmount: wallet.freeDailyGemAmount,
      freePromoGemAmount: wallet.freePromoGemAmount,
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

    const refillAmount = 200 - wallet.freeDailyGemAmount;
    const totalAfter = updated.paidGemAmount + updated.freeDailyGemAmount + updated.freePromoGemAmount;

    // Log the refill
    await prisma.gemLog.create({
      data: {
        userId,
        amount: refillAmount,
        gemType: 'free_daily',
        logType: 'daily_refill',
        balanceAfter: totalAfter,
      },
    });

    return {
      success: true,
      newAmount: updated.freeDailyGemAmount,
      nextRefillDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    };
  }
}
