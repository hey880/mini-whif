import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMemories() {
  try {
    const roomId = '3dd9d97d-d977-4b6c-985b-3616cc88310c';

    // conversation_memories 조회
    const memories = await prisma.$queryRaw`
      SELECT id, summary, importance, created_at
      FROM conversation_memories
      WHERE room_id = ${roomId}::uuid
      ORDER BY created_at DESC
    `;

    console.log('=== 대화 요약 기억 ===');
    console.log('총', memories.length, '개');
    console.log('');

    memories.forEach((mem, i) => {
      console.log(`${i+1}. [중요도: ${mem.importance}]`);
      console.log(`   ${mem.summary}`);
      console.log(`   생성: ${mem.created_at}`);
      console.log('');
    });

    if (memories.length === 0) {
      console.log('⚠️  대화 요약 기억이 없습니다!');
      console.log('RAG가 작동하려면 대화 요약 기억이 필요합니다.');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkMemories();
