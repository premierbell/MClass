/**
 * Enhanced Logging and Monitoring System
 * 
 * This module provides comprehensive logging capabilities with structured
 * logging, correlation IDs, and multiple transport options.
 */

import winston from 'winston';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',  
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// Event types for security and application logging
export type EventType = 
  | 'AUTH_SUCCESS' 
  | 'AUTH_FAILURE' 
  | 'SIGNUP_SUCCESS' 
  | 'SIGNUP_FAILURE' 
  | 'RATE_LIMIT_EXCEEDED' 
  | 'VALIDATION_ERROR' 
  | 'UNAUTHORIZED_ACCESS' 
  | 'RESOURCE_CREATED' 
  | 'RESOURCE_CREATION_FAILURE' 
  | 'RESOURCE_DELETED' 
  | 'RESOURCE_DELETION_FAILURE' 
  | 'OPERATIONAL_ERROR' 
  | 'UNHANDLED_ERROR'
  | 'SYSTEM_ERROR'
  | 'PERFORMANCE_ISSUE'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_API_ERROR';

export interface LogEvent {
  type: EventType;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  message: string;
  details?: any;
  correlationId?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  path?: string;
}

// Winston logger configuration
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      correlationId,
      ...meta
    };
    return JSON.stringify(logEntry);
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Winston transports configuration
const transports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' 
      ? logFormat 
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  })
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 20,
      tailable: true
    }),
    
    // Security logs
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      format: logFormat,
      maxsize: 25 * 1024 * 1024, // 25MB
      maxFiles: 15,
      tailable: true
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports,
  // Exit on error
  exitOnError: false,
  // Prevent winston from exiting
  silent: process.env.NODE_ENV === 'test'
});

/**
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enhanced Application Logger
 */
export class AppLogger {
  private correlationId: string | undefined;

  constructor(correlationId?: string) {
    this.correlationId = correlationId;
  }

  private log(level: LogLevel, message: string, meta: any = {}) {
    logger.log(level, message, {
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...meta
    });
  }

  error(message: string, error?: Error | any, meta: any = {}): void {
    this.log(LogLevel.ERROR, message, {
      error: error?.message,
      stack: error?.stack,
      ...meta
    });
  }

  warn(message: string, meta: any = {}): void {
    this.log(LogLevel.WARN, message, meta);
  }

  info(message: string, meta: any = {}): void {
    this.log(LogLevel.INFO, message, meta);
  }

  http(message: string, meta: any = {}): void {
    this.log(LogLevel.HTTP, message, meta);
  }

  debug(message: string, meta: any = {}): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  // Performance logging
  performance(operation: string, duration: number, meta: any = {}): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation}`, {
      duration,
      slow: duration > 5000,
      ...meta
    });
  }

  // Database operation logging
  database(operation: string, duration: number, meta: any = {}): void {
    this.log(LogLevel.DEBUG, `Database: ${operation}`, {
      duration,
      ...meta
    });
  }

  // External API logging
  externalApi(service: string, method: string, statusCode: number, duration: number, meta: any = {}): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `External API: ${service} ${method}`, {
      statusCode,
      duration,
      ...meta
    });
  }
}

/**
 * Enhanced Security Logger
 */
export class EnhancedSecurityLogger {
  private static logEvent(level: LogLevel, event: LogEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: 'SECURITY',
      event: event.type,
      userId: event.userId || 'anonymous',
      email: event.email || 'unknown',
      ip: event.ip || 'unknown',
      userAgent: event.userAgent || 'unknown',
      message: event.message,
      details: event.details || {},
      correlationId: event.correlationId
    };

    logger.log(level, event.message, logEntry);

    // Additional alerting for critical security events
    if (level === LogLevel.ERROR && this.isCriticalSecurityEvent(event.type)) {
      // In production, this could trigger alerts to security team
      console.error(`🚨 CRITICAL SECURITY EVENT: ${event.type} - ${event.message}`);
    }
  }

  private static isCriticalSecurityEvent(type: EventType): boolean {
    const criticalEvents: EventType[] = [
      'UNAUTHORIZED_ACCESS',
      'AUTH_FAILURE',
      'RATE_LIMIT_EXCEEDED'
    ];
    return criticalEvents.includes(type);
  }

  static logSuccess(event: LogEvent): void {
    this.logEvent(LogLevel.INFO, event);
  }

  static logWarning(event: LogEvent): void {
    this.logEvent(LogLevel.WARN, event);
  }

  static logError(event: LogEvent): void {
    this.logEvent(LogLevel.ERROR, event);
  }

  // Audit trail logging
  static logAudit(action: string, userId: string, resource: string, details: any = {}): void {
    this.logEvent(LogLevel.INFO, {
      type: 'RESOURCE_CREATED',
      userId,
      message: `Audit: ${action} on ${resource}`,
      details: {
        action,
        resource,
        ...details
      }
    });
  }
}

/**
 * Request Logger Middleware Helper
 */
export function createRequestLogger(correlationId: string) {
  return new AppLogger(correlationId);
}

// Default logger instance
export const defaultLogger = new AppLogger();

export default AppLogger;