#!/usr/bin/env node

/**
 * NSFW 모델 교체 마이그레이션 적용 스크립트
 * 목적: Prisma Client를 사용하여 마이그레이션 SQL의 로직 실행
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyNsfwMigration() {
  console.log('🔄 NSFW 모델 교체 마이그레이션 시작...\n');

  try {
    // 1. Euryale 모델 추가/업데이트 (seed에서 이미 처리됨)
    console.log('1️⃣  Euryale 70B 모델 확인...');
    const euryale = await prisma.llmModel.upsert({
      where: { slug: 'sao10k/l3.3-euryale-70b' },
      update: {
        name: 'Euryale 70B',
        contextWindow: 131072,
        maxOutputTokens: 16384,
        gemCostPerMessage: 10,
        isActive: true,
        isNsfwCapable: true,
      },
      create: {
        slug: 'sao10k/l3.3-euryale-70b',
        name: 'Euryale 70B',
        provider: 'OpenRouter',
        contextWindow: 131072,
        maxOutputTokens: 16384,
        gemCostPerMessage: 10,
        isActive: true,
        isNsfwCapable: true,
      },
    });
    console.log(`   ✅ Euryale 모델 ID: ${euryale.id}\n`);

    // 2. Mythomax 비활성화
    console.log('2️⃣  Mythomax L2 13B 비활성화...');
    const mythomax = await prisma.llmModel.updateMany({
      where: { slug: 'gryphe/mythomax-l2-13b' },
      data: {
        isActive: false,
        name: 'Mythomax L2 13B (Deprecated)',
      },
    });
    console.log(`   ✅ ${mythomax.count}개 모델 비활성화\n`);

    // 3. Mythomax 참조하는 프로필 찾기
    console.log('3️⃣  Mythomax 참조 제거...');
    const mythomaxModel = await prisma.llmModel.findUnique({
      where: { slug: 'gryphe/mythomax-l2-13b' },
    });

    if (mythomaxModel) {
      // Profiles 업데이트
      const profilesUpdated = await prisma.profile.updateMany({
        where: { chosenLlmModelId: mythomaxModel.id },
        data: { chosenLlmModelId: null },
      });
      console.log(`   ✅ ${profilesUpdated.count}개 프로필 참조 제거`);

      // Characters 업데이트
      const charactersUpdated = await prisma.character.updateMany({
        where: { defaultLlmModelId: mythomaxModel.id },
        data: { defaultLlmModelId: null },
      });
      console.log(`   ✅ ${charactersUpdated.count}개 캐릭터 참조 제거\n`);
    } else {
      console.log('   ℹ️  Mythomax 모델을 찾을 수 없습니다 (이미 삭제됨)\n');
    }

    // 4. 최종 검증
    console.log('4️⃣  최종 검증...');
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

    console.log('\n✅ 마이그레이션 완료!');
    console.log('   이제 NSFW 채팅은 Euryale 70B 모델을 사용합니다.\n');
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyNsfwMigration().catch((error) => {
  console.error('치명적 오류:', error);
  process.exit(1);
});
