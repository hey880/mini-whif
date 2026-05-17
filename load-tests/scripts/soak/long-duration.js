import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { config, fixtures } from '../utils/config.js';
import { authenticate, authSseHeaders, authConnectHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Custom metrics for long-duration monitoring
const memoryLeakIndicator = new Trend('response_size_trend');
const errorTrend = new Counter('errors_over_time');

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

const characters = new SharedArray('characters', function () {
  return JSON.parse(open(fixtures.characters));
});

export const options = {
  stages: [
    { duration: '5m', target: 30 },     // Ramp up slowly
    { duration: '2h', target: 30 },     // Hold for 2 hours (or 4h)
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    // Monitor for degradation over time
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.01'],
    'errors_over_time': ['count<100'],  // Allow some errors over 2h
  },
};

export function setup() {
  const setupData = performSetup();

  if (testUsers.length === 0 || characters.length === 0) {
    throw new Error('Test data not found. Run "pnpm setup" first.');
  }

  console.log('\n⏰ SOAK TEST - Long Duration Stability ⏰');
  console.log('Running 30 VUs for 2 hours\n');
  console.log('🔍 Monitoring:');
  console.log('  - Memory leaks');
  console.log('  - Connection pool exhaustion');
  console.log('  - Performance degradation');
  console.log('  - Error rate trends\n');
  console.log('⚠️  This test will take 2+ hours. Go grab coffee ☕\n');

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
    errorTrend.add(1);
    return;
  }

  // Mix of operations to simulate real usage
  const operation = Math.random();

  if (operation < 0.7) {
    // 70% - Chat
    chatOperation(apiUrl, token, character);
  } else if (operation < 0.9) {
    // 20% - Browse
    browseOperation(apiUrl, token);
  } else {
    // 10% - Manage
    manageOperation(apiUrl, token);
  }

  // Realistic think time
  sleep(Math.random() * 20 + 10); // 10-30 seconds
}

function chatOperation(apiUrl, token, character) {
  // Create/get room
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
    errorTrend.add(1);
    return;
  }

  const roomId = roomRes.json('id');

  // Send message
  const sseRes = http.post(
    `${apiUrl}/chat-rooms/${roomId}/messages`,
    JSON.stringify({ content: 'Soak test message' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'text',
      timeout: '60s',
    }
  );

  // Track response size for memory leak detection
  if (sseRes.body) {
    memoryLeakIndicator.add(sseRes.body.length);
  }

  if (sseRes.status !== 200 && sseRes.status !== 402) {
    errorTrend.add(1);
  }

  check(sseRes, {
    'chat message sent': (r) => r.status === 200 || r.status === 402,
  });
}

function browseOperation(apiUrl, token) {
  const res = http.post(
    `${apiUrl}/persona_chat.character.v1.CharacterService/ListCharacters`,
    JSON.stringify({ pageSize: 20 }),
    {
      headers: authConnectHeaders(token),
      timeout: '10s',
    }
  );

  if (res.body) {
    memoryLeakIndicator.add(res.body.length);
  }

  if (res.status !== 200) {
    errorTrend.add(1);
  }

  check(res, {
    'browse characters': (r) => r.status === 200,
  });
}

function manageOperation(apiUrl, token) {
  const res = http.post(
    `${apiUrl}/persona_chat.gem.v1.GemService/GetWallet`,
    JSON.stringify({}),
    {
      headers: authConnectHeaders(token),
      timeout: '10s',
    }
  );

  if (res.body) {
    memoryLeakIndicator.add(res.body.length);
  }

  if (res.status !== 200) {
    errorTrend.add(1);
  }

  check(res, {
    'get wallet': (r) => r.status === 200,
  });
}

export function teardown(data) {
  console.log('\n✅ Soak test completed!');
  console.log('\n📊 Analysis:');
  console.log('  - Review error_trend over time');
  console.log('  - Check for memory leaks (response_size_trend)');
  console.log('  - Compare early vs late performance metrics');
  console.log('  - Verify connection pool stability');
  console.log('\nGreat job on running a 2-hour test! 🎉\n');
}
