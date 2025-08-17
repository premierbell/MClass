/**
 * Global Error Handling Middleware
 * 
 * This middleware catches all unhandled errors and provides consistent
 * error responses across the application.
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { 
  sendError, 
  sendInternalError,
  extractRequestMetadata 
} from '../utils/response';
import { ErrorCode, HttpStatusCode } from '../types/responses';
import SecurityLogger from '../utils/logger';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Check if error is a known operational error
 */
function isOperationalError(error: Error): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: HttpStatusCode;
  errorCode: ErrorCode;
  message: string;
  details?: any;
} {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      return {
        statusCode: HttpStatusCode.CONFLICT,
        errorCode: field === 'email' ? ErrorCode.DUPLICATE_EMAIL : ErrorCode.CONFLICT,
        message: `${field} already exists`,
        details: { field, value: error.meta?.target }
      };

    case 'P2025':
      // Record not found
      return {
        statusCode: HttpStatusCode.NOT_FOUND,
        errorCode: ErrorCode.NOT_FOUND,
        message: 'Resource not found'
      };

    case 'P2003':
      // Foreign key constraint violation
      return {
        statusCode: HttpStatusCode.BAD_REQUEST,
        errorCode: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid reference to related resource',
        details: { field: error.meta?.field_name }
      };

    case 'P2014':
      // Relation violation
      return {
        statusCode: HttpStatusCode.BAD_REQUEST,
        errorCode: ErrorCode.VALIDATION_ERROR,
        message: 'Operation violates data integrity constraints'
      };

    case 'P2016':
      // Query interpretation error
      return {
        statusCode: HttpStatusCode.BAD_REQUEST,
        errorCode: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid query parameters'
      };

    default:
      return {
        statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        details: process.env.NODE_ENV === 'development' ? { code: error.code, meta: error.meta } : undefined
      };
  }
}

/**
 * Handle JWT authentication errors
 */
function handleJWTError(error: JsonWebTokenError | TokenExpiredError): {
  statusCode: HttpStatusCode;
  errorCode: ErrorCode;
  message: string;
} {
  if (error instanceof TokenExpiredError) {
    return {
      statusCode: HttpStatusCode.UNAUTHORIZED,
      errorCode: ErrorCode.TOKEN_EXPIRED,
      message: 'Token has expired'
    };
  }

  return {
    statusCode: HttpStatusCode.UNAUTHORIZED,
    errorCode: ErrorCode.TOKEN_INVALID,
    message: 'Invalid token'
  };
}

/**
 * Handle validation errors
 */
function handleValidationError(error: any): {
  statusCode: HttpStatusCode;
  errorCode: ErrorCode;
  message: string;
  details?: any;
} {
  if (error.name === 'ValidationError' && error.errors) {
    // Mongoose-style validation error
    const validationErrors = Object.values(error.errors).map((err: any) => ({
      field: err.path || err.field,
      message: err.message,
      value: err.value
    }));

    return {
      statusCode: HttpStatusCode.BAD_REQUEST,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details: validationErrors
    };
  }

  return {
    statusCode: HttpStatusCode.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
    message: error.message || 'Validation failed'
  };
}

/**
 * Log error for monitoring and debugging
 */
function logError(error: Error, req: Request): void {
  if (isOperationalError(error)) {
    // Log operational errors as warnings
    SecurityLogger.logWarning({
      type: 'OPERATIONAL_ERROR',
      userId: (req as any).user?.userId || 'anonymous',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      message: `Operational error: ${error.message}`,
      details: {
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        path: req.path,
        method: req.method,
        ...error.details
      }
    });
  } else {
    // Log unexpected errors as errors
    SecurityLogger.logError({
      type: 'UNHANDLED_ERROR',
      userId: (req as any).user?.userId || 'anonymous',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      message: `Unhandled error: ${error.message}`,
      details: {
        name: error.name,
        stack: error.stack,
        path: req.path,
        method: req.method
      }
    });
  }

  // Also log to console for development
  if (process.env.NODE_ENV === 'development') {
    console.error('\n🚨 Error Details:');
    console.error('Message:', error.message);
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Stack:', error.stack);
    console.error('---\n');
  }
}

/**
 * Global error handling middleware
 * This must be the last middleware in the application
 */
export function globalErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response has already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(error);
  }

  // Log the error
  logError(error, req);

  const metadata = extractRequestMetadata(req);

  // Handle known operational errors
  if (isOperationalError(error)) {
    sendError(
      res,
      error.errorCode,
      error.message,
      error.statusCode,
      error.details,
      undefined,
      metadata
    );
    return;
  }

  // Handle Prisma database errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const { statusCode, errorCode, message, details } = handlePrismaError(error);
    sendError(res, errorCode, message, statusCode, details, undefined, metadata);
    return;
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    sendError(
      res,
      ErrorCode.VALIDATION_ERROR,
      'Invalid database operation',
      HttpStatusCode.BAD_REQUEST,
      process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined,
      undefined,
      metadata
    );
    return;
  }

  // Handle JWT errors
  if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    const { statusCode, errorCode, message } = handleJWTError(error);
    sendError(res, errorCode, message, statusCode, undefined, undefined, metadata);
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    const { statusCode, errorCode, message, details } = handleValidationError(error);
    sendError(res, errorCode, message, statusCode, details, undefined, metadata);
    return;
  }

  // Handle SyntaxError (usually JSON parsing errors)
  if (error instanceof SyntaxError && 'body' in error) {
    sendError(
      res,
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      HttpStatusCode.BAD_REQUEST,
      undefined,
      undefined,
      metadata
    );
    return;
  }

  // Handle generic errors with specific patterns
  if (error.message.includes('rate limit')) {
    sendError(
      res,
      ErrorCode.TOO_MANY_REQUESTS,
      'Rate limit exceeded',
      HttpStatusCode.TOO_MANY_REQUESTS,
      undefined,
      undefined,
      metadata
    );
    return;
  }

  // Default to internal server error for unknown errors
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong'
    : error.message;

  const details = process.env.NODE_ENV === 'development'
    ? { originalError: error.message, stack: error.stack }
    : undefined;

  sendInternalError(res, message, details, metadata);
}

/**
 * Async error wrapper utility
 * Wraps async route handlers to automatically catch errors
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create application error utility functions
 */
export const createError = {
  badRequest: (message: string, details?: any) => 
    new AppError(message, HttpStatusCode.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, true, details),
  
  unauthorized: (message: string = 'Authentication required') => 
    new AppError(message, HttpStatusCode.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, true),
  
  forbidden: (message: string = 'Access denied') => 
    new AppError(message, HttpStatusCode.FORBIDDEN, ErrorCode.FORBIDDEN, true),
  
  notFound: (message: string = 'Resource not found') => 
    new AppError(message, HttpStatusCode.NOT_FOUND, ErrorCode.NOT_FOUND, true),
  
  conflict: (message: string, details?: any) => 
    new AppError(message, HttpStatusCode.CONFLICT, ErrorCode.CONFLICT, true, details),
  
  capacityExceeded: (message: string = 'Capacity exceeded') => 
    new AppError(message, HttpStatusCode.CONFLICT, ErrorCode.CAPACITY_EXCEEDED, true),
  
  tooManyRequests: (message: string = 'Too many requests') => 
    new AppError(message, HttpStatusCode.TOO_MANY_REQUESTS, ErrorCode.TOO_MANY_REQUESTS, true),
  
  internal: (message: string = 'Internal server error', details?: any) => 
    new AppError(message, HttpStatusCode.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, false, details)
};

export default globalErrorHandler;