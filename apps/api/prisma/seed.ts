import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. LLM Models
  // ============================================
  console.log('Creating LLM models...');

  const models = [
    {
      name: '프리즘',
      slug: 'anthropic/claude-3.5-haiku',
      provider: 'Anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      gemCostPerMessage: 5,
      isActive: true,
    },
    {
      name: '아이리스',
      slug: 'anthropic/claude-3.5-sonnet',
      provider: 'Anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      gemCostPerMessage: 10,
      isActive: true,
    },
    {
      name: '벨벳',
      slug: 'google/gemini-flash-1.5',
      provider: 'Google',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      gemCostPerMessage: 8,
      isActive: true,
    },
  ];

  for (const model of models) {
    await prisma.llmModel.upsert({
      where: { slug: model.slug },
      update: model,
      create: model,
    });
  }

  console.log(`✅ Created ${models.length} LLM models`);

  // ============================================
  // 2. Popular Keywords
  // ============================================
  console.log('Creating popular keywords...');

  const keywords = [
    { keyword: 'romance', category: 'genre', usageCount: 1500 },
    { keyword: 'fantasy', category: 'genre', usageCount: 1200 },
    { keyword: 'sci-fi', category: 'genre', usageCount: 980 },
    { keyword: 'mystery', category: 'genre', usageCount: 850 },
    { keyword: 'horror', category: 'genre', usageCount: 720 },
    { keyword: 'slice-of-life', category: 'genre', usageCount: 650 },
    { keyword: 'adventure', category: 'genre', usageCount: 1100 },
    { keyword: 'comedy', category: 'genre', usageCount: 890 },
    { keyword: 'drama', category: 'genre', usageCount: 760 },
    { keyword: 'action', category: 'genre', usageCount: 940 },
    { keyword: 'wholesome', category: 'tone', usageCount: 680 },
    { keyword: 'dark', category: 'tone', usageCount: 520 },
    { keyword: 'funny', category: 'tone', usageCount: 710 },
    { keyword: 'serious', category: 'tone', usageCount: 450 },
    { keyword: 'nsfw', category: 'content', usageCount: 1350 },
    { keyword: 'sfw', category: 'content', usageCount: 980 },
    { keyword: 'anime', category: 'style', usageCount: 1450 },
    { keyword: 'realistic', category: 'style', usageCount: 620 },
    { keyword: 'historical', category: 'setting', usageCount: 490 },
    { keyword: 'modern', category: 'setting', usageCount: 830 },
    { keyword: 'futuristic', category: 'setting', usageCount: 570 },
    { keyword: 'medieval', category: 'setting', usageCount: 640 },
  ];

  for (const kw of keywords) {
    await prisma.keyword.upsert({
      where: { keyword: kw.keyword },
      update: kw,
      create: kw,
    });
  }

  console.log(`✅ Created ${keywords.length} keywords`);

  // ============================================
  // 3. Demo Universe (Optional)
  // ============================================
  console.log('Creating demo universe...');

  const demoUniverse = await prisma.universe.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      name: 'Persona Chat Demo World',
      description: 'A sample universe for demonstration purposes',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Persona Chat Demo World',
      description: 'A sample universe for demonstration purposes',
    },
  });

  console.log(`✅ Created demo universe: ${demoUniverse.name}`);

  console.log('');
  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log(`  - ${models.length} LLM models`);
  console.log(`  - ${keywords.length} popular keywords`);
  console.log(`  - 1 demo universe`);
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
