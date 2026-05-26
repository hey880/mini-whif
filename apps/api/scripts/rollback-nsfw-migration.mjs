#!/usr/bin/env node

/**
 * NSFW 모델 교체 롤백 스크립트
 * 목적: Euryale → Mythomax로 되돌리기 (긴급 상황용)
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

// 사용자 확인 프롬프트
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function rollbackNsfwMigration() {
  console.log('⚠️  NSFW 모델 교체 롤백\n');
  console.log('이 작업은 다음을 수행합니다:');
  console.log('  1. Mythomax L2 13B 재활성화 (무료 모델)');
  console.log('  2. Euryale 70B 비활성화');
  console.log('  3. NSFW 채팅이 다시 Mythomax를 사용하도록 복원\n');

  const confirmed = await askConfirmation('정말 롤백하시겠습니까? (y/N): ');

  if (!confirmed) {
    console.log('\n❌ 롤백이 취소되었습니다.');
    await prisma.$disconnect();
    process.exit(0);
  }

  try {
    console.log('\n🔄 롤백 시작...\n');

    // 1. Mythomax 재활성화
    console.log('1️⃣  Mythomax L2 13B 재활성화...');
    const mythomaxUpdated = await prisma.llmModel.updateMany({
      where: { slug: 'gryphe/mythomax-l2-13b' },
      data: {
        isActive: true,
        name: 'Mythomax L2 13B (Free)',
      },
    });
    console.log(`   ✅ ${mythomaxUpdated.count}개 모델 재활성화\n`);

    // 2. Euryale 비활성화
    console.log('2️⃣  Euryale 70B 비활성화...');
    const euryaleUpdated = await prisma.llmModel.updateMany({
      where: { slug: 'sao10k/l3.3-euryale-70b' },
      data: {
        isActive: false,
      },
    });
    console.log(`   ✅ ${euryaleUpdated.count}개 모델 비활성화\n`);

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

    console.log('\n✅ 롤백 완료!');
    console.log('   이제 NSFW 채팅은 다시 Mythomax L2 13B (무료)를 사용합니다.');
    console.log('   API 서버를 재시작해야 변경 사항이 반영됩니다.\n');
  } catch (error) {
    console.error('\n❌ 롤백 실패:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

rollbackNsfwMigration().catch((error) => {
  console.error('치명적 오류:', error);
  process.exit(1);
});
