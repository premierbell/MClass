export interface SecurityEvent {
  type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'SIGNUP_SUCCESS' | 'SIGNUP_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'VALIDATION_ERROR' | 'UNAUTHORIZED_ACCESS' | 'RESOURCE_CREATED' | 'RESOURCE_CREATION_FAILURE' | 'RESOURCE_DELETED' | 'RESOURCE_DELETION_FAILURE' | 'OPERATIONAL_ERROR' | 'UNHANDLED_ERROR';
  userId?: string | undefined;
  email?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  message: string;
  details?: any;
}

export class SecurityLogger {
  private static logEvent(level: 'info' | 'warn' | 'error', event: SecurityEvent): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      event: event.type,
      userId: event.userId || 'anonymous',
      email: event.email || 'unknown',
      ip: event.ip || 'unknown',
      userAgent: event.userAgent || 'unknown',
      message: event.message,
      details: event.details || {}
    };

    // In production, this should go to a proper logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service (e.g., CloudWatch, Datadog, etc.)
      console.log(JSON.stringify(logEntry));
    } else {
      // Development logging
      const prefix = level === 'error' ? '🔴' : level === 'warn' ? '🟡' : '🟢';
      console.log(`${prefix} [SECURITY] ${timestamp} - ${event.type}: ${event.message}`);
      if (event.details) {
        console.log('   Details:', event.details);
      }
    }
  }

  static logSuccess(event: SecurityEvent): void {
    this.logEvent('info', event);
  }

  static logWarning(event: SecurityEvent): void {
    this.logEvent('warn', event);
  }

  static logError(event: SecurityEvent): void {
    this.logEvent('error', event);
  }

  static logAuthSuccess(email: string, userId: string, ip: string, userAgent: string): void {
    this.logSuccess({
      type: 'AUTH_SUCCESS',
      userId,
      email,
      ip,
      userAgent,
      message: 'User successfully authenticated'
    });
  }

  static logAuthFailure(email: string, ip: string, userAgent: string, reason: string): void {
    this.logWarning({
      type: 'AUTH_FAILURE',
      email,
      ip,
      userAgent,
      message: 'Authentication failed',
      details: { reason }
    });
  }

  static logSignupSuccess(email: string, userId: string, ip: string, userAgent: string): void {
    this.logSuccess({
      type: 'SIGNUP_SUCCESS',
      userId,
      email,
      ip,
      userAgent,
      message: 'User successfully registered'
    });
  }

  static logSignupFailure(email: string, ip: string, userAgent: string, reason: string): void {
    this.logWarning({
      type: 'SIGNUP_FAILURE',
      email,
      ip,
      userAgent,
      message: 'User registration failed',
      details: { reason }
    });
  }

  static logRateLimitExceeded(ip: string, userAgent: string, endpoint: string): void {
    this.logWarning({
      type: 'RATE_LIMIT_EXCEEDED',
      ip,
      userAgent,
      message: 'Rate limit exceeded',
      details: { endpoint }
    });
  }

  static logValidationError(ip: string, userAgent: string, endpoint: string, errors: string[]): void {
    this.logWarning({
      type: 'VALIDATION_ERROR',
      ip,
      userAgent,
      message: 'Validation error occurred',
      details: { endpoint, errors }
    });
  }

  static logUnauthorizedAccess(userId: string | undefined, ip: string, userAgent: string, endpoint: string): void {
    this.logError({
      type: 'UNAUTHORIZED_ACCESS',
      userId,
      ip,
      userAgent,
      message: 'Unauthorized access attempt',
      details: { endpoint }
    });
  }
}

export default SecurityLogger;