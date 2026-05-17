import http from 'k6/http';
import { check } from 'k6';
import { config } from './config.js';
import { authConnectHeaders } from './auth.js';

/**
 * Get user's Gem wallet balance
 * @param {string} token - JWT token
 * @returns {object|null} Wallet object with paid, freeDaily, freePromo or null
 */
export function getGemBalance(token) {
  const res = http.post(
    `${config.apiUrl}/persona_chat.gem.v1.GemService/GetWallet`,
    JSON.stringify({}),
    { headers: authConnectHeaders(token) }
  );

  const success = check(res, {
    'get wallet successful': (r) => r.status === 200,
  });

  if (!success) {
    console.error(`Failed to get gem balance: ${res.status} ${res.body}`);
    return null;
  }

  return res.json('wallet');
}

/**
 * Calculate total gems available
 * @param {object} wallet - Wallet object with paidGemAmount, freeDailyGemAmount, freePromoGemAmount
 * @returns {number} Total gems
 */
export function getTotalGems(wallet) {
  if (!wallet) return 0;
  return (wallet.paidGemAmount || 0) + (wallet.freeDailyGemAmount || 0) + (wallet.freePromoGemAmount || 0);
}

/**
 * Check if user has sufficient gems for a message
 * @param {object} wallet - Wallet object
 * @param {number} requiredGems - Required gems for the message
 * @returns {boolean} True if user has sufficient gems
 */
export function hasSufficientGems(wallet, requiredGems) {
  return getTotalGems(wallet) >= requiredGems;
}
