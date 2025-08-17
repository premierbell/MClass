import rateLimit from 'express-rate-limit';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per window
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Very strict rate limiter for signup endpoints
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signup attempts per hour
  message: {
    success: false,
    error: {
      code: 'SIGNUP_RATE_LIMIT_EXCEEDED',
      message: 'Too many signup attempts, please try again later'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Moderate rate limiter for password reset attempts
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset attempts per hour
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts, please try again later'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for admin operations
export const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes
  message: {
    success: false,
    error: {
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      message: 'Too many admin operations, please slow down'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});