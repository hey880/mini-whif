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
    { duration: '2m', target: 15 },   // Ramp up to 15 VUs (rate limit 더 회피)
    { duration: '10m', target: 15 },  // Stay at 15 VUs
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'rpc_latency': ['p(95)<200'],
    'http_req_duration{type:rpc}': ['p(95)<200'],
    'http_req_failed': ['rate<0.005'],
  },
};

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

  // Authenticate
  const token = authenticate(user.email, user.password);

  if (!token) {
    console.error(`Failed to authenticate ${user.email}`);
    return;
  }

  // Test different ConnectRPC services
  const tests = [
    () => testListCharacters(apiUrl, token),
    () => testGetCharacter(apiUrl, token),
    () => testListChatRooms(apiUrl, token),
    () => testGetWallet(apiUrl, token),
    () => testListPersonas(apiUrl, token),
  ];

  // Randomly select 2-3 operations per iteration
  const numTests = Math.floor(Math.random() * 2) + 2;
  for (let i = 0; i < numTests; i++) {
    const test = tests[Math.floor(Math.random() * tests.length)];
    test();
    sleep(Math.random() * 3 + 2);  // 2-5초 대기 (rate limit 회피)
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
      const body = r.json();
      return body.characters && Array.isArray(body.characters);
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
    'GetCharacter has character': (r) => r.json('character') !== undefined,
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
      const body = r.json();
      return body.chatRooms !== undefined;
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
    JSON.stringify({
      pageSize: 20,
      cursor: '',
    }),
    {
      headers: authConnectHeaders(token),
      tags: { type: 'rpc', service: 'persona' },
    }
  );

  rpcLatency.add(Date.now() - startTime);

  check(res, {
    'ListPersonas success': (r) => r.status === 200,
    'ListPersonas has personas': (r) => {
      const body = r.json();
      return body.personas !== undefined;
    },
  });
}

export function teardown(data) {
  console.log('\n✅ ConnectRPC load test completed');
}
