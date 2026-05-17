import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { config, fixtures } from '../utils/config.js';
import { authenticate, authJsonHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Load test users
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

export const options = {
  vus: 2,  // 5 → 2로 감소 (rate limiting 회피)
  duration: '30s',  // 1분 → 30초로 단축
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 1초 → 2초 (로컬 환경)
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.90'],
  },
};

export function setup() {
  const setupData = performSetup();

  // Verify we have test users
  if (testUsers.length === 0) {
    throw new Error('No test users found. Run "pnpm seed" first.');
  }

  console.log(`\n📝 Loaded ${testUsers.length} test users`);

  return setupData;
}

export default function (data) {
  // Select a test user (round-robin)
  const user = testUsers[__VU % testUsers.length];

  // Test 1: Login
  const token = authenticate(user.email, user.password);

  if (!token) {
    console.error(`Failed to authenticate ${user.email}`);
    return;
  }

  check(token, {
    'received valid token': (t) => t && t.length > 0,
  });

  // Test 2: Get user profile (verify token works)
  const profileRes = http.get(
    `${data.apiUrl}/auth/me`,
    { headers: authJsonHeaders(token) }
  );

  const profile = profileRes.json();

  check(profileRes, {
    'profile fetch successful': (r) => r.status === 200,
    'profile has email': () => profile?.email === user.email || profile?.data?.email === user.email,
    'profile has id': () => profile?.id !== undefined || profile?.data?.id !== undefined,
  });

  // Think time (longer to avoid rate limiting)
  sleep(Math.random() * 3 + 2);  // 2-5초 대기
}

export function teardown(data) {
  console.log('\n✅ Authentication flow smoke test completed');
}
