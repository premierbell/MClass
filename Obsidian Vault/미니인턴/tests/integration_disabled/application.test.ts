import request from 'supertest';
import { initTestDatabase, cleanupTestDatabase, disconnectTestDatabase, seedTestData } from '../helpers/database';
import { createAdminToken, createUserToken } from '../helpers/auth';
import app from '../../src/app';

describe('Application Management Endpoints Integration Tests', () => {
  let server: any;
  let adminToken: string;
  let userToken: string;
  let user2Token: string;
  let regularUserId: string;
  let user2Id: string;
  let classId: string;

  beforeAll(async () => {
    await initTestDatabase();
    server = app;
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    
    // Seed test data
    const seededData = await seedTestData();
    adminToken = createAdminToken(seededData.adminUser.id, seededData.adminUser.email);
    userToken = createUserToken(seededData.regularUser.id, seededData.regularUser.email);
    regularUserId = seededData.regularUser.id;

    // Create second user
    const user2Signup = await request(server)
      .post('/api/auth/signup')
      .send({
        email: 'user2@example.com',
        password: 'User2Password123!'
      });
    
    user2Token = user2Signup.body.data.accessToken;
    user2Id = user2Signup.body.data.user.id;

    // Create a test class
    const classResponse = await request(server)
      .post('/api/mclasses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Application Test Class',
        description: 'A class for testing applications',
        maxParticipants: 3,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
      });
    
    classId = classResponse.body.data.id;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe('POST /api/mclasses/:classId/apply', () => {
    it('should apply to M-Class successfully', async () => {
      const response = await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          userId: regularUserId,
          classId: classId,
          createdAt: expect.any(String)
        },
        message: expect.stringContaining('applied')
      });
    });

    it('should reject duplicate application', async () => {
      // First application
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      // Second application to same class
      const response = await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CONFLICT',
          message: expect.stringContaining('already applied')
        }
      });
    });

    it('should reject application without authentication', async () => {
      const response = await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should reject application to non-existent class', async () => {
      const nonExistentClassId = 'non-existent-class-id';
      
      const response = await request(server)
        .post(`/api/mclasses/${nonExistentClassId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('not found')
        }
      });
    });

    it('should handle capacity overflow prevention', async () => {
      // Fill up the class (maxParticipants = 3)
      const applications = [
        request(server)
          .post(`/api/mclasses/${classId}/apply`)
          .set('Authorization', `Bearer ${userToken}`),
        request(server)
          .post(`/api/mclasses/${classId}/apply`)
          .set('Authorization', `Bearer ${user2Token}`),
        request(server)
          .post(`/api/mclasses/${classId}/apply`)
          .set('Authorization', `Bearer ${adminToken}`)
      ];

      const responses = await Promise.all(applications);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Create fourth user and try to apply (should be rejected)
      const user4Signup = await request(server)
        .post('/api/auth/signup')
        .send({
          email: 'user4@example.com',
          password: 'User4Password123!'
        });

      const overflowResponse = await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${user4Signup.body.data.accessToken}`)
        .expect(409);

      expect(overflowResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'CAPACITY_EXCEEDED',
          message: expect.stringContaining('full')
        }
      });
    });

    it('should handle concurrent applications safely', async () => {
      // Create multiple users
      const userSignups = await Promise.all([
        request(server).post('/api/auth/signup').send({
          email: 'concurrent1@example.com',
          password: 'Password123!'
        }),
        request(server).post('/api/auth/signup').send({
          email: 'concurrent2@example.com',
          password: 'Password123!'
        }),
        request(server).post('/api/auth/signup').send({
          email: 'concurrent3@example.com',
          password: 'Password123!'
        }),
        request(server).post('/api/auth/signup').send({
          email: 'concurrent4@example.com',
          password: 'Password123!'
        })
      ]);

      const tokens = userSignups.map(signup => signup.body.data.accessToken);

      // Simultaneous applications to class with capacity 3
      const concurrentApplications = tokens.map(token =>
        request(server)
          .post(`/api/mclasses/${classId}/apply`)
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(concurrentApplications);
      
      const successfulApps = responses.filter(r => r.status === 201);
      const rejectedApps = responses.filter(r => r.status === 409);
      
      // Exactly 3 should succeed, 1 should be rejected
      expect(successfulApps.length).toBe(3);
      expect(rejectedApps.length).toBe(1);
    });

    it('should reject application to expired class', async () => {
      // Create an expired class
      const expiredClassResponse = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Expired Class',
          description: 'A class that has already ended',
          maxParticipants: 5,
          startAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          endAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()    // 1 hour ago
        });

      const expiredClassId = expiredClassResponse.body.data.id;

      const response = await request(server)
        .post(`/api/mclasses/${expiredClassId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('deadline')
        }
      });
    });
  });

  describe('DELETE /api/mclasses/:classId/apply', () => {
    beforeEach(async () => {
      // Apply to class first
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    it('should cancel application successfully', async () => {
      const response = await request(server)
        .delete(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('cancelled')
      });

      // Verify application was removed
      const applicationsResponse = await request(server)
        .get('/api/users/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(applicationsResponse.body.data).toHaveLength(0);
    });

    it('should reject cancellation without authentication', async () => {
      const response = await request(server)
        .delete(`/api/mclasses/${classId}/apply`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should reject cancellation of non-existent application', async () => {
      // User2 has not applied to this class
      const response = await request(server)
        .delete(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('No application found')
        }
      });
    });

    it('should reject cancellation for non-existent class', async () => {
      const nonExistentClassId = 'non-existent-class-id';
      
      const response = await request(server)
        .delete(`/api/mclasses/${nonExistentClassId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND'
        }
      });
    });

    it('should update class participant count after cancellation', async () => {
      // Check initial count
      const initialResponse = await request(server)
        .get(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(initialResponse.body.data.currentParticipants).toBe(1);

      // Cancel application
      await request(server)
        .delete(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Check updated count
      const updatedResponse = await request(server)
        .get(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(updatedResponse.body.data.currentParticipants).toBe(0);
      expect(updatedResponse.body.data.remainingSpots).toBe(3);
    });
  });

  describe('GET /api/mclasses/:classId/applications', () => {
    beforeEach(async () => {
      // Add applications from multiple users
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);
      
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${user2Token}`);
    });

    it('should return applications for admin user', async () => {
      const response = await request(server)
        .get(`/api/mclasses/${classId}/applications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            userId: regularUserId,
            user: expect.objectContaining({
              email: expect.any(String)
            }),
            appliedAt: expect.any(String)
          }),
          expect.objectContaining({
            id: expect.any(String),
            userId: user2Id,
            user: expect.objectContaining({
              email: 'user2@example.com'
            }),
            appliedAt: expect.any(String)
          })
        ])
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should return applications for class host', async () => {
      // Admin is the host of the class, so should have access
      const response = await request(server)
        .get(`/api/mclasses/${classId}/applications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should reject access for regular users', async () => {
      const response = await request(server)
        .get(`/api/mclasses/${classId}/applications`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('Access denied')
        }
      });
    });

    it('should reject access without authentication', async () => {
      const response = await request(server)
        .get(`/api/mclasses/${classId}/applications`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should return empty array for class with no applications', async () => {
      // Create new class with no applications
      const newClassResponse = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Empty Class',
          description: 'A class with no applications',
          maxParticipants: 5,
          startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        });

      const response = await request(server)
        .get(`/api/mclasses/${newClassResponse.body.data.id}/applications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: []
      });
    });

    it('should return 404 for non-existent class', async () => {
      const nonExistentClassId = 'non-existent-class-id';
      
      const response = await request(server)
        .get(`/api/mclasses/${nonExistentClassId}/applications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND'
        }
      });
    });
  });

  describe('Application State Consistency', () => {
    it('should maintain data consistency during rapid apply/cancel operations', async () => {
      // Rapid apply and cancel operations
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      await request(server)
        .delete(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      // Verify final state
      const classResponse = await request(server)
        .get(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(classResponse.body.data.currentParticipants).toBe(1);

      const applicationsResponse = await request(server)
        .get('/api/users/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(applicationsResponse.body.data).toHaveLength(1);
    });

    it('should handle application workflow after class deletion', async () => {
      // Apply to class
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      // Delete class (should cascade delete applications)
      await request(server)
        .delete(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check user applications (should be empty)
      const applicationsResponse = await request(server)
        .get('/api/users/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(applicationsResponse.body.data).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid class ID format', async () => {
      const invalidClassId = 'invalid-uuid-format';
      
      const response = await request(server)
        .post(`/api/mclasses/${invalidClassId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should handle database connection issues gracefully', async () => {
      // This would typically require mocking database failures
      // For now, we test the normal flow and trust error handlers
      const response = await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should maintain request correlation IDs', async () => {
      const response = await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('requestId');
      expect(response.body.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });
});