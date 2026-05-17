import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { config, fixtures } from '../utils/config.js';
import { authenticate, authConnectHeaders } from '../utils/auth.js';
import { performSetup } from '../utils/setup.js';

// Custom metrics for ConnectRPC
const rpcLatency = new Trend('rpc_latency', true);

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

export const options = {
  stages: [
    { duration: '2m', target: 5 },    // Ramp up to 5 VUs (로컬 환경 최적화)
    { duration: '10m', target: 5 },   // Stay at 5 VUs
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // 로컬 환경용 임계값 (스테이징: 200ms)
    'rpc_latency': ['p(95)<1500'],  // 로컬: 1.5초
    'http_req_duration{type:rpc}': ['p(95)<1500'],
    'http_req_failed': ['rate<0.01'],  // 1% 미만
  },
};

// VU별 토큰 캐시 (인증을 매 iteration마다 하지 않고 재사용)
const tokenCache = {};

export function setup() {
  const setupData = performSetup();

  if (testUsers.length === 0) {
    throw new Error('No test users found. Run "pnpm setup" first.');
  }

  console.log(`\n📝 Loaded ${testUsers.length} test users\n`);

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

  // Test different ConnectRPC services
  const tests = [
    () => testListCharacters(apiUrl, token),
    () => testGetCharacter(apiUrl, token),
    () => testListChatRooms(apiUrl, token),
    () => testListPersonas(apiUrl, token),
    // testGetWallet 제거: GemService RPC 핸들러가 구현되지 않음
  ];

  // Randomly select 2-3 operations per iteration
  const numTests = Math.floor(Math.random() * 2) + 2;
  for (let i = 0; i < numTests; i++) {
    const test = tests[Math.floor(Math.random() * tests.length)];
    test();
    sleep(Math.random() * 8 + 7);  // 7-15초 대기 (서버 부하 감소)
  }
}

function testListCharacters(apiUrl, token) {
  const startTime = Date.now();

  const res = http.post(
    `${apiUrl}/persona_chat.character.v1.CharacterService/ListCharacters`,
    JSON.stringify({
      pageSize: 20,
      cursor: '',
    }),
    {
      headers: authConnectHeaders(token),
      tags: { type: 'rpc', service: 'character' },
    }
  );

  rpcLatency.add(Date.now() - startTime);

  check(res, {
    'ListCharacters success': (r) => r.status === 200,
    'ListCharacters has characters': (r) => {
      if (r.status !== 200 || !r.body) return false;
      try {
        const body = r.json();
        return body.characters && Array.isArray(body.characters);
      } catch (e) {
        return false;
      }
    },
  });
}

function testGetCharacter(apiUrl, token) {
  // First get a character ID from list
  const listRes = http.post(
    `${apiUrl}/persona_chat.character.v1.CharacterService/ListCharacters`,
    JSON.stringify({ pageSize: 1 }),
    { headers: authConnectHeaders(token) }
  );

  if (listRes.status !== 200) {
    return;
  }

  const characters = listRes.json('characters');
  if (!characters || characters.length === 0) {
    return;
  }

  const characterId = characters[0].id;
  const startTime = Date.now();

  const res = http.post(
    `${apiUrl}/persona_chat.character.v1.CharacterService/GetCharacter`,
    JSON.stringify({ id: characterId }),
    {
      headers: authConnectHeaders(token),
      tags: { type: 'rpc', service: 'character' },
    }
  );

  rpcLatency.add(Date.now() - startTime);

  check(res, {
    'GetCharacter success': (r) => r.status === 200,
    'GetCharacter has character': (r) => {
      if (r.status !== 200 || !r.body) return false;
      try {
        return r.json('character') !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
}

function testListChatRooms(apiUrl, token) {
  const startTime = Date.now();

  const res = http.post(
    `${apiUrl}/persona_chat.chatroom.v1.ChatRoomService/ListChatRooms`,
    JSON.stringify({
      pageSize: 20,
      cursor: '',
    }),
    {
      headers: authConnectHeaders(token),
      tags: { type: 'rpc', service: 'chatroom' },
    }
  );

  rpcLatency.add(Date.now() - startTime);

  check(res, {
    'ListChatRooms success': (r) => r.status === 200,
    'ListChatRooms has rooms': (r) => {
      if (r.status !== 200 || !r.body) return false;
      try {
        const body = r.json();
        return body.chatRooms !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
}

function testGetWallet(apiUrl, token) {
  const startTime = Date.now();

  const res = http.post(
    `${apiUrl}/persona_chat.gem.v1.GemService/GetWallet`,
    JSON.stringify({}),
    {
      headers: authConnectHeaders(token),
      tags: { type: 'rpc', service: 'gem' },
    }
  );

  rpcLatency.add(Date.now() - startTime);

  check(res, {
    'GetWallet success': (r) => r.status === 200,
    'GetWallet has balance': (r) => {
      const wallet = r.json('wallet');
      return wallet && (wallet.paid !== undefined || wallet.freeDaily !== undefined);
    },
  });
}

function testListPersonas(apiUrl, token) {
  const startTime = Date.now();

  const res = http.post(
    `${apiUrl}/persona_chat.persona.v1.PersonaService/ListPersonas`,
    JSON.stringify({}),  // ListPersonasRequest는 빈 메시지
    {
      headers: authConnectHeaders(token),
      tags: { type: 'rpc', service: 'persona' },
    }
  );

  rpcLatency.add(Date.now() - startTime);

  check(res, {
    'ListPersonas success': (r) => r.status === 200,
    'ListPersonas valid response': (r) => {
      if (r.status !== 200 || !r.body) return false;
      try {
        const body = r.json();
        // proto3는 빈 배열을 생략함: {} 또는 { personas: [...] } 모두 유효
        return body.personas === undefined || Array.isArray(body.personas);
      } catch (e) {
        return false;
      }
    },
  });
}

export function teardown(data) {
  console.log('\n✅ ConnectRPC load test completed');
}
