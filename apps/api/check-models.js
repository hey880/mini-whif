const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = await prisma.llmModel.findMany({
    where: { isActive: true },
    orderBy: { gemCostPerMessage: 'asc' }
  });
  
  console.log('\n=== Active LLM Models (ordered by cost) ===\n');
  models.forEach(m => {
    console.log(`${m.name}`);
    console.log(`  slug: ${m.slug}`);
    console.log(`  cost: ${m.gemCostPerMessage} gems`);
    console.log(`  NSFW capable: ${m.isNsfwCapable}`);
    console.log('');
  });
  
  const defaultModel = models.find(m => !m.isNsfwCapable) || models[0];
  const nsfwModel = models.find(m => m.isNsfwCapable);
  
  console.log('=== Default Models ===');
  console.log(`General: ${defaultModel?.name} (${defaultModel?.slug})`);
  console.log(`NSFW: ${nsfwModel?.name} (${nsfwModel?.slug})`);
}

main().finally(() => prisma.$disconnect());
