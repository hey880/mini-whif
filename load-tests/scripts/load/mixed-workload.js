import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { config, fixtures, testConfig } from '../utils/config.js';
import { authenticate, authJsonHeaders, authSseHeaders, authConnectHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Custom metrics
const sseConnectionTime = new Trend('sse_connection_time');
const sseFirstChunkLatency = new Trend('sse_first_chunk_latency');
const sseTotalDuration = new Trend('sse_total_duration');
const rpcLatency = new Trend('rpc_latency');

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

const characters = new SharedArray('characters', function () {
  return JSON.parse(open(fixtures.characters));
});

export const options = {
  stages: [
    { duration: '3m', target: 15 },   // Ramp up to 15 VUs (rate limit 회피)
    { duration: '15m', target: 15 },  // Stay at 15 VUs
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'sse_connection_time': ['p(95)<500'],
    'sse_first_chunk_latency': ['p(95)<2000'],
    'rpc_latency': ['p(95)<200'],
    'http_req_failed': ['rate<0.01'],
  },
};

// VU별 토큰 캐시 (인증을 매 iteration마다 하지 않고 재사용)
const tokenCache = {};

export function setup() {
  const setupData = performSetup();

  if (testUsers.length === 0 || characters.length === 0) {
    throw new Error('Test data not found. Run "pnpm setup" first.');
  }

  console.log(`\n📝 Loaded ${testUsers.length} test users`);
  console.log(`🎭 Loaded ${characters.length} test characters\n`);

  return setupData;
}

export default function (data) {
  const { apiUrl } = data;
  const user = testUsers[__VU % testUsers.length];

  // 토큰 캐싱: 각 VU는 처음 한 번만 인증하고 토큰 재사용
  if (!tokenCache[__VU]) {
    const token = authenticate(user.email, user.password);

    if (!token) {
      console.error(`Failed to authenticate ${user.email}`);
      return;
    }

    tokenCache[__VU] = token;
    sleep(1);  // 인증 후 1초 대기
  }

  const token = tokenCache[__VU];

  // User behavior distribution:
  // 60% - Chat with AI
  // 20% - Browse characters
  // 10% - Manage personas
  // 10% - Regenerate messages

  const behavior = Math.random();

  if (behavior < 0.6) {
    // 60% - Chat scenario
    chatScenario(apiUrl, token);
  } else if (behavior < 0.8) {
    // 20% - Browse characters
    browseCharactersScenario(apiUrl, token);
  } else if (behavior < 0.9) {
    // 10% - Manage personas
    managePersonasScenario(apiUrl, token);
  } else {
    // 10% - Regenerate messages
    regenerateMessagesScenario(apiUrl, token);
  }
}

function chatScenario(apiUrl, token) {
  const character = characters[Math.floor(Math.random() * characters.length)];

  // Create chat room
  const roomRes = http.post(
    `${apiUrl}/chat-rooms`,
    JSON.stringify({ characterId: character.id }),
    { headers: authJsonHeaders(token) }
  );

  if (roomRes.status !== 200 && roomRes.status !== 201) {
    return;
  }

  const roomId = roomRes.json('id');

  // Send 2-4 messages
  const messageCount = Math.floor(Math.random() * 3) + 2;

  for (let i = 0; i < messageCount; i++) {
    const sseStartTime = Date.now();

    const sseRes = http.post(
      `${apiUrl}/chat-rooms/${roomId}/messages`,
      JSON.stringify({ content: `안녕하세요! 메시지 ${i + 1}입니다.` }),
      {
        headers: authSseHeaders(token),
        responseType: 'text',
        timeout: '60s',
        tags: { scenario: 'chat' },
      }
    );

    if (sseRes.status === 200) {
      const totalDuration = Date.now() - sseStartTime;
      sseTotalDuration.add(totalDuration);

      const metrics = parseSSEResponse(sseRes.body, sseStartTime);
      if (metrics.firstChunkTime > 0) {
        sseConnectionTime.add(metrics.firstChunkTime);
        sseFirstChunkLatency.add(metrics.firstChunkTime);
      }

      check(sseRes, {
        'chat message sent': (r) => r.status === 200,
      });
    } else if (sseRes.status === 402) {
      // Out of gems
      break;
    }

    sleep(Math.random() * 10 + 5);
  }
}

function browseCharactersScenario(apiUrl, token) {
  // List characters
  const startTime = Date.now();

  const listRes = http.post(
    `${apiUrl}/persona_chat.character.v1.CharacterService/ListCharacters`,
    JSON.stringify({ pageSize: 20 }),
    {
      headers: authConnectHeaders(token),
      tags: { scenario: 'browse' },
    }
  );

  rpcLatency.add(Date.now() - startTime);

  check(listRes, {
    'characters listed': (r) => r.status === 200,
  });

  sleep(Math.random() * 3 + 2);

  // Get details of 1-2 random characters
  const chars = listRes.json('characters');
  if (chars && chars.length > 0) {
    const viewCount = Math.min(2, chars.length);
    for (let i = 0; i < viewCount; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const getStartTime = Date.now();

      const getRes = http.post(
        `${apiUrl}/persona_chat.character.v1.CharacterService/GetCharacter`,
        JSON.stringify({ id: char.id }),
        {
          headers: authConnectHeaders(token),
          tags: { scenario: 'browse' },
        }
      );

      rpcLatency.add(Date.now() - getStartTime);

      check(getRes, {
        'character details fetched': (r) => r.status === 200,
      });

      sleep(Math.random() * 5 + 3);
    }
  }
}

function managePersonasScenario(apiUrl, token) {
  // List personas
  const listStartTime = Date.now();

  const listRes = http.post(
    `${apiUrl}/persona_chat.persona.v1.PersonaService/ListPersonas`,
    JSON.stringify({ pageSize: 20 }),
    {
      headers: authConnectHeaders(token),
      tags: { scenario: 'persona' },
    }
  );

  rpcLatency.add(Date.now() - listStartTime);

  check(listRes, {
    'personas listed': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1);

  // Create a new persona (30% chance)
  if (Math.random() < 0.3) {
    const createStartTime = Date.now();

    const createRes = http.post(
      `${apiUrl}/persona_chat.persona.v1.PersonaService/CreatePersona`,
      JSON.stringify({
        name: `테스트 페르소나 ${Date.now()}`,
        description: '부하 테스트용 페르소나',
      }),
      {
        headers: authConnectHeaders(token),
        tags: { scenario: 'persona' },
      }
    );

    rpcLatency.add(Date.now() - createStartTime);

    check(createRes, {
      'persona created': (r) => r.status === 200 || r.status === 201,
    });
  }
}

function regenerateMessagesScenario(apiUrl, token) {
  // Get chat rooms
  const roomsRes = http.post(
    `${apiUrl}/persona_chat.chatroom.v1.ChatRoomService/ListChatRooms`,
    JSON.stringify({ pageSize: 10 }),
    { headers: authConnectHeaders(token) }
  );

  if (roomsRes.status !== 200) {
    return;
  }

  const rooms = roomsRes.json('chatRooms');
  if (!rooms || rooms.length === 0) {
    return;
  }

  // Pick a random room
  const room = rooms[Math.floor(Math.random() * rooms.length)];

  // Get messages
  const messagesRes = http.get(
    `${apiUrl}/chat-rooms/${room.id}/messages?limit=5`,
    { headers: authJsonHeaders(token) }
  );

  if (messagesRes.status !== 200) {
    return;
  }

  const messages = messagesRes.json();
  if (!messages || messages.length === 0) {
    return;
  }

  // Regenerate a random AI message
  const aiMessage = messages.find((m) => m.role === 'assistant' || m.role === 'ASSISTANT');
  if (aiMessage) {
    const sseStartTime = Date.now();

    const regenerateRes = http.post(
      `${apiUrl}/chat-rooms/${room.id}/messages/${aiMessage.id}/regenerate`,
      null,
      {
        headers: authSseHeaders(token),
        responseType: 'text',
        timeout: '60s',
        tags: { scenario: 'regenerate' },
      }
    );

    if (regenerateRes.status === 200) {
      const totalDuration = Date.now() - sseStartTime;
      sseTotalDuration.add(totalDuration);

      const metrics = parseSSEResponse(regenerateRes.body, sseStartTime);
      if (metrics.firstChunkTime > 0) {
        sseFirstChunkLatency.add(metrics.firstChunkTime);
      }

      check(regenerateRes, {
        'message regenerated': (r) => r.status === 200,
      });
    }
  }
}

function parseSSEResponse(body, startTime) {
  const metrics = {
    firstChunkTime: 0,
    chunkCount: 0,
    isComplete: false,
  };

  if (!body) return metrics;

  const lines = body.split('\n');
  let firstEventTime = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      metrics.chunkCount++;

      if (metrics.chunkCount === 1 && !firstEventTime) {
        firstEventTime = Date.now();
        metrics.firstChunkTime = firstEventTime - startTime;
      }

      try {
        const eventData = JSON.parse(line.slice(6));
        if (eventData.is_final_event || eventData.isFinalEvent) {
          metrics.isComplete = true;
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  return metrics;
}

export function teardown(data) {
  console.log('\n✅ Mixed workload test completed');
}
