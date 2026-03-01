export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_COINS: 'INSUFFICIENT_COINS',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TIER_LIMIT_EXCEEDED: 'TIER_LIMIT_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): { code: ErrorCode; message: string; statusCode: number } {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    statusCode: 500,
  };
}
