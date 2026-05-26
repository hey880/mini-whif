import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaGemWalletRepository } from '../PrismaGemWalletRepository.js';

const prisma = new PrismaClient();

describe('PrismaGemWalletRepository', () => {
  let repo: PrismaGemWalletRepository;
  let testUserId: string;

  beforeEach(async () => {
    repo = new PrismaGemWalletRepository(prisma);

    // Create test user with wallet
    testUserId = randomUUID();
    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `test-${randomUUID()}@example.com`,
        displayName: 'Test User',
        gemWallet: {
          create: {
            freeDailyGemAmount: 200,
            freePromoGemAmount: 50,
            paidGemAmount: 100,
          },
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.gemWallet.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.profile.deleteMany({
      where: { id: testUserId },
    });
  });

  describe('findByUserId', () => {
    it('should find wallet by user id', async () => {
      const wallet = await repo.findByUserId(testUserId);

      expect(wallet).toBeDefined();
      expect(wallet!.userId).toBe(testUserId);
    });

    it('should return null for non-existent wallet', async () => {
      const wallet = await repo.findByUserId(randomUUID()); // Use valid UUID format

      expect(wallet).toBeNull();
    });
  });

  describe('getBalance', () => {
    it('should calculate total balance correctly', async () => {
      const balance = await repo.getBalance(testUserId);

      expect(balance.totalGems).toBe(350); // 200 + 50 + 100
      expect(balance.freeDailyGemAmount).toBe(200);
      expect(balance.freePromoGemAmount).toBe(50);
      expect(balance.paidGemAmount).toBe(100);
    });
  });

  describe('deductGems', () => {
    it('should deduct from free daily first', async () => {
      const result = await repo.deductGems(testUserId, 50);

      expect(result.success).toBe(true);
      expect(result.deductedFrom.freeDaily).toBe(50);
      expect(result.deductedFrom.freePromo).toBe(0);
      expect(result.deductedFrom.paid).toBe(0);
      expect(result.remainingGems).toBe(300);
    });

    it('should follow deduction priority: daily -> promo -> paid', async () => {
      const result = await repo.deductGems(testUserId, 280);

      expect(result.success).toBe(true);
      expect(result.deductedFrom.freeDaily).toBe(200);
      expect(result.deductedFrom.freePromo).toBe(50);
      expect(result.deductedFrom.paid).toBe(30);
      expect(result.remainingGems).toBe(70);
    });

    it('should fail if insufficient balance', async () => {
      const result = await repo.deductGems(testUserId, 500);

      expect(result.success).toBe(false);
      expect(result.remainingGems).toBe(350);
    });

    it('should deduct all gems', async () => {
      const result = await repo.deductGems(testUserId, 350);

      expect(result.success).toBe(true);
      expect(result.remainingGems).toBe(0);

      const balance = await repo.getBalance(testUserId);
      expect(balance.totalGems).toBe(0);
    });
  });

  describe('addGems', () => {
    it('should add paid gems', async () => {
      await repo.addGems(testUserId, 100, 'paid');

      const balance = await repo.getBalance(testUserId);
      expect(balance.paidGemAmount).toBe(200); // 100 + 100
    });

    it('should add free promo gems', async () => {
      await repo.addGems(testUserId, 30, 'freePromo');

      const balance = await repo.getBalance(testUserId);
      expect(balance.freePromoGemAmount).toBe(80); // 50 + 30
    });
  });

  describe('refillDailyGems', () => {
    it('should refill daily gems to 200', async () => {
      // First deduct some
      await repo.deductGems(testUserId, 150);

      // Refill
      await repo.refillDailyGems(testUserId);

      const balance = await repo.getBalance(testUserId);
      expect(balance.freeDailyGemAmount).toBe(200);
      expect(balance.freeDailyGemLastRefillDate).toBeDefined();
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true if balance is sufficient', async () => {
      const sufficient = await repo.hasSufficientBalance(testUserId, 300);

      expect(sufficient).toBe(true);
    });

    it('should return false if balance is insufficient', async () => {
      const sufficient = await repo.hasSufficientBalance(testUserId, 500);

      expect(sufficient).toBe(false);
    });
  });
});
