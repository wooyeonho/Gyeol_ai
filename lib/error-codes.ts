/**
 * API 에러 코드 - 클라이언트에서 번역 키로 매핑
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'errors.auth',
  INSUFFICIENT_COINS: 'market.insufficientCoins',
  PAYMENT_NOT_CONFIGURED: 'errors.paymentNotConfigured',
  CHECKOUT_FAILED: 'errors.checkoutFailed',
  PORTAL_FAILED: 'errors.portalFailed',
  INVITE_FAILED: 'errors.inviteFailed',
  NETWORK: 'errors.network',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
