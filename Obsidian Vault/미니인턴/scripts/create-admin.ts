#!/usr/bin/env ts-node

/**
 * Admin User Creation Utility Script
 * 
 * This script creates an admin user for testing and initial setup purposes.
 * Usage: ts-node scripts/create-admin.ts <email> <password>
 */

import dotenv from 'dotenv';
import UserService from '../src/services/user';
import DatabaseService from '../src/services/database';
import PasswordUtil from '../src/utils/password';

// Load environment variables
dotenv.config();

async function createAdmin(email: string, password: string): Promise<void> {
  const userService = new UserService();
  const database = DatabaseService.getInstance();

  try {
    // Connect to database
    await database.connect();
    console.log('📊 Connected to database');

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = PasswordUtil.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if admin already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.isAdmin) {
        console.log('✅ Admin user already exists with this email');
        return;
      } else {
        // Promote existing user to admin
        await userService.updateUser(existingUser.id, { isAdmin: true });
        console.log('✅ Existing user promoted to admin successfully');
        console.log(`📧 Email: ${existingUser.email}`);
        console.log(`🆔 ID: ${existingUser.id}`);
        return;
      }
    }

    // Create new admin user
    const adminUser = await userService.createAdminUser(email, password);
    
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🆔 ID: ${adminUser.id}`);
    console.log(`🔐 Admin: ${adminUser.isAdmin}`);
    console.log(`📅 Created: ${adminUser.createdAt}`);

  } catch (error) {
    console.error('❌ Failed to create admin user:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await database.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: ts-node scripts/create-admin.ts <email> <password>');
  console.error('Example: ts-node scripts/create-admin.ts admin@miniintern.com SecureAdminPass123!');
  process.exit(1);
}

const [email, password] = args;

if (!email || !password) {
  console.error('❌ Email and password are required');
  process.exit(1);
}

// Run the script
createAdmin(email, password)
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });