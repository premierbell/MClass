import UserService, { CreateUserData, LoginCredentials } from '../../src/services/user';
import DatabaseService from '../../src/services/database';
import PasswordUtil from '../../src/utils/password';
import JwtUtil from '../../src/utils/jwt';

// Mock all dependencies
jest.mock('../../src/services/database');
jest.mock('../../src/utils/password');
jest.mock('../../src/utils/jwt');

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;
const mockPasswordUtil = PasswordUtil as jest.Mocked<typeof PasswordUtil>;
const mockJwtUtil = JwtUtil as jest.Mocked<typeof JwtUtil>;

describe('UserService', () => {
  let userService: UserService;
  let mockPrismaClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Prisma client
    mockPrismaClient = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      application: {
        findMany: jest.fn()
      }
    };

    // Mock DatabaseService getInstance
    const mockDatabaseInstance = {
      getClient: jest.fn().mockReturnValue(mockPrismaClient)
    };
    mockDatabaseService.getInstance.mockReturnValue(mockDatabaseInstance as any);

    userService = new UserService();
  });

  describe('createUser', () => {
    const mockUserData: CreateUserData = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      isAdmin: false
    };

    const mockCreatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date()
    };

    it('should create user successfully', async () => {
      // Mock dependencies
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPasswordUtil.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockPasswordUtil.hashPassword.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(mockUserData);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockPasswordUtil.validatePasswordStrength).toHaveBeenCalledWith(mockUserData.password);
      expect(mockPasswordUtil.hashPassword).toHaveBeenCalledWith(mockUserData.password);
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          isAdmin: false
        },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          createdAt: true
        }
      });
      expect(result).toEqual(mockCreatedUser);
    });

    it('should throw error when user already exists', async () => {
      const existingUser = { id: 'existing-user', email: 'test@example.com' };
      mockPrismaClient.user.findUnique.mockResolvedValue(existingUser);

      await expect(userService.createUser(mockUserData)).rejects.toThrow(
        'User with this email already exists'
      );

      expect(mockPasswordUtil.validatePasswordStrength).not.toHaveBeenCalled();
      expect(mockPasswordUtil.hashPassword).not.toHaveBeenCalled();
    });

    it('should throw error for weak password', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPasswordUtil.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak']
      });

      await expect(userService.createUser(mockUserData)).rejects.toThrow(
        'Password validation failed: Password too weak'
      );

      expect(mockPasswordUtil.hashPassword).not.toHaveBeenCalled();
      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should create admin user when isAdmin is true', async () => {
      const adminUserData = { ...mockUserData, isAdmin: true };
      
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPasswordUtil.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockPasswordUtil.hashPassword.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue({ ...mockCreatedUser, isAdmin: true });

      const result = await userService.createUser(adminUserData);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          isAdmin: true
        },
        select: expect.any(Object)
      });
      expect(result.isAdmin).toBe(true);
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseEmailData = { ...mockUserData, email: 'TEST@EXAMPLE.COM' };
      
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPasswordUtil.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockPasswordUtil.hashPassword.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue(mockCreatedUser);

      await userService.createUser(upperCaseEmailData);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          isAdmin: false
        },
        select: expect.any(Object)
      });
    });
  });

  describe('authenticateUser', () => {
    const mockCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'plainPassword'
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
      isAdmin: false,
      createdAt: new Date()
    };

    it('should authenticate user successfully', async () => {
      const mockToken = 'jwt-token';
      
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPasswordUtil.comparePassword.mockResolvedValue(true);
      mockJwtUtil.generateToken.mockReturnValue(mockToken);

      const result = await userService.authenticateUser(mockCredentials);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockPasswordUtil.comparePassword).toHaveBeenCalledWith(
        mockCredentials.password,
        mockUser.password
      );
      expect(mockJwtUtil.generateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        isAdmin: mockUser.isAdmin
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          isAdmin: mockUser.isAdmin,
          createdAt: mockUser.createdAt
        },
        accessToken: mockToken
      });
    });

    it('should throw error for non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(userService.authenticateUser(mockCredentials)).rejects.toThrow(
        'Invalid email or password'
      );

      expect(mockPasswordUtil.comparePassword).not.toHaveBeenCalled();
      expect(mockJwtUtil.generateToken).not.toHaveBeenCalled();
    });

    it('should throw error for invalid password', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPasswordUtil.comparePassword.mockResolvedValue(false);

      await expect(userService.authenticateUser(mockCredentials)).rejects.toThrow(
        'Invalid email or password'
      );

      expect(mockJwtUtil.generateToken).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase for authentication', async () => {
      const upperCaseCredentials = { ...mockCredentials, email: 'TEST@EXAMPLE.COM' };
      
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPasswordUtil.comparePassword.mockResolvedValue(true);
      mockJwtUtil.generateToken.mockReturnValue('token');

      await userService.authenticateUser(upperCaseCredentials);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });
  });

  describe('getUserById', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date()
    };

    it('should return user by ID', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          createdAt: true
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      isAdmin: false,
      createdAt: new Date()
    };

    it('should return user by email', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          createdAt: true
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should normalize email to lowercase', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      await userService.getUserByEmail('TEST@EXAMPLE.COM');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Object)
      });
    });
  });

  describe('getUserApplications', () => {
    const mockApplications = [
      {
        id: 'app-1',
        createdAt: new Date(),
        mclass: {
          id: 'class-1',
          title: 'Test Class',
          description: 'Test description',
          startAt: new Date(),
          endAt: new Date(),
          maxParticipants: 10,
          host: { email: 'host@example.com' }
        }
      }
    ];

    it('should return user applications with class details', async () => {
      mockPrismaClient.application.findMany.mockResolvedValue(mockApplications);

      const result = await userService.getUserApplications('user-123');

      expect(mockPrismaClient.application.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          mclass: {
            select: {
              id: true,
              title: true,
              description: true,
              startAt: true,
              endAt: true,
              maxParticipants: true,
              host: {
                select: {
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      expect(result).toEqual([{
        id: 'app-1',
        appliedAt: mockApplications[0]!.createdAt,
        class: {
          id: 'class-1',
          title: 'Test Class',
          description: 'Test description',
          startAt: mockApplications[0]!.mclass.startAt,
          endAt: mockApplications[0]!.mclass.endAt,
          maxParticipants: 10,
          hostEmail: 'host@example.com'
        }
      }]);
    });

    it('should return empty array for user with no applications', async () => {
      mockPrismaClient.application.findMany.mockResolvedValue([]);

      const result = await userService.getUserApplications('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('updateUser', () => {
    const mockUser = {
      id: 'user-123',
      email: 'updated@example.com',
      isAdmin: false,
      createdAt: new Date()
    };

    it('should update user email', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      const result = await userService.updateUser('user-123', { email: 'updated@example.com' });

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'updated@example.com',
          NOT: { id: 'user-123' }
        }
      });
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { email: 'updated@example.com' },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          createdAt: true
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error when email is already taken', async () => {
      const existingUser = { id: 'other-user', email: 'updated@example.com' };
      mockPrismaClient.user.findFirst.mockResolvedValue(existingUser);

      await expect(userService.updateUser('user-123', { email: 'updated@example.com' }))
        .rejects.toThrow('Email is already taken by another user');

      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });

    it('should update password with validation', async () => {
      mockPasswordUtil.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
      mockPasswordUtil.hashPassword.mockResolvedValue('new-hashed-password');
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      await userService.updateUser('user-123', { password: 'NewPassword123!' });

      expect(mockPasswordUtil.validatePasswordStrength).toHaveBeenCalledWith('NewPassword123!');
      expect(mockPasswordUtil.hashPassword).toHaveBeenCalledWith('NewPassword123!');
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'new-hashed-password' },
        select: expect.any(Object)
      });
    });

    it('should throw error for weak password on update', async () => {
      mockPasswordUtil.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak']
      });

      await expect(userService.updateUser('user-123', { password: 'weak' }))
        .rejects.toThrow('Password validation failed: Password too weak');

      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      await userService.deleteUser('user-123');

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
    });
  });

  describe('createAdminUser', () => {
    it('should create admin user', async () => {
      const createUserSpy = jest.spyOn(userService, 'createUser');
      const mockAdminUser = { id: 'admin-123', email: 'admin@example.com', isAdmin: true, createdAt: new Date() };
      createUserSpy.mockResolvedValue(mockAdminUser);

      const result = await userService.createAdminUser('admin@example.com', 'AdminPass123!');

      expect(createUserSpy).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        isAdmin: true
      });
      expect(result).toEqual(mockAdminUser);

      createUserSpy.mockRestore();
    });
  });

  describe('refreshUserToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      isAdmin: false
    };

    it('should refresh user token', async () => {
      const mockToken = 'new-jwt-token';
      
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockJwtUtil.generateToken.mockReturnValue(mockToken);

      const result = await userService.refreshUserToken('user-123');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          isAdmin: true
        }
      });
      expect(mockJwtUtil.generateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        isAdmin: mockUser.isAdmin
      });
      expect(result).toBe(mockToken);
    });

    it('should throw error for non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(userService.refreshUserToken('user-123')).rejects.toThrow('User not found');

      expect(mockJwtUtil.generateToken).not.toHaveBeenCalled();
    });
  });
});