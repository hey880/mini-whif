// Environment configuration for k6 tests
export const config = {
  apiUrl: __ENV.API_URL || 'http://localhost:3000',
  aiServerUrl: __ENV.AI_SERVER_URL || 'http://localhost:8000',
  supabaseUrl: __ENV.SUPABASE_URL || '',
  supabaseAnonKey: __ENV.SUPABASE_ANON_KEY || '',
};

// Test data paths
export const fixtures = {
  users: '../../fixtures/test-users.json',
  characters: '../../fixtures/characters.json',
};

// Common HTTP headers
export const headers = {
  json: {
    'Content-Type': 'application/json',
  },
  sse: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  connectRpc: {
    'Content-Type': 'application/json',
    'Connect-Protocol-Version': '1',
  },
};

// Test configuration
export const testConfig = {
  thinkTimeMin: 15, // seconds (증가: rate limit 회피)
  thinkTimeMax: 45, // seconds (증가: rate limit 회피)
  messagesPerSession: 3, // 5 → 3 (메시지 수 감소)
  maxMessagesPerIteration: 5, // 10 → 5 (메시지 수 감소)
};
