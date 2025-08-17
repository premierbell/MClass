import request from 'supertest';
import { initTestDatabase, cleanupTestDatabase, disconnectTestDatabase, seedTestData } from '../helpers/database';
import { createAdminToken, createUserToken } from '../helpers/auth';
import app from '../../src/app';

describe('M-Class Management Endpoints Integration Tests', () => {
  let server: any;
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    await initTestDatabase();
    server = app;
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    
    // Seed test data and get tokens
    const seededData = await seedTestData();
    adminToken = createAdminToken(seededData.adminUser.id, seededData.adminUser.email);
    userToken = createUserToken(seededData.regularUser.id, seededData.regularUser.email);
    adminUserId = seededData.adminUser.id;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe('POST /api/mclasses', () => {
    const validClassData = {
      title: 'Advanced Node.js Development',
      description: 'Deep dive into Node.js backend development with TypeScript',
      maxParticipants: 20,
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    };

    it('should create M-Class with admin authentication', async () => {
      const response = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validClassData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          title: validClassData.title,
          description: validClassData.description,
          maxParticipants: validClassData.maxParticipants,
          startAt: validClassData.startAt,
          endAt: validClassData.endAt,
          hostId: adminUserId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        },
        message: expect.any(String)
      });
    });

    it('should reject M-Class creation from regular user', async () => {
      const response = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validClassData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('Access denied')
        }
      });
    });

    it('should reject M-Class creation without authentication', async () => {
      const response = await request(server)
        .post('/api/mclasses')
        .send(validClassData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        title: 'Missing Fields Class'
        // Missing description, maxParticipants, startAt, endAt
      };

      const response = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
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

    it('should validate date constraints', async () => {
      const invalidDateData = {
        ...validClassData,
        startAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Start after end
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should validate maxParticipants constraints', async () => {
      const invalidParticipantsData = {
        ...validClassData,
        maxParticipants: 0 // Invalid participant count
      };

      const response = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidParticipantsData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should apply strict rate limiting for admin operations', async () => {
      const requests = Array.from({ length: 25 }, (_, i) => 
        request(server)
          .post('/api/mclasses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validClassData,
            title: `Class ${i}`
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('GET /api/mclasses', () => {
    let classId: string;

    beforeEach(async () => {
      // Create a test class
      const classResponse = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Class for Listing',
          description: 'A test class for testing list endpoint',
          maxParticipants: 15,
          startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        });
      
      classId = classResponse.body.data.id;
    });

    it('should list M-Classes with authentication', async () => {
      const response = await request(server)
        .get('/api/mclasses')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          items: expect.arrayContaining([
            expect.objectContaining({
              id: classId,
              title: 'Test Class for Listing',
              description: 'A test class for testing list endpoint',
              maxParticipants: 15,
              currentParticipants: expect.any(Number),
              remainingSpots: expect.any(Number)
            })
          ]),
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean)
          })
        }
      });
    });

    it('should support pagination parameters', async () => {
      // Create multiple classes
      await Promise.all(Array.from({ length: 5 }, (_, i) => 
        request(server)
          .post('/api/mclasses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Pagination Test Class ${i}`,
            description: `Test class ${i} for pagination`,
            maxParticipants: 10,
            startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
          })
      ));

      const response = await request(server)
        .get('/api/mclasses?page=1&limit=3')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(3);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 3,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      });
    });

    it('should reject request without authentication', async () => {
      const response = await request(server)
        .get('/api/mclasses')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should validate pagination parameters', async () => {
      const response = await request(server)
        .get('/api/mclasses?page=0&limit=-1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });
  });

  describe('GET /api/mclasses/:classId', () => {
    let classId: string;

    beforeEach(async () => {
      const classResponse = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Detailed Test Class',
          description: 'A test class for testing detail endpoint',
          maxParticipants: 12,
          startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        });
      
      classId = classResponse.body.data.id;
    });

    it('should return M-Class details with authentication', async () => {
      const response = await request(server)
        .get(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: classId,
          title: 'Detailed Test Class',
          description: 'A test class for testing detail endpoint',
          maxParticipants: 12,
          currentParticipants: expect.any(Number),
          remainingSpots: expect.any(Number),
          startAt: expect.any(String),
          endAt: expect.any(String),
          hostEmail: expect.any(String),
          createdAt: expect.any(String)
        }
      });
    });

    it('should show additional details for admin users', async () => {
      const response = await request(server)
        .get(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('applicants');
    });

    it('should return 404 for non-existent class', async () => {
      const nonExistentId = 'non-existent-class-id';
      
      const response = await request(server)
        .get(`/api/mclasses/${nonExistentId}`)
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

    it('should reject request without authentication', async () => {
      const response = await request(server)
        .get(`/api/mclasses/${classId}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('DELETE /api/mclasses/:classId', () => {
    let classId: string;

    beforeEach(async () => {
      const classResponse = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Class to Delete',
          description: 'A test class for testing deletion',
          maxParticipants: 8,
          startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        });
      
      classId = classResponse.body.data.id;
    });

    it('should delete M-Class with admin authentication', async () => {
      const response = await request(server)
        .delete(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted')
      });

      // Verify class was deleted
      await request(server)
        .get(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should reject deletion from regular user', async () => {
      const response = await request(server)
        .delete(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN'
        }
      });
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(server)
        .delete(`/api/mclasses/${classId}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should return 404 for non-existent class deletion', async () => {
      const nonExistentId = 'non-existent-class-id';
      
      const response = await request(server)
        .delete(`/api/mclasses/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND'
        }
      });
    });

    it('should handle cascade deletion of applications', async () => {
      // Apply to the class first
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      // Delete the class
      const deleteResponse = await request(server)
        .delete(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify applications were also deleted
      const applicationsResponse = await request(server)
        .get('/api/users/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(applicationsResponse.body.data).toHaveLength(0);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain participant count accuracy', async () => {
      // Create a class
      const classResponse = await request(server)
        .post('/api/mclasses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Participant Count Test',
          description: 'Testing participant count accuracy',
          maxParticipants: 5,
          startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        });
      
      const classId = classResponse.body.data.id;

      // Apply to class
      await request(server)
        .post(`/api/mclasses/${classId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      // Check participant count
      const detailResponse = await request(server)
        .get(`/api/mclasses/${classId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(detailResponse.body.data).toMatchObject({
        currentParticipants: 1,
        remainingSpots: 4
      });
    });

    it('should handle concurrent class creation by different admins', async () => {
      // Create second admin
      const admin2Data = await seedTestData();
      const admin2Token = createAdminToken(admin2Data.adminUser.id, admin2Data.adminUser.email);

      const classData1 = {
        title: 'Concurrent Class 1',
        description: 'Testing concurrent creation',
        maxParticipants: 10,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
      };

      const classData2 = {
        title: 'Concurrent Class 2',
        description: 'Testing concurrent creation',
        maxParticipants: 15,
        startAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString()
      };

      const [response1, response2] = await Promise.all([
        request(server)
          .post('/api/mclasses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(classData1),
        request(server)
          .post('/api/mclasses')
          .set('Authorization', `Bearer ${admin2Token}`)
          .send(classData2)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.data.id).not.toBe(response2.body.data.id);
    });
  });
});