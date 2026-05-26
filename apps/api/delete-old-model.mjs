import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting openrouter/auto model...');
  await prisma.llmModel.delete({
    where: { slug: 'openrouter/auto' }
  });
  console.log('✅ Deleted openrouter/auto');
  
  console.log('\n=== Remaining models (ordered by cost) ===\n');
  const models = await prisma.llmModel.findMany({
    where: { isActive: true },
    orderBy: { gemCostPerMessage: 'asc' }
  });
  
  models.forEach(m => {
    console.log(`${m.name} (${m.slug}) - ${m.gemCostPerMessage} gems - NSFW: ${m.isNsfwCapable}`);
  });
  
  const defaultModel = models[0];
  const nsfwModel = models.find(m => m.isNsfwCapable);
  
  console.log('\n=== New Default Models ===');
  console.log(`General: ${defaultModel?.name}`);
  console.log(`NSFW: ${nsfwModel?.name}`);
}

main().finally(() => prisma.$disconnect());
