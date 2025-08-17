/**
 * Test Database Helper
 * 
 * Utilities for setting up and managing the test database.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

let prisma: PrismaClient;

/**
 * Initialize test database
 */
export async function initTestDatabase(): Promise<PrismaClient> {
  if (prisma) {
    return prisma;
  }

  // Ensure we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test database should only be used in test environment');
  }

  // Create new Prisma client for testing
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for testing');
  }

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  // Push the schema to test database
  try {
    execSync('npx prisma db push --force-reset', { 
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }

  await prisma.$connect();
  return prisma;
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (!prisma) return;

  try {
    // Clean up all tables in reverse dependency order
    await prisma.application.deleteMany();
    await prisma.mClass.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
}

/**
 * Reset test database
 */
export async function resetTestDatabase(): Promise<void> {
  if (!prisma) return;

  await cleanupTestDatabase();
}

/**
 * Disconnect from test database
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }

  // Remove test database file if it exists
  const testDbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (error) {
      // Ignore errors when deleting test database file
    }
  }
}

/**
 * Get test database client
 */
export function getTestDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error('Test database not initialized. Call initTestDatabase() first.');
  }
  return prisma;
}

/**
 * Execute raw SQL in test database
 */
export async function executeRawSQL(sql: string): Promise<any> {
  if (!prisma) {
    throw new Error('Test database not initialized');
  }
  return prisma.$executeRawUnsafe(sql);
}

/**
 * Seed test data
 */
export async function seedTestData() {
  if (!prisma) {
    throw new Error('Test database not initialized');
  }

  // Create test admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: '$2b$10$test.hashed.password', // Pre-hashed for testing
      isAdmin: true
    }
  });

  // Create test regular user
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      password: '$2b$10$test.hashed.password', // Pre-hashed for testing
      isAdmin: false
    }
  });

  // Create test class
  const testClass = await prisma.mClass.create({
    data: {
      title: 'Test M-Class',
      description: 'A test class for testing purposes',
      maxParticipants: 10,
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endAt: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      host: {
        connect: {
          id: adminUser.id
        }
      }
    }
  });

  return {
    adminUser,
    regularUser,
    testClass
  };
}