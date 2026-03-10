/**
 * Stripe 클라이언트 (서버 전용)
 * STRIPE_SECRET_KEY 미설정 시 null - API에서 503 반환
 */

import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
export const stripe = secretKey
  ? new Stripe(secretKey, { typescript: true })
  : null;

export const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO || '';
export const STRIPE_PRICE_PREMIUM = process.env.STRIPE_PRICE_PREMIUM || '';
export const STRIPE_PRICE_COINS: Record<string, string> = {
  '100': process.env.STRIPE_PRICE_COINS_100 || '',
  '500': process.env.STRIPE_PRICE_COINS_500 || '',
  '1000': process.env.STRIPE_PRICE_COINS_1000 || '',
};
