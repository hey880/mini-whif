import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 기존 GemLog 데이터에 balanceAfter 필드 채우기
 *
 * 실행: cd apps/api && npx tsx scripts/backfill-gem-log-balances.ts
 */
async function backfillBalances() {
  const users = await prisma.profile.findMany({
    select: { id: true },
  });

  console.log(`Processing ${users.length} users...`);

  for (const user of users) {
    // 현재 지갑 잔액 조회
    const wallet = await prisma.gemWallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      console.log(`⚠️  No wallet found for user ${user.id}`);
      continue;
    }

    // 사용자의 모든 로그를 시간 역순(최신부터)으로 조회
    const logs = await prisma.gemLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) {
      console.log(`⚠️  No logs for user ${user.id}`);
      continue;
    }

    // 현재 지갑의 총 잔액
    let currentBalance =
      wallet.paidGemAmount +
      wallet.freeDailyGemAmount +
      wallet.freePromoGemAmount;

    console.log(`User ${user.id}: Current balance = ${currentBalance}, Processing ${logs.length} logs...`);

    // 최신 거래부터 과거로 역순 계산
    for (const log of logs) {
      // 이 거래 후의 잔액 = 현재 잔액
      const balanceAfter = currentBalance;

      // balanceAfter 업데이트
      await prisma.gemLog.update({
        where: { id: log.id },
        data: {
          balanceAfter: balanceAfter,
        },
      });

      // 다음 (과거) 거래를 위해 현재 거래를 되돌림
      // amount가 -5라면, 과거 잔액은 currentBalance - (-5) = currentBalance + 5
      // amount가 +200이라면, 과거 잔액은 currentBalance - 200
      currentBalance -= log.amount;
    }

    console.log(`✅ Updated ${logs.length} logs for user ${user.id}`);
  }

  console.log('🎉 Backfill complete!');
}

backfillBalances()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
