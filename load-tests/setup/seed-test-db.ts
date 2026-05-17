import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import ws from 'ws';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const userCount = parseInt(process.env.TEST_USER_COUNT || '100', 10);
const userPassword = process.env.TEST_USER_PASSWORD || 'LoadTest2024!';
const emailPrefix = process.env.TEST_USER_EMAIL_PREFIX || 'loadtest-user';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {},
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // @ts-ignore - ws module type compatibility
  ...(typeof WebSocket === 'undefined' && { realtime: { transport: ws } }),
});
const prisma = new PrismaClient();

interface TestUser {
  id: string;
  email: string;
  password: string;
}

interface TestCharacter {
  id: string;
  name: string;
}

async function main() {
  console.log('🚀 Starting test database seeding...\n');

  // Verify environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    console.error('Please check your .env file:');
    console.error(`  SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ MISSING'}`);
    console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗ MISSING'}`);
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   Creating ${userCount} test users...\n`);

  // Step 1: Create test users in Supabase Auth
  console.log(`📝 Creating ${userCount} test users...`);
  const testUsers: TestUser[] = [];
  const batchSize = 10;

  for (let i = 0; i < userCount; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < userCount; j++) {
      const userNum = (i + j + 1).toString().padStart(3, '0');
      const email = `${emailPrefix}-${userNum}@example.com`;

      batch.push(
        supabase.auth.admin.createUser({
          email,
          password: userPassword,
          email_confirm: true,
        })
      );
    }

    const results = await Promise.allSettled(batch);

    for (let j = 0; j < results.length && (i + j) < userCount; j++) {
      const result = results[j];
      const userNum = (i + j + 1).toString().padStart(3, '0');
      const email = `${emailPrefix}-${userNum}@example.com`;

      if (result.status === 'fulfilled' && result.value.data.user) {
        testUsers.push({
          id: result.value.data.user.id,
          email,
          password: userPassword,
        });
        console.log(`  ✓ Created user ${userNum}: ${email}`);
      } else if (result.status === 'fulfilled' && result.value.error) {
        // User already exists - try to find in database
        if (result.value.error.message.includes('already been registered')) {
          try {
            const existingProfile = await prisma.profile.findUnique({
              where: { email },
            });

            if (existingProfile) {
              testUsers.push({
                id: existingProfile.id,
                email,
                password: userPassword,
              });
              console.log(`  ✓ Found existing user ${userNum}: ${email}`);
            } else {
              console.warn(`  ⚠ User ${userNum} exists in Auth but not in database: ${email}`);
            }
          } catch (error) {
            console.error(`  ✗ Failed to find user ${userNum}:`, error);
          }
        } else {
          console.error(`  ✗ User ${userNum} error:`, result.value.error.message);
        }
      } else if (result.status === 'rejected') {
        console.error(`  ✗ Failed to create user ${userNum}:`, result.reason);
      }
    }
  }

  console.log(`\n✅ Created ${testUsers.length} test users\n`);

  // Step 2: Initialize Gem wallets
  console.log('💎 Initializing Gem wallets...');

  for (const user of testUsers) {
    try {
      // Check if profile exists
      const existingProfile = await prisma.profile.findUnique({
        where: { id: user.id },
      });

      if (!existingProfile) {
        // Create profile
        await prisma.profile.create({
          data: {
            id: user.id,
            email: user.email,
            displayName: `Test User ${user.email.split('-')[2].split('@')[0]}`,
          },
        });
      }

      // Check if wallet exists
      const existingWallet = await prisma.gemWallet.findUnique({
        where: { userId: user.id },
      });

      if (!existingWallet) {
        // Create wallet with initial gems
        await prisma.gemWallet.create({
          data: {
            userId: user.id,
            paidGemAmount: 2000,
            freeDailyGemAmount: 200,
            freePromoGemAmount: 1000,
          },
        });
        console.log(`  ✓ Initialized wallet for ${user.email}`);
      } else {
        // Reset existing wallet
        await prisma.gemWallet.update({
          where: { userId: user.id },
          data: {
            paidGemAmount: 2000,
            freeDailyGemAmount: 200,
            freePromoGemAmount: 1000,
          },
        });
        console.log(`  ✓ Reset wallet for ${user.email}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to initialize wallet for ${user.email}:`, error);
    }
  }

  console.log('\n✅ Gem wallets initialized\n');

  // Step 3: Get or create test characters
  console.log('🎭 Setting up test characters...');

  // Get or create test characters
  const testCharacters: TestCharacter[] = [];
  const characterNames = [
    '프리즘', '아이리스', '벨벳', '노바', '루나',
    '스텔라', '오로라', '제피르', '코랄', '에코',
  ];

  // Use first test user as creator for all test characters
  const creatorId = testUsers.length > 0 ? testUsers[0].id : null;

  if (!creatorId) {
    console.error('❌ No test users available to be character creator');
  } else {
    for (let i = 0; i < Math.min(characterNames.length, 10); i++) {
      const name = characterNames[i];

      try {
        // Check if character exists
        let character = await prisma.character.findFirst({
          where: { name },
        });

        if (!character) {
          // Create test character
          character = await prisma.character.create({
            data: {
              name,
              creatorId: creatorId,
              greeting: `안녕하세요! 저는 ${name}입니다. 무엇을 도와드릴까요?`,
              description: `테스트용 AI 캐릭터 ${name}`,
              keywords: ['테스트', 'load-test', name.toLowerCase()],
              data: {
                personality: 'friendly',
                tone: 'casual',
              },
              lorebook: {
                world: 'test-world',
                rules: ['Be helpful', 'Stay in character'],
              },
            },
          });
          console.log(`  ✓ Created character: ${name}`);
        } else {
          console.log(`  ✓ Found existing character: ${name}`);
        }

        testCharacters.push({
          id: character.id,
          name: character.name,
        });
      } catch (error) {
        console.error(`  ✗ Failed to create character ${name}:`, error);
      }
    }
  }

  console.log(`\n✅ Set up ${testCharacters.length} test characters\n`);

  // Step 4: Save fixtures
  console.log('💾 Saving test fixtures...');

  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(fixturesDir, 'test-users.json'),
    JSON.stringify(testUsers, null, 2)
  );
  console.log(`  ✓ Saved ${testUsers.length} users to fixtures/test-users.json`);

  fs.writeFileSync(
    path.join(fixturesDir, 'characters.json'),
    JSON.stringify(testCharacters, null, 2)
  );
  console.log(`  ✓ Saved ${testCharacters.length} characters to fixtures/characters.json`);

  console.log('\n🎉 Test database seeding completed!\n');
  console.log('Summary:');
  console.log(`  - Test users: ${testUsers.length}`);
  console.log(`  - Test characters: ${testCharacters.length}`);
  console.log(`  - Gems per user: 3200 (2000 paid + 200 daily + 1000 promo)`);
  console.log('\nYou can now run load tests with: pnpm smoke\n');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
