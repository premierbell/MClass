/**
 * Standardized API Response Types and Interfaces
 * 
 * This file defines comprehensive response structures for consistent
 * API responses across all endpoints.
 */

// Standard HTTP status codes used in the application
export enum HttpStatusCode {
  // Success
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  
  // Client Error
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  
  // Server Error
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

// Standard error codes used throughout the application
export enum ErrorCode {
  // Authentication & Authorization
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_UUID = 'INVALID_UUID',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  
  // Business Logic
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CLASS_NOT_FOUND = 'CLASS_NOT_FOUND',
  ALREADY_APPLIED = 'ALREADY_APPLIED',
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED',
  DEADLINE_PASSED = 'DEADLINE_PASSED',
  CLASS_ALREADY_STARTED = 'CLASS_ALREADY_STARTED',
  
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // Rate Limiting
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS'
}

// Base response interface
export interface BaseResponse {
  success: boolean;
  timestamp: string;
  requestId?: string;
}

// Success response interface
export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  message?: string;
}

// Error response interface
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    field?: string;
  };
}

// Validation error response (multiple errors)
export interface ValidationErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: ErrorCode.VALIDATION_ERROR;
    message: string;
    details: ValidationError[];
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Paginated response
export interface PaginatedResponse<T> extends BaseResponse {
  success: true;
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
  message?: string;
}

// Health check response
export interface HealthCheckResponse extends BaseResponse {
  success: true;
  data: {
    status: 'healthy' | 'unhealthy';
    version: string;
    uptime: number;
    services: {
      database: 'connected' | 'disconnected' | 'error';
      [key: string]: string;
    };
  };
}

// Common API responses type union
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse | ValidationErrorResponse;

// Response metadata for tracking and debugging
export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  processTime?: number;
  clientIp?: string;
  userAgent?: string;
}