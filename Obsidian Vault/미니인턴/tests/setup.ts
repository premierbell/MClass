/**
 * Jest Test Setup
 * 
 * This file runs before all tests to set up the testing environment.
 */

import dotenv from 'dotenv';
import { initTestDatabase, disconnectTestDatabase } from './helpers/database';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Increase Jest timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
  
  // Initialize test database
  try {
    await initTestDatabase();
    console.log('✅ Test database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Disconnect from test database
  try {
    await disconnectTestDatabase();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Failed to disconnect test database:', error);
  }
  
  console.log('✅ Test suite completed');
});

// Mock console methods to reduce noise in tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}