import request from 'supertest';
import { initTestDatabase, cleanupTestDatabase, disconnectTestDatabase } from '../helpers/database';
import app from '../../src/app';

describe('Authentication Endpoints Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Initialize test database
    await initTestDatabase();
    server = app;
  });

  beforeEach(async () => {
    // Clean database before each test
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    // Disconnect from test database
    await disconnectTestDatabase();
  });

  describe('POST /api/auth/signup', () => {
    const validSignupData = {
      email: 'test@example.com',
      password: 'StrongPassword123!'
    };

    it('should register a new user successfully', async () => {
      const response = await request(server)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: validSignupData.email,
            isAdmin: false
          },
          accessToken: expect.any(String)
        },
        message: expect.any(String),
        requestId: expect.any(String),
        timestamp: expect.any(String)
      });

      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user.createdAt).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(server)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(201);

      // Second registration with same email
      const response = await request(server)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.stringContaining('already exists')
        }
      });
    });

    it('should reject invalid email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'StrongPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/signup')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String)
        }
      });
    });

    it('should reject weak password', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: 'weak'
      };

      const response = await request(server)
        .post('/api/auth/signup')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String)
        }
      });
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(server)
        .post('/api/auth/signup')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String)
        }
      });
    });

    it('should handle empty request body', async () => {
      const response = await request(server)
        .post('/api/auth/signup')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });
  });

  describe('POST /api/auth/login', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'StrongPassword123!'
    };

    beforeEach(async () => {
      // Create a user for login tests
      await request(server)
        .post('/api/auth/signup')
        .send(loginCredentials);
    });

    it('should login with valid credentials', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send(loginCredentials)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: loginCredentials.email,
            isAdmin: false
          },
          accessToken: expect.any(String)
        },
        message: expect.any(String)
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject invalid email', async () => {
      const invalidCredentials = {
        email: 'nonexistent@example.com',
        password: 'StrongPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('Invalid')
        }
      });
    });

    it('should reject invalid password', async () => {
      const invalidCredentials = {
        email: loginCredentials.email,
        password: 'WrongPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('Invalid')
        }
      });
    });

    it('should reject missing credentials', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should handle case insensitive email login', async () => {
      const uppercaseEmailCredentials = {
        email: 'TEST@EXAMPLE.COM',
        password: 'StrongPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(uppercaseEmailCredentials)
        .expect(200);

      expect(response.body.data.user.email).toBe(loginCredentials.email.toLowerCase());
    });
  });

  describe('GET /api/auth/me', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(server)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'StrongPassword123!'
        });
      
      userToken = signupResponse.body.data.accessToken;
      userId = signupResponse.body.data.user.id;
    });

    it('should return current user information with valid token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: userId,
          email: 'test@example.com',
          isAdmin: false
        }
      });

      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('Authentication required')
        }
      });
    });

    it('should reject request with invalid token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Invalid-Format')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    let userToken: string;

    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(server)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'StrongPassword123!'
        });
      
      userToken = signupResponse.body.data.accessToken;
    });

    it('should refresh token with valid authentication', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String)
        }
      });

      // New token should be different from original
      expect(response.body.data.accessToken).not.toBe(userToken);
    });

    it('should reject refresh without authentication', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to signup endpoint', async () => {
      const signupData = {
        email: 'ratelimit@example.com',
        password: 'StrongPassword123!'
      };

      // Make multiple requests rapidly
      const requests = Array.from({ length: 6 }, (_, i) => 
        request(server)
          .post('/api/auth/signup')
          .send({
            ...signupData,
            email: `ratelimit${i}@example.com`
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should succeed, some should be rate limited
      const successCount = responses.filter(r => r.status === 201).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should apply rate limiting to login endpoint', async () => {
      // Create a user first
      await request(server)
        .post('/api/auth/signup')
        .send({
          email: 'ratelimit@example.com',
          password: 'StrongPassword123!'
        });

      const loginData = {
        email: 'ratelimit@example.com',
        password: 'WrongPassword123!' // Use wrong password to avoid success
      };

      // Make multiple login attempts rapidly
      const requests = Array.from({ length: 12 }, () => 
        request(server)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should fail with 401, some should be rate limited with 429
      const unauthorizedCount = responses.filter(r => r.status === 401).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(unauthorizedCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });
});