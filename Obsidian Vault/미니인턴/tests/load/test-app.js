/**
 * Test application wrapper for load testing
 * This creates an Express app instance without starting the server
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test-load.db';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@prisma/client');

// Create Express app
const app = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Prisma client for testing
const prisma = new createClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Add Prisma to app for testing
app.locals.prisma = prisma;

// Import built routes
const authRoutes = require('../../dist/routes/auth').default;
const userRoutes = require('../../dist/routes/user').default;
const mclassRoutes = require('../../dist/routes/mclass').default;

// Add routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mclasses', mclassRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Load test error:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred during load testing'
    }
  });
});

module.exports = app;