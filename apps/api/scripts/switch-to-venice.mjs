#!/usr/bin/env node

/**
 * Venice Uncensored로 NSFW 모델 교체
 * Euryale 대신 무료이면서 안정적인 Venice Uncensored 사용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function switchToVenice() {
  console.log('🔄 NSFW 모델을 Venice Uncensored로 교체 중...\n');

  try {
    // 1. Euryale 비활성화
    console.log('1️⃣  Euryale 70B 비활성화...');
    const euryaleUpdated = await prisma.llmModel.updateMany({
      where: { slug: 'sao10k/l3.3-euryale-70b' },
      data: {
        isActive: false,
      },
    });
    console.log(`   ✅ ${euryaleUpdated.count}개 모델 비활성화\n`);

    // 2. Venice Uncensored 추가/활성화
    console.log('2️⃣  Venice Uncensored 추가...');
    const venice = await prisma.llmModel.upsert({
      where: { slug: 'venice/uncensored' },
      update: {
        name: 'Venice Uncensored',
        contextWindow: 32768,
        maxOutputTokens: 8192,
        gemCostPerMessage: 0,
        isActive: true,
        isNsfwCapable: true,
      },
      create: {
        slug: 'venice/uncensored',
        name: 'Venice Uncensored',
        provider: 'OpenRouter',
        contextWindow: 32768,
        maxOutputTokens: 8192,
        gemCostPerMessage: 0,
        isActive: true,
        isNsfwCapable: true,
      },
    });
    console.log(`   ✅ Venice 모델 ID: ${venice.id}\n`);

    // 3. 최종 확인
    console.log('3️⃣  최종 검증...');
    const nsfwModels = await prisma.llmModel.findMany({
      where: {
        isNsfwCapable: true,
        isActive: true,
      },
      orderBy: { gemCostPerMessage: 'asc' },
    });

    console.log(`   활성화된 NSFW 모델 (${nsfwModels.length}개):`);
    nsfwModels.forEach((model) => {
      console.log(`   - ${model.name} (${model.slug})`);
      console.log(`     Gem: ${model.gemCostPerMessage}, Context: ${model.contextWindow} tokens`);
    });

    console.log('\n✅ 교체 완료!');
    console.log('   이제 NSFW 채팅은 Venice Uncensored (무료)를 사용합니다.');
    console.log('   API 서버를 재시작해주세요.\n');
  } catch (error) {
    console.error('\n❌ 교체 실패:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

switchToVenice().catch((error) => {
  console.error('치명적 오류:', error);
  process.exit(1);
});
