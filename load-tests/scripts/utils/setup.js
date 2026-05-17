import http from 'k6/http';
import { check } from 'k6';
import { config } from './config.js';

/**
 * Verify API health before running tests
 * @returns {boolean} True if API is healthy
 */
export function verifyApiHealth() {
  const res = http.get(`${config.apiUrl}/health`);

  const healthy = check(res, {
    'API is healthy': (r) => r.status === 200,
  });

  if (!healthy) {
    console.error(`API health check failed: ${res.status}`);
  }

  return healthy;
}

/**
 * Verify AI server health (optional)
 * @returns {boolean} True if AI server is healthy
 */
export function verifyAiServerHealth() {
  try {
    const res = http.get(`${config.aiServerUrl}/health`, {
      timeout: '5s',
    });

    const healthy = check(res, {
      'AI server is healthy': (r) => r.status === 200,
    });

    if (!healthy) {
      console.warn(`AI server health check failed: ${res.status}`);
      console.warn('Tests will continue using mock AI responses');
    }

    return healthy;
  } catch (error) {
    console.warn('AI server not available - using mock responses');
    return false;
  }
}

/**
 * Setup function to run before all tests
 * @returns {object} Setup data to pass to tests
 */
export function performSetup() {
  console.log('🔍 Verifying test environment...\n');

  const apiHealthy = verifyApiHealth();
  const aiHealthy = verifyAiServerHealth();

  if (!apiHealthy) {
    throw new Error('API server is not healthy. Please start the API server before running tests.');
  }

  console.log(`✅ API server is healthy`);
  if (aiHealthy) {
    console.log(`✅ AI server is healthy`);
  } else {
    console.log(`⚠️  AI server unavailable - using mock responses`);
  }

  return {
    apiUrl: config.apiUrl,
    aiServerUrl: config.aiServerUrl,
    apiHealthy,
    aiHealthy,
  };
}
