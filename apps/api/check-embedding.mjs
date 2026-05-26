import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmbedding() {
  try {
    const roomId = '3dd9d97d-d977-4b6c-985b-3616cc88310c';

    // 채팅방 정보
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        character: {
          select: { name: true }
        }
      }
    });

    console.log('=== 채팅방 정보 ===');
    console.log('캐릭터:', room?.character?.name);
    console.log('');

    // 메시지 통계
    const totalMessages = await prisma.message.count({
      where: { roomId }
    });

    const embeddedResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM messages
      WHERE room_id = ${roomId}::uuid
      AND embedding IS NOT NULL
    `;

    const embeddedCount = Number(embeddedResult[0]?.count || 0);

    console.log('=== 메시지 통계 ===');
    console.log('전체 메시지:', totalMessages);
    console.log('임베딩된 메시지:', embeddedCount);
    console.log('임베딩 비율:', totalMessages > 0 ? `${Math.round(embeddedCount / totalMessages * 100)}%` : '0%');
    console.log('');

    // 최근 메시지 15개
    const recentMessages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        role: true,
        content: true,
        createdAt: true,
        embeddedAt: true
      }
    });

    console.log('=== 최근 메시지 15개 ===');
    recentMessages.reverse().forEach((msg, i) => {
      const embedded = msg.embeddedAt ? '✅' : '❌';
      const preview = msg.content.substring(0, 80).replace(/\n/g, ' ');
      console.log(`${i+1}. [${msg.role}] ${embedded} ${preview}...`);
    });
    console.log('');

    // 베수비오 관련 메시지 검색
    const vesuviusMessages = await prisma.message.findMany({
      where: {
        roomId,
        content: {
          contains: '베수비오',
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        role: true,
        content: true,
        createdAt: true,
        embeddedAt: true
      }
    });

    console.log('=== 베수비오 관련 메시지 ===');
    console.log('총', vesuviusMessages.length, '개 발견');
    vesuviusMessages.forEach((msg, i) => {
      const embedded = msg.embeddedAt ? '✅' : '❌';
      const preview = msg.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`${i+1}. [${msg.role}] ${embedded}`);
      console.log(`   ${preview}...`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmbedding();
