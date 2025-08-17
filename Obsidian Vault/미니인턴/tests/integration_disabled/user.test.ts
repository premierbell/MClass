import request from 'supertest';
import { initTestDatabase, cleanupTestDatabase, disconnectTestDatabase } from '../helpers/database';
import { createAdminToken } from '../helpers/auth';
import app from '../../src/app';

describe('User Management Endpoints Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    await initTestDatabase();
    server = app;
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe('POST /api/users/signup', () => {
    const validSignupData = {
      email: 'user@example.com',
      password: 'UserPassword123!'
    };

    it('should register a new user successfully', async () => {
      const response = await request(server)
        .post('/api/users/signup')
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
        }
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject registration with existing email', async () => {
      // First registration
      await request(server)
        .post('/api/users/signup')
        .send(validSignupData);

      // Second registration with same email
      const response = await request(server)
        .post('/api/users/signup')
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

    it('should apply signup rate limiting', async () => {
      const requests = Array.from({ length: 8 }, (_, i) => 
        request(server)
          .post('/api/users/signup')
          .send({
            email: `user${i}@example.com`,
            password: 'UserPassword123!'
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('POST /api/users/login', () => {
    const loginCredentials = {
      email: 'user@example.com',
      password: 'UserPassword123!'
    };

    beforeEach(async () => {
      await request(server)
        .post('/api/users/signup')
        .send(loginCredentials);
    });

    it('should login user with valid credentials', async () => {
      const response = await request(server)
        .post('/api/users/login')
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
        }
      });
    });

    it('should reject login with invalid credentials', async () => {
      const invalidCredentials = {
        email: 'user@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(server)
        .post('/api/users/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should apply login rate limiting', async () => {
      const requests = Array.from({ length: 12 }, () => 
        request(server)
          .post('/api/users/login')
          .send({
            email: 'user@example.com',
            password: 'WrongPassword123!'
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/profile', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      const signupResponse = await request(server)
        .post('/api/users/signup')
        .send({
          email: 'user@example.com',
          password: 'UserPassword123!'
        });
      
      userToken = signupResponse.body.data.accessToken;
      userId = signupResponse.body.data.user.id;
    });

    it('should return user profile with valid authentication', async () => {
      const response = await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: userId,
          email: 'user@example.com',
          isAdmin: false
        }
      });

      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should reject request without authentication', async () => {
      const response = await request(server)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should apply general rate limiting', async () => {
      const requests = Array.from({ length: 105 }, () => 
        request(server)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/users/profile', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      const signupResponse = await request(server)
        .post('/api/users/signup')
        .send({
          email: 'user@example.com',
          password: 'UserPassword123!'
        });
      
      userToken = signupResponse.body.data.accessToken;
      userId = signupResponse.body.data.user.id;
    });

    it('should update user email successfully', async () => {
      const updateData = {
        email: 'newemail@example.com'
      };

      const response = await request(server)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: userId,
          email: 'newemail@example.com',
          isAdmin: false
        }
      });
    });

    it('should update user password successfully', async () => {
      const updateData = {
        password: 'NewPassword123!'
      };

      const response = await request(server)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: userId,
          email: 'user@example.com'
        }
      });

      // Verify password was updated by logging in with new password
      const loginResponse = await request(server)
        .post('/api/users/login')
        .send({
          email: 'user@example.com',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject update with existing email', async () => {
      // Create another user
      await request(server)
        .post('/api/users/signup')
        .send({
          email: 'existing@example.com',
          password: 'ExistingPassword123!'
        });

      const updateData = {
        email: 'existing@example.com'
      };

      const response = await request(server)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CONFLICT',
          message: expect.stringContaining('already taken')
        }
      });
    });

    it('should reject update with weak password', async () => {
      const updateData = {
        password: 'weak'
      };

      const response = await request(server)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should reject update without authentication', async () => {
      const updateData = {
        email: 'newemail@example.com'
      };

      const response = await request(server)
        .put('/api/users/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('GET /api/users/applications', () => {
    let userToken: string;
    let adminToken: string;
    let classId: string;

    beforeEach(async () => {
      // Create user
      const userSignup = await request(server)
        .post('/api/users/signup')
        .send({
          email: 'user@example.com',
          password: 'UserPassword123!'
        });
      
      userToken = userSignup.body.data.accessToken;

      // Create admin
      const adminSignup = await request(server)
        .post('/api/users/signup')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!'
        });
      
      adminToken = adminSignup.body.data.accessToken;

      // Manually set admin status (in real app, this would be done through admin controls)
      const { seedTestData } = await import('../helpers/database');
      const seededData = await seedTestData();
      adminToken = createAdminToken(seededData.adminUser.id, seededData.adminUser.email);

      // Create a class
      const classResponse = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Class',
          description: 'A test class for applications',
          maxParticipants: 10,
          startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        });
      
      classId = classResponse.body.data.id;

      // Apply to the class
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    it('should return user applications', async () => {
      const response = await request(server)
        .get('/api/users/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            appliedAt: expect.any(String),
            class: expect.objectContaining({
              id: classId,
              title: 'Test Class',
              description: 'A test class for applications'
            })
          })
        ])
      });
    });

    it('should return empty array for user with no applications', async () => {
      // Create new user with no applications
      const newUserSignup = await request(server)
        .post('/api/users/signup')
        .send({
          email: 'newuser@example.com',
          password: 'NewUserPassword123!'
        });

      const response = await request(server)
        .get('/api/users/applications')
        .set('Authorization', `Bearer ${newUserSignup.body.data.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: []
      });
    });

    it('should reject request without authentication', async () => {
      const response = await request(server)
        .get('/api/users/applications')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(server)
        .post('/api/users/signup')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", "password":}') // Malformed JSON
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String)
        }
      });
    });

    it('should handle non-JSON content type', async () => {
      const response = await request(server)
        .post('/api/users/signup')
        .set('Content-Type', 'text/plain')
        .send('not json data')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false
      });
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      const response = await request(server)
        .post('/api/users/signup')
        .send({
          email: 'format@example.com',
          password: 'FormatPassword123!'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return consistent error response format', async () => {
      const response = await request(server)
        .post('/api/users/signup')
        .send({
          email: 'invalid-email',
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});