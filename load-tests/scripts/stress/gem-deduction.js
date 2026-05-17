import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { config, fixtures } from '../utils/config.js';
import { authenticate, authSseHeaders, authConnectHeaders } from '../utils/auth.js';
import { getGemBalance, getTotalGems } from '../utils/gems.js';
import { performSetup } from '../utils/setup.js';

// Custom metrics
const negativeBalanceErrors = new Counter('negative_balance_errors');
const gemDeductionConflicts = new Counter('gem_deduction_conflicts');
const successfulDeductions = new Counter('successful_deductions');

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open(fixtures.users));
});

const characters = new SharedArray('characters', function () {
  return JSON.parse(open(fixtures.characters));
});

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Sustained concurrent transactions
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'negative_balance_errors': ['count==0'],  // MUST be 0
    'http_req_failed': ['rate<0.02'],
  },
};

export function setup() {
  const setupData = performSetup();

  if (testUsers.length === 0 || characters.length === 0) {
    throw new Error('Test data not found. Run "pnpm setup" first.');
  }

  console.log('\n💎 GEM DEDUCTION CONCURRENCY TEST 💎');
  console.log('Testing atomic gem transactions under load\n');
  console.log('⚠️  CRITICAL: negative_balance_errors MUST be 0\n');

  return setupData;
}

export default function (data) {
  const { apiUrl } = data;

  // Each VU uses dedicated test user for isolated gem wallet
  const user = testUsers[__VU % testUsers.length];
  const character = characters[__VU % characters.length];

  // Authenticate
  const token = authenticate(user.email, user.password);
  if (!token) {
    return;
  }

  // Get initial gem balance
  const initialWallet = getGemBalance(token);
  const initialTotal = getTotalGems(initialWallet);

  if (initialTotal < 10) {
    console.warn(`User ${user.email} has insufficient gems (${initialTotal}), skipping`);
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
    }
  );

  if (roomRes.status !== 200 && roomRes.status !== 201) {
    return;
  }

  const roomId = roomRes.json('id');

  // Send message (triggers gem deduction)
  const sseRes = http.post(
    `${apiUrl}/chat-rooms/${roomId}/messages`,
    JSON.stringify({ content: 'Gem 차감 테스트 메시지' }),
    {
      headers: authSseHeaders(token),
      responseType: 'text',
      timeout: '60s',
    }
  );

  if (sseRes.status === 200) {
    successfulDeductions.add(1);

    // Verify gem balance decreased
    sleep(1); // Wait for transaction to complete

    const finalWallet = getGemBalance(token);
    const finalTotal = getTotalGems(finalWallet);

    // Check for negative balance (CRITICAL BUG)
    if (finalWallet && (
      finalWallet.paidGemAmount < 0 ||
      finalWallet.freeDailyGemAmount < 0 ||
      finalWallet.freePromoGemAmount < 0
    )) {
      negativeBalanceErrors.add(1);
      console.error(`❌ NEGATIVE BALANCE: ${user.email}`, finalWallet);
    }

    // Verify deduction happened
    const expectedDeduction = 5; // Assuming cheapest model
    const actualDeduction = initialTotal - finalTotal;

    check({ actualDeduction }, {
      'gems deducted correctly': (d) => d.actualDeduction >= expectedDeduction,
      'no negative balance': () =>
        finalWallet.paidGemAmount >= 0 &&
        finalWallet.freeDailyGemAmount >= 0 &&
        finalWallet.freePromoGemAmount >= 0,
    });
  } else if (sseRes.status === 402) {
    // Insufficient gems - expected when depleted
    check(sseRes, {
      'correct insufficient gems error': (r) => r.status === 402,
    });
  } else if (sseRes.status === 409) {
    // Transaction conflict - track but might be acceptable under high load
    gemDeductionConflicts.add(1);
  }

  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('\n✅ Gem deduction concurrency test completed');
  console.log('\n🔍 Verification:');
  console.log('  - negative_balance_errors MUST be 0');
  console.log('  - Check for transaction conflicts');
  console.log('  - Verify atomic gem deductions\n');
}
