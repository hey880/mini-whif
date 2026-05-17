import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { config, fixtures } from '../utils/config.js';
import { authenticate, authSseHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

const characters = new SharedArray('characters', function () {
  return JSON.parse(open(fixtures.characters));
});

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
    return;
  }

  const roomId = roomRes.json('id');

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
