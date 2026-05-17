import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

interface TestUser {
  id: string;
  email: string;
}

async function main() {
  console.log('🧹 Starting test data cleanup...\n');

  // Load test users from fixtures
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const testUsersPath = path.join(fixturesDir, 'test-users.json');

  if (!fs.existsSync(testUsersPath)) {
    console.log('⚠ No test users fixture found. Nothing to clean up.');
    return;
  }

  const testUsers: TestUser[] = JSON.parse(
    fs.readFileSync(testUsersPath, 'utf-8')
  );

  console.log(`Found ${testUsers.length} test users to clean up\n`);

  // Step 1: Delete test messages
  console.log('🗑️  Deleting test messages...');
  const userIds = testUsers.map((u) => u.id);

  // Delete message versions first (foreign key constraint)
  const deletedVersions = await prisma.messageVersion.deleteMany({
    where: {
      message: {
        chatRoom: {
          userId: { in: userIds },
        },
      },
    },
  });
  console.log(`  ✓ Deleted ${deletedVersions.count} message versions`);

  // Delete user reactions
  const deletedReactions = await prisma.userReaction.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });
  console.log(`  ✓ Deleted ${deletedReactions.count} user reactions`);

  // Delete messages
  const deletedMessages = await prisma.message.deleteMany({
    where: {
      chatRoom: {
        userId: { in: userIds },
      },
    },
  });
  console.log(`  ✓ Deleted ${deletedMessages.count} messages\n`);

  // Step 2: Delete chat rooms
  console.log('💬 Deleting chat rooms...');
  const deletedRooms = await prisma.chatRoom.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });
  console.log(`  ✓ Deleted ${deletedRooms.count} chat rooms\n`);

  // Step 3: Reset Gem wallets
  console.log('💎 Resetting Gem wallets...');
  let resetCount = 0;

  for (const user of testUsers) {
    try {
      await prisma.gemWallet.update({
        where: { userId: user.id },
        data: {
          paidGemAmount: 2000,
          freeDailyGemAmount: 200,
          freePromoGemAmount: 1000,
        },
      });
      resetCount++;
    } catch (error) {
      console.error(`  ✗ Failed to reset wallet for ${user.email}`);
    }
  }

  console.log(`  ✓ Reset ${resetCount} Gem wallets\n`);

  // Step 4: Delete Gem logs
  console.log('📜 Deleting Gem transaction logs...');
  const deletedLogs = await prisma.gemLog.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });
  console.log(`  ✓ Deleted ${deletedLogs.count} Gem logs\n`);

  // Step 5: Archive test results (optional)
  console.log('📦 Archiving test results...');
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

  console.log('\n✅ Cleanup completed!\n');
  console.log('Summary:');
  console.log(`  - Messages deleted: ${deletedMessages.count}`);
  console.log(`  - Chat rooms deleted: ${deletedRooms.count}`);
  console.log(`  - Gem wallets reset: ${resetCount}`);
  console.log(`  - Gem logs deleted: ${deletedLogs.count}`);
  console.log('\nTest users and characters are preserved for reuse.\n');
  console.log('To completely remove test users, manually delete them from Supabase Auth.\n');
}

main()
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
