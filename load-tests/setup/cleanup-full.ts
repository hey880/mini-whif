import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const prisma = new PrismaClient();

interface TestUser {
  id: string;
  email: string;
}

interface TestCharacter {
  id: string;
  name: string;
}

async function main() {
  console.log('🧹 Starting FULL cleanup (including users and characters)...\n');

  // Verify environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    console.error('Please check your .env file:');
    console.error(`  SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ MISSING'}`);
    console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗ MISSING'}`);
    process.exit(1);
  }

  // Load test users from fixtures
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const testUsersPath = path.join(fixturesDir, 'test-users.json');
  const charactersPath = path.join(fixturesDir, 'characters.json');

  if (!fs.existsSync(testUsersPath)) {
    console.log('⚠ No test users fixture found. Nothing to clean up.');
    return;
  }

  const testUsers: TestUser[] = JSON.parse(
    fs.readFileSync(testUsersPath, 'utf-8')
  );

  let testCharacters: TestCharacter[] = [];
  if (fs.existsSync(charactersPath)) {
    testCharacters = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
  }

  console.log(`Found ${testUsers.length} test users to delete`);
  console.log(`Found ${testCharacters.length} test characters to delete\n`);

  const userIds = testUsers.map((u) => u.id);
  const characterIds = testCharacters.map((c) => c.id);

  // Step 1: Delete message-related data
  console.log('🗑️  Deleting message-related data...');

  // Get all message IDs for these users
  const messages = await prisma.message.findMany({
    where: {
      room: {
        userId: { in: userIds },
      },
    },
    select: { id: true },
  });
  const messageIds = messages.map((m) => m.id);

  if (messageIds.length > 0) {
    // Delete user reactions
    const deletedReactions = await prisma.userReaction.deleteMany({
      where: { messageId: { in: messageIds } },
    });
    console.log(`  ✓ Deleted ${deletedReactions.count} user reactions`);

    // Delete message versions
    const deletedVersions = await prisma.messageVersion.deleteMany({
      where: { messageId: { in: messageIds } },
    });
    console.log(`  ✓ Deleted ${deletedVersions.count} message versions`);

    // Delete messages
    const deletedMessages = await prisma.message.deleteMany({
      where: { id: { in: messageIds } },
    });
    console.log(`  ✓ Deleted ${deletedMessages.count} messages\n`);
  } else {
    console.log('  ✓ No messages to delete\n');
  }

  // Step 2: Delete chat rooms
  console.log('💬 Deleting chat rooms...');
  const deletedRooms = await prisma.chatRoom.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`  ✓ Deleted ${deletedRooms.count} chat rooms\n`);

  // Step 3: Delete Gem logs
  console.log('📜 Deleting Gem transaction logs...');
  const deletedLogs = await prisma.gemLog.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`  ✓ Deleted ${deletedLogs.count} Gem logs\n`);

  // Step 4: Delete Gem orders
  console.log('💳 Deleting Gem orders...');
  const deletedOrders = await prisma.gemOrder.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`  ✓ Deleted ${deletedOrders.count} Gem orders\n`);

  // Step 5: Delete user personas
  console.log('👤 Deleting user personas...');
  const deletedPersonas = await prisma.userPersona.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`  ✓ Deleted ${deletedPersonas.count} user personas\n`);

  // Step 6: Delete Gem wallets
  console.log('💎 Deleting Gem wallets...');
  const deletedWallets = await prisma.gemWallet.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`  ✓ Deleted ${deletedWallets.count} Gem wallets\n`);

  // Step 7: Delete test characters
  console.log('🎭 Deleting test characters...');
  if (characterIds.length > 0) {
    const deletedCharacters = await prisma.character.deleteMany({
      where: { id: { in: characterIds } },
    });
    console.log(`  ✓ Deleted ${deletedCharacters.count} characters\n`);
  } else {
    console.log('  ✓ No characters to delete\n');
  }

  // Step 8: Delete profiles
  console.log('👥 Deleting profiles from database...');
  const deletedProfiles = await prisma.profile.deleteMany({
    where: { id: { in: userIds } },
  });
  console.log(`  ✓ Deleted ${deletedProfiles.count} profiles\n`);

  // Step 9: Delete users from Supabase Auth
  console.log('🔐 Deleting users from Supabase Auth...');
  let authDeleteCount = 0;
  let authDeleteErrors = 0;

  for (const user of testUsers) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`  ✗ Failed to delete ${user.email}: ${error.message}`);
        authDeleteErrors++;
      } else {
        authDeleteCount++;
        console.log(`  ✓ Deleted ${user.email} from Auth`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to delete ${user.email}:`, error);
      authDeleteErrors++;
    }
  }

  console.log(`\n  ✓ Deleted ${authDeleteCount} users from Supabase Auth`);
  if (authDeleteErrors > 0) {
    console.log(`  ⚠ Failed to delete ${authDeleteErrors} users from Auth\n`);
  }

  // Step 10: Delete fixture files
  console.log('🗂️  Deleting fixture files...');
  if (fs.existsSync(testUsersPath)) {
    fs.unlinkSync(testUsersPath);
    console.log('  ✓ Deleted test-users.json');
  }
  if (fs.existsSync(charactersPath)) {
    fs.unlinkSync(charactersPath);
    console.log('  ✓ Deleted characters.json');
  }

  // Archive test results
  console.log('\n📦 Archiving test results...');
  const resultsDir = path.join(__dirname, '..', 'results');
  const archiveDir = path.join(resultsDir, 'archive');

  if (fs.existsSync(resultsDir)) {
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const files = fs.readdirSync(resultsDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    files.forEach((file) => {
      if (file.endsWith('.json') || file.endsWith('.html')) {
        const oldPath = path.join(resultsDir, file);
        const newPath = path.join(archiveDir, `${timestamp}-${file}`);
        fs.renameSync(oldPath, newPath);
        console.log(`  ✓ Archived ${file}`);
      }
    });
  }

  console.log('\n✅ FULL cleanup completed!\n');
  console.log('Summary:');
  console.log(`  - Messages deleted: ${messageIds.length}`);
  console.log(`  - Chat rooms deleted: ${deletedRooms.count}`);
  console.log(`  - Gem wallets deleted: ${deletedWallets.count}`);
  console.log(`  - Gem logs deleted: ${deletedLogs.count}`);
  console.log(`  - Characters deleted: ${characterIds.length}`);
  console.log(`  - Profiles deleted: ${deletedProfiles.count}`);
  console.log(`  - Auth users deleted: ${authDeleteCount}`);
  console.log('\nAll test data has been completely removed.');
  console.log('Run "pnpm seed" to recreate test users and characters.\n');
}

main()
  .catch((error) => {
    console.error('❌ Full cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
