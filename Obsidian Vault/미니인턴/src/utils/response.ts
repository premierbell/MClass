/**
 * Response Formatting Utilities
 * 
 * This module provides standardized functions for creating consistent
 * API responses across all controllers and endpoints.
 */

import { Response } from 'express';
import { 
  SuccessResponse, 
  ErrorResponse, 
  ValidationErrorResponse,
  PaginatedResponse,
  PaginationMeta,
  ValidationError,
  HttpStatusCode,
  ErrorCode,
  ResponseMetadata
} from '../types/responses';

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create response metadata
 */
function createMetadata(metadata?: Partial<ResponseMetadata>): { requestId: string; timestamp: string } {
  return {
    requestId: metadata?.requestId || generateRequestId(),
    timestamp: getCurrentTimestamp(),
    ...metadata
  };
}

/**
 * Send successful response with data
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: HttpStatusCode = HttpStatusCode.OK,
  metadata?: Partial<ResponseMetadata>
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...createMetadata(metadata),
    ...(message !== undefined && { message })
  };

  res.status(statusCode).json(response);
}

/**
 * Send successful response for resource creation
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string,
  metadata?: Partial<ResponseMetadata>
): void {
  sendSuccess(res, data, message, HttpStatusCode.CREATED, metadata);
}

/**
 * Send successful response with no content
 */
export function sendNoContent(
  res: Response,
  message?: string,
  metadata?: Partial<ResponseMetadata>
): void {
  const response = {
    success: true,
    message,
    ...createMetadata(metadata)
  };

  res.status(HttpStatusCode.NO_CONTENT).json(response);
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  items: T[],
  pagination: PaginationMeta,
  message?: string,
  metadata?: Partial<ResponseMetadata>
): void {
  const response: PaginatedResponse<T> = {
    success: true,
    data: {
      items,
      pagination
    },
    ...createMetadata(metadata),
    ...(message !== undefined && { message })
  };

  res.status(HttpStatusCode.OK).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
  details?: any,
  field?: string,
  metadata?: Partial<ResponseMetadata>
): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
      ...(field !== undefined && { field })
    },
    ...createMetadata(metadata)
  };

  res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  errors: ValidationError[],
  message: string = 'Validation failed',
  metadata?: Partial<ResponseMetadata>
): void {
  const response: ValidationErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      message,
      details: errors
    },
    ...createMetadata(metadata)
  };

  res.status(HttpStatusCode.BAD_REQUEST).json(response);
}

/**
 * Send bad request error
 */
export function sendBadRequest(
  res: Response,
  message: string,
  details?: any,
  metadata?: Partial<ResponseMetadata>
): void {
  sendError(res, ErrorCode.VALIDATION_ERROR, message, HttpStatusCode.BAD_REQUEST, details, undefined, metadata);
}

/**
 * Send unauthorized error
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Authentication required',
  metadata?: Partial<ResponseMetadata>
): void {
  sendError(res, ErrorCode.UNAUTHORIZED, message, HttpStatusCode.UNAUTHORIZED, undefined, undefined, metadata);
}

/**
 * Send forbidden error
 */
export function sendForbidden(
  res: Response,
  message: string = 'Access denied',
  metadata?: Partial<ResponseMetadata>
): void {
  sendError(res, ErrorCode.FORBIDDEN, message, HttpStatusCode.FORBIDDEN, undefined, undefined, metadata);
}

/**
 * Send not found error
 */
export function sendNotFound(
  res: Response,
  message: string = 'Resource not found',
  metadata?: Partial<ResponseMetadata>
): void {
  sendError(res, ErrorCode.NOT_FOUND, message, HttpStatusCode.NOT_FOUND, undefined, undefined, metadata);
}

/**
 * Send conflict error
 */
export function sendConflict(
  res: Response,
  message: string,
  details?: any,
  metadata?: Partial<ResponseMetadata>
): void {
  sendError(res, ErrorCode.CONFLICT, message, HttpStatusCode.CONFLICT, details, undefined, metadata);
}

/**
 * Send capacity exceeded error
 */
export function sendCapacityExceeded(
  res: Response,
  message: string = 'Capacity exceeded',
  metadata?: Partial<ResponseMetadata>
): void {
  sendError(res, ErrorCode.CAPACITY_EXCEEDED, message, HttpStatusCode.CONFLICT, undefined, undefined, metadata);
}

/**
 * Send too many requests error
 */
export function sendTooManyRequests(
  res: Response,
  message: string = 'Too many requests',
  retryAfter?: number,
  metadata?: Partial<ResponseMetadata>
): void {
  if (retryAfter) {
    res.set('Retry-After', retryAfter.toString());
  }
  
  sendError(res, ErrorCode.TOO_MANY_REQUESTS, message, HttpStatusCode.TOO_MANY_REQUESTS, { retryAfter }, undefined, metadata);
}

/**
 * Send internal server error
 */
export function sendInternalError(
  res: Response,
  message: string = 'Internal server error',
  details?: any,
  metadata?: Partial<ResponseMetadata>
): void {
  // In production, don't expose internal error details
  const exposedDetails = process.env.NODE_ENV === 'production' ? undefined : details;
  
  sendError(res, ErrorCode.INTERNAL_SERVER_ERROR, message, HttpStatusCode.INTERNAL_SERVER_ERROR, exposedDetails, undefined, metadata);
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Validate and normalize pagination parameters
 */
export function validatePagination(
  page?: string | number,
  limit?: string | number,
  maxLimit: number = 100
): { page: number; limit: number; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  // Parse and validate page
  let normalizedPage = 1;
  if (page !== undefined) {
    normalizedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(normalizedPage) || normalizedPage < 1) {
      errors.push({
        field: 'page',
        message: 'Page must be a positive integer',
        value: page
      });
      normalizedPage = 1;
    }
  }
  
  // Parse and validate limit
  let normalizedLimit = 10;
  if (limit !== undefined) {
    normalizedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (isNaN(normalizedLimit) || normalizedLimit < 1) {
      errors.push({
        field: 'limit',
        message: 'Limit must be a positive integer',
        value: limit
      });
      normalizedLimit = 10;
    } else if (normalizedLimit > maxLimit) {
      errors.push({
        field: 'limit',
        message: `Limit cannot exceed ${maxLimit}`,
        value: limit
      });
      normalizedLimit = maxLimit;
    }
  }
  
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    errors
  };
}

/**
 * Convert Express request to response metadata
 */
export function extractRequestMetadata(req: any): Partial<ResponseMetadata> {
  return {
    clientIp: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent')
  };
}