/**
 * Test Authentication Helper
 * 
 * Utilities for creating test JWT tokens and handling authentication in tests.
 */

import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../src/types';

/**
 * Create test JWT token
 */
export function createTestToken(payload: Partial<JwtPayload>): string {
  const fullPayload: JwtPayload = {
    userId: payload.userId || 'test-user-id',
    email: payload.email || 'test@example.com',
    isAdmin: payload.isAdmin || false,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
    ...payload
  };

  return jwt.sign(fullPayload, process.env.JWT_SECRET || 'test-secret', {
    issuer: process.env.JWT_ISSUER || 'miniintern-mclass',
    audience: process.env.JWT_AUDIENCE || 'miniintern-users'
  });
}

/**
 * Create admin test token
 */
export function createAdminToken(userId: string = 'admin-test-id', email: string = 'admin@test.com'): string {
  return createTestToken({
    userId,
    email,
    isAdmin: true
  });
}

/**
 * Create regular user test token
 */
export function createUserToken(userId: string = 'user-test-id', email: string = 'user@test.com'): string {
  return createTestToken({
    userId,
    email,
    isAdmin: false
  });
}

/**
 * Create expired test token
 */
export function createExpiredToken(payload: Partial<JwtPayload>): string {
  const fullPayload: JwtPayload = {
    userId: payload.userId || 'test-user-id',
    email: payload.email || 'test@example.com',
    isAdmin: payload.isAdmin || false,
    iat: Math.floor(Date.now() / 1000) - (60 * 60 * 2), // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - (60 * 60), // 1 hour ago (expired)
    ...payload
  };

  return jwt.sign(fullPayload, process.env.JWT_SECRET || 'test-secret', {
    issuer: process.env.JWT_ISSUER || 'miniintern-mclass',
    audience: process.env.JWT_AUDIENCE || 'miniintern-users'
  });
}

/**
 * Get authorization header with Bearer token
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Create test user data for API requests
 */
export function createTestUserData(overrides: any = {}) {
  return {
    email: 'test@example.com',
    password: 'TestPassword123!',
    ...overrides
  };
}

/**
 * Create test class data for API requests
 */
export function createTestClassData(overrides: any = {}) {
  return {
    title: 'Test M-Class',
    description: 'A test class for testing purposes',
    maxParticipants: 10,
    startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    ...overrides
  };
}

/**
 * Wait for a specified amount of time (for testing async operations)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}