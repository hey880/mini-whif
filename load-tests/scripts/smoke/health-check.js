import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from '../utils/config.js';
import { performSetup, verifyApiHealth, verifyAiServerHealth } from '../utils/setup.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  return performSetup();
}

export default function (data) {
  // Test API health endpoint
  const apiRes = http.get(`${data.apiUrl}/health`);
  check(apiRes, {
    'API health check status 200': (r) => r.status === 200,
    'API health response': (r) => r.body.length > 0,
  });

  // Test AI server health endpoint (if available)
  try {
    const aiRes = http.get(`${data.aiServerUrl}/health`, {
      timeout: '5s',
    });
    check(aiRes, {
      'AI server health check status 200': (r) => r.status === 200,
    });
  } catch (error) {
    console.log('AI server not available (expected if using mock mode)');
  }

  sleep(1);
}

export function teardown(data) {
  console.log('\n✅ Health check smoke test completed');
}
