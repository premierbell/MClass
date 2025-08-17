import { Response } from 'express';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendError,
  sendValidationError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendCapacityExceeded,
  sendTooManyRequests,
  sendInternalError,
  createPaginationMeta,
  validatePagination,
  extractRequestMetadata
} from '../../src/utils/response';
import { HttpStatusCode, ErrorCode } from '../../src/types/responses';

describe('Response Utilities', () => {
  let mockResponse: Partial<Response>;
  
  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    } as Partial<Response>;
  });

  describe('sendSuccess', () => {
    it('should send successful response with data', () => {
      const testData = { id: 1, name: 'Test' };
      const message = 'Success message';

      sendSuccess(mockResponse as Response, testData, message);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: testData,
          message,
          requestId: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should send successful response without message', () => {
      const testData = { id: 1 };

      sendSuccess(mockResponse as Response, testData);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: testData,
          requestId: expect.any(String),
          timestamp: expect.any(String)
        })
      );
      
      const calledWith = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(calledWith).not.toHaveProperty('message');
    });

    it('should use custom status code when provided', () => {
      const testData = { id: 1 };

      sendSuccess(mockResponse as Response, testData, undefined, HttpStatusCode.CREATED);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.CREATED);
    });

    it('should include custom metadata when provided', () => {
      const testData = { id: 1 };
      const metadata = { requestId: 'custom-id' };

      sendSuccess(mockResponse as Response, testData, undefined, HttpStatusCode.OK, metadata);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'custom-id'
        })
      );
    });
  });

  describe('sendCreated', () => {
    it('should send created response with 201 status', () => {
      const testData = { id: 1, name: 'Created' };
      const message = 'Resource created';

      sendCreated(mockResponse as Response, testData, message);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: testData,
          message
        })
      );
    });
  });

  describe('sendNoContent', () => {
    it('should send no content response with 204 status', () => {
      const message = 'No content';

      sendNoContent(mockResponse as Response, message);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.NO_CONTENT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message
        })
      );
    });
  });

  describe('sendPaginated', () => {
    it('should send paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 20,
        totalPages: 2,
        hasNext: true,
        hasPrev: false
      };

      sendPaginated(mockResponse as Response, items, pagination);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            items,
            pagination
          }
        })
      );
    });
  });

  describe('sendError', () => {
    it('should send error response', () => {
      const code = ErrorCode.VALIDATION_ERROR;
      const message = 'Validation failed';
      const details = { field: 'email' };

      sendError(mockResponse as Response, code, message, HttpStatusCode.BAD_REQUEST, details, 'email');

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code,
            message,
            details,
            field: 'email'
          },
          requestId: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should use default status code when not provided', () => {
      sendError(mockResponse as Response, ErrorCode.INTERNAL_SERVER_ERROR, 'Internal error');

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
    });
  });

  describe('sendValidationError', () => {
    it('should send validation error response', () => {
      const errors = [
        { field: 'email', message: 'Email is invalid', value: 'invalid-email' },
        { field: 'password', message: 'Password too short', value: '123' }
      ];

      sendValidationError(mockResponse as Response, errors);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
            details: errors
          }
        })
      );
    });

    it('should use custom message when provided', () => {
      const errors: any[] = [];
      const customMessage = 'Custom validation message';

      sendValidationError(mockResponse as Response, errors, customMessage);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: customMessage
          })
        })
      );
    });
  });

  describe('HTTP error helpers', () => {
    it('sendBadRequest should send 400 status', () => {
      sendBadRequest(mockResponse as Response, 'Bad request');

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
    });

    it('sendUnauthorized should send 401 status', () => {
      sendUnauthorized(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Authentication required'
          })
        })
      );
    });

    it('sendForbidden should send 403 status', () => {
      sendForbidden(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Access denied'
          })
        })
      );
    });

    it('sendNotFound should send 404 status', () => {
      sendNotFound(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Resource not found'
          })
        })
      );
    });

    it('sendConflict should send 409 status', () => {
      const message = 'Resource conflict';
      const details = { conflictingField: 'email' };

      sendConflict(mockResponse as Response, message, details);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message,
            details
          })
        })
      );
    });

    it('sendCapacityExceeded should send conflict status', () => {
      sendCapacityExceeded(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.CAPACITY_EXCEEDED,
            message: 'Capacity exceeded'
          })
        })
      );
    });

    it('sendTooManyRequests should send 429 status and set Retry-After header', () => {
      const retryAfter = 60;

      sendTooManyRequests(mockResponse as Response, 'Too many requests', retryAfter);

      expect(mockResponse.set).toHaveBeenCalledWith('Retry-After', '60');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.TOO_MANY_REQUESTS);
    });

    it('sendInternalError should send 500 status', () => {
      sendInternalError(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Internal server error'
          })
        })
      );
    });

    it('sendInternalError should hide details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const details = { stack: 'error stack trace' };
      sendInternalError(mockResponse as Response, 'Error', details);

      const calledWith = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(calledWith.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createPaginationMeta', () => {
    it('should create pagination metadata correctly', () => {
      const result = createPaginationMeta(2, 10, 25);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should handle first page correctly', () => {
      const result = createPaginationMeta(1, 10, 25);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      });
    });

    it('should handle last page correctly', () => {
      const result = createPaginationMeta(3, 10, 25);

      expect(result).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: false,
        hasPrev: true
      });
    });
  });

  describe('validatePagination', () => {
    it('should return default values for undefined parameters', () => {
      const result = validatePagination();

      expect(result).toEqual({
        page: 1,
        limit: 10,
        errors: []
      });
    });

    it('should parse string numbers correctly', () => {
      const result = validatePagination('2', '20');

      expect(result).toEqual({
        page: 2,
        limit: 20,
        errors: []
      });
    });

    it('should handle invalid page values', () => {
      const result = validatePagination('invalid', 10);

      expect(result.page).toBe(1);
      expect(result.errors).toContainEqual({
        field: 'page',
        message: 'Page must be a positive integer',
        value: 'invalid'
      });
    });

    it('should handle invalid limit values', () => {
      const result = validatePagination(1, 'invalid');

      expect(result.limit).toBe(10);
      expect(result.errors).toContainEqual({
        field: 'limit',
        message: 'Limit must be a positive integer',
        value: 'invalid'
      });
    });

    it('should enforce maximum limit', () => {
      const result = validatePagination(1, 200, 100);

      expect(result.limit).toBe(100);
      expect(result.errors).toContainEqual({
        field: 'limit',
        message: 'Limit cannot exceed 100',
        value: 200
      });
    });

    it('should handle negative values', () => {
      const result = validatePagination(-1, -5);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('extractRequestMetadata', () => {
    it('should extract request metadata', () => {
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        connection: {
          remoteAddress: '192.168.1.1'
        }
      };

      const result = extractRequestMetadata(mockRequest);

      expect(result).toEqual({
        clientIp: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      });
    });

    it('should fallback to connection.remoteAddress when ip is not available', () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        connection: {
          remoteAddress: '192.168.1.1'
        }
      };

      const result = extractRequestMetadata(mockRequest);

      expect(result.clientIp).toBe('192.168.1.1');
    });

    it('should handle missing properties gracefully', () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined)
      };

      const result = extractRequestMetadata(mockRequest);

      expect(result).toEqual({
        clientIp: undefined,
        userAgent: undefined
      });
    });
  });
});