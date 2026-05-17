import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { config, fixtures, testConfig } from '../utils/config.js';
import { authenticate, authJsonHeaders, authSseHeaders, authConnectHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Custom metrics for SSE streaming
const sseConnectionTime = new Trend('sse_connection_time');
const sseFirstChunkLatency = new Trend('sse_first_chunk_latency');
const sseTotalDuration = new Trend('sse_total_duration');
const sseChunksReceived = new Counter('sse_chunks_received');
const sseErrorRate = new Counter('sse_error_rate');
const sseSuccessRate = new Counter('sse_success_rate');
const gemBalanceErrors = new Counter('gem_balance_errors');

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

const characters = new SharedArray('characters', function () {
  return JSON.parse(open(fixtures.characters));
});

export const options = {
  stages: [
    { duration: '2m', target: 15 },   // Ramp up to 15 VUs (rate limit 회피)
    { duration: '10m', target: 15 },  // Stay at 15 VUs
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    'sse_connection_time': ['p(95)<500'],
    'sse_first_chunk_latency': ['p(95)<2000'],
    'sse_total_duration': ['p(95)<35000'],
    'http_req_failed': ['rate<0.01'],
    'gem_balance_errors': ['count==0'],
  },
};

// VU별 토큰 캐시 (인증을 매 iteration마다 하지 않고 재사용)
const tokenCache = {};

export function setup() {
  const setupData = performSetup();

  if (testUsers.length === 0) {
    throw new Error('No test users found. Run "pnpm setup" first.');
  }

  if (characters.length === 0) {
    throw new Error('No test characters found. Run "pnpm setup" first.');
  }

  console.log(`\n📝 Loaded ${testUsers.length} test users`);
  console.log(`🎭 Loaded ${characters.length} test characters\n`);

  return setupData;
}

export default function (data) {
  const { apiUrl } = data;

  // Select test user and character (round-robin)
  const user = testUsers[__VU % testUsers.length];
  const character = characters[__VU % characters.length];

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

  // 2. Create or get chat room (using ConnectRPC)
  const roomPayload = JSON.stringify({
    characterId: character.id,
  });

  const roomRes = http.post(
    `${apiUrl}/persona_chat.chatroom.v1.ChatRoomService/CreateChatRoom`,
    roomPayload,
    { headers: authConnectHeaders(token) }
  );

  const roomCreated = check(roomRes, {
    'chat room created/retrieved': (r) => r.status === 200,
    'room has id': (r) => {
      const body = r.json();
      return body?.chatRoom?.id !== undefined;
    },
  });

  if (!roomCreated) {
    console.error(`Failed to create chat room: ${roomRes.status} ${roomRes.body}`);
    return;
  }

  const roomId = roomRes.json('chatRoom').id;

  // 3. Send messages with SSE streaming (simulate conversation)
  const messagesCount = Math.floor(Math.random() * 3) + 3; // 3-5 messages

  for (let i = 0; i < messagesCount; i++) {
    const messageContent = generateMessage(i);
    const sseStartTime = Date.now();

    const sseRes = http.post(
      `${apiUrl}/chat-rooms/${roomId}/messages`,
      JSON.stringify({ content: messageContent }),
      {
        headers: authSseHeaders(token),
        responseType: 'text',
        timeout: '60s',
        tags: { name: 'sse_streaming' },
      }
    );

    const sseEndTime = Date.now();
    const totalDuration = sseEndTime - sseStartTime;

    // Parse SSE response
    const sseMetrics = parseSSEResponse(sseRes.body, sseStartTime);

    if (sseRes.status === 200) {
      sseSuccessRate.add(1);

      // Record metrics
      if (sseMetrics.firstChunkTime > 0) {
        sseConnectionTime.add(sseMetrics.firstChunkTime);
        sseFirstChunkLatency.add(sseMetrics.firstChunkTime);
      }
      sseTotalDuration.add(totalDuration);
      sseChunksReceived.add(sseMetrics.chunkCount);

      check(sseRes, {
        'SSE stream connected': (r) => r.status === 200,
        'SSE received chunks': () => sseMetrics.chunkCount > 0,
        'SSE stream completed': () => sseMetrics.isComplete,
      });
    } else if (sseRes.status === 402) {
      // Insufficient gems - expected behavior
      gemBalanceErrors.add(1);
      console.warn(`User ${user.email} ran out of gems`);
      break; // Stop sending messages
    } else {
      // Unexpected error
      sseErrorRate.add(1);
      check(sseRes, {
        'SSE stream failed': (r) => r.status !== 200,
      });

      console.error(`SSE streaming failed: ${sseRes.status} ${sseRes.body.substring(0, 200)}`);
    }

    // Think time between messages (user reading and typing)
    sleep(Math.random() * (testConfig.thinkTimeMax - testConfig.thinkTimeMin) + testConfig.thinkTimeMin);
  }
}

/**
 * Generate a test message
 * @param {number} index - Message index in conversation
 * @returns {string} Message content
 */
function generateMessage(index) {
  const messages = [
    '안녕하세요! 오늘 기분이 어떠세요?',
    '재미있는 이야기를 들려주실 수 있나요?',
    '당신의 취미는 무엇인가요?',
    '좋아하는 음식이 뭐예요?',
    '오늘 날씨가 정말 좋네요.',
    '주말 계획이 있으신가요?',
    '최근에 재미있는 일이 있었나요?',
    '어떤 음악을 좋아하시나요?',
  ];

  return messages[index % messages.length] + ` (VU ${__VU}, Iter ${__ITER}, Msg ${index + 1})`;
}

/**
 * Parse SSE response and extract metrics
 * @param {string} body - SSE response body
 * @param {number} startTime - Request start timestamp
 * @returns {object} Metrics object
 */
function parseSSEResponse(body, startTime) {
  const metrics = {
    firstChunkTime: 0,
    chunkCount: 0,
    isComplete: false,
  };

  if (!body) {
    return metrics;
  }

  const lines = body.split('\n');
  let firstEventTime = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      metrics.chunkCount++;

      // Record first chunk time
      if (metrics.chunkCount === 1 && !firstEventTime) {
        firstEventTime = Date.now();
        metrics.firstChunkTime = firstEventTime - startTime;
      }

      // Check for completion
      try {
        const eventData = JSON.parse(line.slice(6));
        if (eventData.is_final_event || eventData.isFinalEvent) {
          metrics.isComplete = true;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  return metrics;
}

export function teardown(data) {
  console.log('\n✅ Chat streaming load test completed');
  console.log('\n📊 Check results/ directory for detailed metrics');
}
