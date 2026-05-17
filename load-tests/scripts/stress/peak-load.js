import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { config, fixtures } from '../utils/config.js';
import { authenticate, authSseHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Custom metrics
const dbConnectionErrors = new Counter('db_connection_errors');
const sseConnectionErrors = new Counter('sse_connection_errors');
const maxVus = new Trend('max_vus_reached');

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

const characters = new SharedArray('characters', function () {
  return JSON.parse(open(fixtures.characters));
});

export const options = {
  stages: [
    { duration: '5m', target: 200 },   // Ramp to 200 VUs
    { duration: '5m', target: 200 },   // Hold at 200
    { duration: '5m', target: 350 },   // Push to 350
    { duration: '5m', target: 350 },   // Hold at 350
    { duration: '5m', target: 500 },   // Push to limit at 500
    { duration: '3m', target: 500 },   // Hold at 500
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Relaxed thresholds - we expect some degradation
    'http_req_duration': ['p(95)<5000'],
    'http_req_failed': ['rate<0.05'], // Allow up to 5% errors
  },
};

export function setup() {
  const setupData = performSetup();

  if (testUsers.length === 0 || characters.length === 0) {
    throw new Error('Test data not found. Run "pnpm setup" first.');
  }

  console.log('\n🔥 STRESS TEST - Finding System Limits 🔥');
  console.log(`📝 Test users: ${testUsers.length}`);
  console.log(`🎭 Characters: ${characters.length}`);
  console.log('\n⚠️  Monitor: DB connections, memory usage, CPU\n');

  return setupData;
}

export default function (data) {
  const { apiUrl } = data;

  // Select user and character
  const user = testUsers[__VU % testUsers.length];
  const character = characters[__VU % characters.length];

  // Authenticate
  const token = authenticate(user.email, user.password);
  if (!token) {
    return;
  }

  // Create chat room
  const roomRes = http.post(
    `${apiUrl}/chat-rooms`,
    JSON.stringify({ characterId: character.id }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: '30s',
    }
  );

  if (roomRes.status !== 200 && roomRes.status !== 201) {
    if (roomRes.status >= 500) {
      dbConnectionErrors.add(1);
      console.error(`DB error creating room: ${roomRes.status}`);
    }
    return;
  }

  const roomId = roomRes.json('id');

  // Send a message
  const sseRes = http.post(
    `${apiUrl}/chat-rooms/${roomId}/messages`,
    JSON.stringify({ content: `스트레스 테스트 메시지 (VU ${__VU})` }),
    {
      headers: authSseHeaders(token),
      responseType: 'text',
      timeout: '60s',
    }
  );

  if (sseRes.status !== 200) {
    if (sseRes.status >= 500) {
      sseConnectionErrors.add(1);
    } else if (sseRes.status === 402) {
      // Out of gems - expected
    } else {
      console.error(`SSE error: ${sseRes.status}`);
    }
  }

  check(sseRes, {
    'message sent or known error': (r) =>
      r.status === 200 || r.status === 402 || r.status >= 500,
  });

  // Record max VUs reached
  maxVus.add(__VU);

  // Short think time during stress test
  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  console.log('\n✅ Stress test completed');
  console.log('\n📊 Analysis:');
  console.log('  - Check DB connection errors');
  console.log('  - Review p95/p99 latency degradation');
  console.log('  - Identify breaking point VU count');
  console.log('  - Monitor system resource usage\n');
}
