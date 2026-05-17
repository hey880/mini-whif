import http from 'k6/http';
import { check } from 'k6';
import { config, headers } from './config.js';

/**
 * Authenticate a user and return JWT token
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string|null} JWT token or null if authentication failed
 */
export function authenticate(email, password) {
  const payload = JSON.stringify({
    email,
    password,
  });

  const res = http.post(
    `${config.apiUrl}/auth/login`,
    payload,
    { headers: headers.json }
  );

  const body = res.json();
  const token = body?.data?.session?.access_token;

  const success = check(res, {
    'authentication successful': (r) => r.status === 200,
    'received token': () => token !== undefined,
  });

  if (!success) {
    console.error(`Authentication failed for ${email}: ${res.status}`);
    return null;
  }

  return token;
}

/**
 * Get authorization header with Bearer token
 * @param {string} token - JWT token
 * @returns {object} Authorization header object
 */
export function authHeader(token) {
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Get authenticated headers for JSON requests
 * @param {string} token - JWT token
 * @returns {object} Headers object with auth and content-type
 */
export function authJsonHeaders(token) {
  return {
    ...headers.json,
    ...authHeader(token),
  };
}

/**
 * Get authenticated headers for SSE requests
 * @param {string} token - JWT token
 * @returns {object} Headers object with auth and SSE headers
 */
export function authSseHeaders(token) {
  return {
    ...headers.sse,
    ...authHeader(token),
  };
}

/**
 * Get authenticated headers for ConnectRPC requests
 * @param {string} token - JWT token
 * @returns {object} Headers object with auth and ConnectRPC headers
 */
export function authConnectHeaders(token) {
  return {
    ...headers.connectRpc,
    ...authHeader(token),
  };
}
