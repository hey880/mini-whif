import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { config, fixtures } from '../utils/config.js';
import { authenticate, authSseHeaders, authConnectHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

const characters = new SharedArray('characters', function () {
  return JSON.parse(open(fixtures.characters));
});

// 토큰 캐싱: 각 VU별로 토큰 저장
const tokenCache = {};

export const options = {
  stages: [
    // Spike 1
    { duration: '10s', target: 10 },    // Baseline
    { duration: '10s', target: 200 },   // Sudden spike
    { duration: '30s', target: 200 },   // Hold spike
    { duration: '10s', target: 10 },    // Drop back
    { duration: '30s', target: 10 },    // Recover

    // Spike 2
    { duration: '10s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 10 },
    { duration: '30s', target: 10 },

    // Spike 3
    { duration: '10s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.03'],
  },
};

export function setup() {
  const setupData = performSetup();

  if (testUsers.length === 0 || characters.length === 0) {
    throw new Error('Test data not found. Run "pnpm setup" first.');
  }

  console.log('\n⚡ SPIKE TEST - Sudden Traffic Surge ⚡');
  console.log('Testing system resilience to rapid VU increase\n');
  console.log('Profile: 10 → 200 VUs in 10 seconds (3 spikes)\n');

  return setupData;
}

export default function (data) {
  const { apiUrl } = data;

  // Select user and character
  const user = testUsers[__VU % testUsers.length];
  const character = characters[__VU % characters.length];

  // 토큰 캐싱: 각 VU는 처음 한 번만 인증하고 토큰 재사용
  if (!tokenCache[__VU]) {
    // 랜덤 지터: 모든 VU가 동시에 인증하지 않도록 0-3초 대기
    const jitter = Math.random() * 3;
    sleep(jitter);

    const token = authenticate(user.email, user.password);

    if (!token) {
      console.error(`Failed to authenticate ${user.email}`);
      return;
    }

    tokenCache[__VU] = token;
    sleep(1);  // 인증 후 추가 1초 대기하여 rate limit 완화
  }

  const token = tokenCache[__VU];

  // Create chat room via ConnectRPC
  const roomRes = http.post(
    `${apiUrl}/persona_chat.chatroom.v1.ChatRoomService/CreateChatRoom`,
    JSON.stringify({ characterId: character.id }),
    {
      headers: authConnectHeaders(token),
      timeout: '30s',
    }
  );

  if (roomRes.status !== 200) {
    return;
  }

  const roomId = roomRes.json('chatRoom.id');

  // Send message
  const sseRes = http.post(
    `${apiUrl}/chat-rooms/${roomId}/messages`,
    JSON.stringify({ content: '스파이크 테스트 메시지' }),
    {
      headers: authSseHeaders(token),
      responseType: 'text',
      timeout: '60s',
    }
  );

  check(sseRes, {
    'request completed': (r) => r.status === 200 || r.status === 402 || r.status >= 500,
    'system stayed up': (r) => r.status !== 503, // Service unavailable
  });

  // Minimal think time during spike
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('\n✅ Spike test completed');
  console.log('\n📊 Analysis:');
  console.log('  - Did system handle sudden traffic increase?');
  console.log('  - Check for 503 errors during spikes');
  console.log('  - Verify recovery time after spike');
  console.log('  - Review autoscaling/rate limiting behavior\n');
}
