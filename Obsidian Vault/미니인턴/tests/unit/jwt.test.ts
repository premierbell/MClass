import jwt from 'jsonwebtoken';

// Mock jwt functions for deterministic testing
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Set up environment before importing JwtUtil
process.env.JWT_SECRET = 'test-secret-key';

import JwtUtil, { JwtPayload } from '../../src/utils/jwt';

describe('JwtUtil', () => {
  const mockPayload: JwtPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    isAdmin: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate token successfully with valid payload', () => {
      const mockToken = 'mock.jwt.token';
      mockedJwt.sign.mockReturnValue(mockToken as never);

      const result = JwtUtil.generateToken(mockPayload);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        mockPayload,
        expect.any(String),
        {
          expiresIn: '24h',
          issuer: 'miniintern-mclass',
          audience: 'miniintern-users'
        }
      );
      expect(result).toBe(mockToken);
    });

    it('should generate token for admin user', () => {
      const adminPayload: JwtPayload = {
        ...mockPayload,
        isAdmin: true
      };
      const mockToken = 'admin.jwt.token';
      mockedJwt.sign.mockReturnValue(mockToken as never);

      const result = JwtUtil.generateToken(adminPayload);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        adminPayload,
        expect.any(String),
        expect.any(Object)
      );
      expect(result).toBe(mockToken);
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'valid.jwt.token';

    it('should verify token successfully', () => {
      mockedJwt.verify.mockReturnValue(mockPayload as never);

      const result = JwtUtil.verifyToken(mockToken);

      expect(mockedJwt.verify).toHaveBeenCalledWith(
        mockToken,
        expect.any(String),
        {
          issuer: 'miniintern-mclass',
          audience: 'miniintern-users'
        }
      );
      expect(result).toEqual(mockPayload);
    });

    it('should throw specific error for expired token', () => {
      const expiredError = new jwt.TokenExpiredError('Token expired', new Date());
      mockedJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      expect(() => JwtUtil.verifyToken(mockToken))
        .toThrow('Token has expired');
    });

    it('should throw specific error for invalid token', () => {
      const invalidError = new jwt.JsonWebTokenError('Invalid token');
      mockedJwt.verify.mockImplementation(() => {
        throw invalidError;
      });

      expect(() => JwtUtil.verifyToken(mockToken))
        .toThrow('Invalid token');
    });

    it('should throw generic error for other JWT errors', () => {
      const genericError = new Error('Some other error');
      mockedJwt.verify.mockImplementation(() => {
        throw genericError;
      });

      expect(() => JwtUtil.verifyToken(mockToken))
        .toThrow('Token verification failed');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'valid.jwt.token';
      const authHeader = `Bearer ${token}`;

      const result = JwtUtil.extractTokenFromHeader(authHeader);

      expect(result).toBe(token);
    });

    it('should return null for undefined header', () => {
      const result = JwtUtil.extractTokenFromHeader(undefined);

      expect(result).toBeNull();
    });

    it('should return null for malformed header without Bearer', () => {
      const authHeader = 'InvalidFormat token';

      const result = JwtUtil.extractTokenFromHeader(authHeader);

      expect(result).toBeNull();
    });

    it('should return null for Bearer header without token', () => {
      const authHeader = 'Bearer';

      const result = JwtUtil.extractTokenFromHeader(authHeader);

      expect(result).toBeNull();
    });

    it('should return null for empty Bearer token', () => {
      const authHeader = 'Bearer ';

      const result = JwtUtil.extractTokenFromHeader(authHeader);

      expect(result).toBeNull();
    });

    it('should return null for header with too many parts', () => {
      const authHeader = 'Bearer token extra-part';

      const result = JwtUtil.extractTokenFromHeader(authHeader);

      expect(result).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('should generate token structure with access token', () => {
      const mockToken = 'mock.access.token';
      mockedJwt.sign.mockReturnValue(mockToken as never);

      const result = JwtUtil.generateTokens(mockPayload);

      expect(result).toEqual({
        accessToken: mockToken
      });
    });

    it('should call generateToken internally', () => {
      const spy = jest.spyOn(JwtUtil, 'generateToken');
      const mockToken = 'mock.token';
      spy.mockReturnValue(mockToken);

      const result = JwtUtil.generateTokens(mockPayload);

      expect(spy).toHaveBeenCalledWith(mockPayload);
      expect(result.accessToken).toBe(mockToken);

      spy.mockRestore();
    });
  });

  describe('decodeTokenWithoutVerification', () => {
    const mockToken = 'some.jwt.token';

    it('should decode token without verification', () => {
      mockedJwt.decode.mockReturnValue(mockPayload as never);

      const result = JwtUtil.decodeTokenWithoutVerification(mockToken);

      expect(mockedJwt.decode).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockPayload);
    });

    it('should return null for invalid token', () => {
      mockedJwt.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = JwtUtil.decodeTokenWithoutVerification(mockToken);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      mockedJwt.decode.mockReturnValue(null as never);

      const result = JwtUtil.decodeTokenWithoutVerification(mockToken);

      expect(result).toBeNull();
    });
  });
});