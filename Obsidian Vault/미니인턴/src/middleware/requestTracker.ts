/**
 * Request Tracking Middleware
 * 
 * This middleware adds correlation IDs and request tracking capabilities
 * to all incoming requests for better debugging and monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { generateCorrelationId, createRequestLogger } from '../utils/enhancedLogger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      logger: ReturnType<typeof createRequestLogger>;
      startTime: number;
    }
  }
}

/**
 * Request tracking middleware
 */
export function requestTracker(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract correlation ID
  req.correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
  
  // Set correlation ID in response headers
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Create request-scoped logger
  req.logger = createRequestLogger(req.correlationId);
  
  // Track request start time
  req.startTime = Date.now();
  
  // Log incoming request
  req.logger.http('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.userId
  });
  
  // Hook into response finish event
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    
    // Log response
    req.logger.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      userId: (req as any).user?.userId,
      success: statusCode < 400
    });
    
    // Log performance warnings for slow requests
    if (duration > 5000) {
      req.logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        statusCode
      });
    }
  });
  
  next();
}

/**
 * Request metrics collection middleware
 */
export function requestMetrics(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  
  // Override res.json to capture response size
  res.json = function(obj: any) {
    const responseSize = JSON.stringify(obj).length;
    
    // Log metrics
    req.logger.debug('Response metrics', {
      responseSize,
      contentType: res.get('Content-Type')
    });
    
    return originalJson.call(this, obj);
  };
  
  next();
}

export default requestTracker;