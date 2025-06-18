
/**
 * Standardized error handling utilities
 * Provides consistent error types and handling patterns across the application
 */

import { logger } from './logging';

export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  DATABASE = 'database',
  CONFIG = 'config',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  originalError?: Error;
  context?: Record<string, any>;
}

export class StandardError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly context?: Record<string, any>;

  constructor(type: ErrorType, message: string, code?: string, context?: Record<string, any>) {
    super(message);
    this.name = 'StandardError';
    this.type = type;
    this.code = code;
    this.context = context;
  }
}

export function createError(
  type: ErrorType,
  message: string,
  code?: string,
  context?: Record<string, any>
): AppError {
  return {
    type,
    message,
    code,
    context
  };
}

export function handleError(
  error: Error | AppError | unknown,
  module: string,
  context?: Record<string, any>
): AppError {
  let appError: AppError;

  if (error instanceof StandardError) {
    appError = {
      type: error.type,
      message: error.message,
      code: error.code,
      context: { ...error.context, ...context }
    };
  } else if (error instanceof Error) {
    appError = {
      type: determineErrorType(error.message),
      message: error.message,
      originalError: error,
      context
    };
  } else if (typeof error === 'object' && error !== null && 'type' in error) {
    appError = error as AppError;
  } else {
    appError = {
      type: ErrorType.UNKNOWN,
      message: String(error),
      context
    };
  }

  logger.error(`Error in ${module}`, appError, { module });
  return appError;
}

function determineErrorType(message: string): ErrorType {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout')) {
    return ErrorType.NETWORK;
  }
  if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
    return ErrorType.AUTH;
  }
  if (lowerMessage.includes('database') || lowerMessage.includes('sql') || lowerMessage.includes('table')) {
    return ErrorType.DATABASE;
  }
  if (lowerMessage.includes('config') || lowerMessage.includes('settings') || lowerMessage.includes('invalid format')) {
    return ErrorType.CONFIG;
  }
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return ErrorType.VALIDATION;
  }
  
  return ErrorType.UNKNOWN;
}

export function isRetryableError(error: AppError): boolean {
  return error.type === ErrorType.NETWORK || 
         (error.type === ErrorType.DATABASE && !error.code?.includes('permission'));
}
