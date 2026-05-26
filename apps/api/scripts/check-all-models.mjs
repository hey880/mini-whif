#!/usr/bin/env node

/**
 * 전체 LLM 모델 확인 스크립트
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllModels() {
  console.log('📋 전체 LLM 모델 목록\n');

  const allModels = await prisma.llmModel.findMany({
    orderBy: [
      { isActive: 'desc' },
      { isNsfwCapable: 'desc' },
      { gemCostPerMessage: 'asc' },
    ],
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('일반 모델 (NSFW 불가)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const regularModels = allModels.filter((m) => !m.isNsfwCapable && m.isActive);
  regularModels.forEach((model, idx) => {
    console.log(`${idx + 1}. ${model.name}`);
    console.log(`   Slug: ${model.slug}`);
    console.log(`   Provider: ${model.provider}`);
    console.log(`   Gem: ${model.gemCostPerMessage}/메시지`);
    console.log(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
    console.log(`   Status: ${model.isActive ? '✅ 활성' : '❌ 비활성'}`);
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('NSFW 모델');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const nsfwModels = allModels.filter((m) => m.isNsfwCapable);
  nsfwModels.forEach((model, idx) => {
    const status = model.isActive ? '✅ 활성' : '⚠️  비활성';
    console.log(`${idx + 1}. ${model.name} ${status}`);
    console.log(`   Slug: ${model.slug}`);
    console.log(`   Provider: ${model.provider}`);
    console.log(`   Gem: ${model.gemCostPerMessage}/메시지`);
    console.log(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`총 모델 수: ${allModels.length}개`);
  console.log(`활성 모델: ${allModels.filter((m) => m.isActive).length}개`);
  console.log(`비활성 모델: ${allModels.filter((m) => !m.isActive).length}개`);
  console.log(`NSFW 가능 모델: ${allModels.filter((m) => m.isNsfwCapable).length}개`);
  console.log(`활성 NSFW 모델: ${allModels.filter((m) => m.isNsfwCapable && m.isActive).length}개\n`);

  await prisma.$disconnect();
}

checkAllModels().catch((error) => {
  console.error('오류:', error);
  process.exit(1);
});
