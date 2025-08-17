import { Response } from 'express';
import UserService from '../services/user';
import { AuthenticatedRequest } from '../middleware/auth';
import ValidationUtil from '../utils/validation';
import SecurityLogger from '../utils/logger';

class AdminController {
  private userService = new UserService();

  // Create admin user - super admin only
  createAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate request body structure
      const bodyValidation = ValidationUtil.validateRequestBody(req.body, ['email', 'password']);
      if (!bodyValidation.isValid) {
        SecurityLogger.logValidationError(
          req.ip || 'unknown',
          req.get('User-Agent') || 'unknown',
          req.path,
          bodyValidation.errors
        );
        res.status(400).json(ValidationUtil.createValidationError(bodyValidation.errors));
        return;
      }

      let { email, password } = req.body;

      // Sanitize inputs
      email = ValidationUtil.sanitizeString(email);
      password = ValidationUtil.sanitizeString(password);

      // Validate email
      const emailValidation = ValidationUtil.validateEmail(email);
      if (!emailValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(emailValidation.errors));
        return;
      }

      // Validate password
      const passwordValidation = ValidationUtil.validatePassword(password);
      if (!passwordValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(passwordValidation.errors));
        return;
      }

      // Create admin user
      const adminUser = await this.userService.createAdminUser(email, password);

      // Log successful admin creation
      SecurityLogger.logSuccess({
        type: 'SIGNUP_SUCCESS',
        userId: adminUser.id,
        email: adminUser.email,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'Admin user created successfully',
        details: { createdBy: req.user?.userId }
      });

      res.status(201).json({
        success: true,
        data: {
          admin: {
            id: adminUser.id,
            email: adminUser.email,
            isAdmin: adminUser.isAdmin,
            createdAt: adminUser.createdAt
          }
        },
        message: 'Admin user created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Admin creation error:', error);

      const { email } = req.body;
      const ip = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          SecurityLogger.logError({
            type: 'SIGNUP_FAILURE',
            email,
            ip,
            userAgent,
            message: 'Admin creation failed - email already exists',
            details: { attemptedBy: req.user?.userId }
          });
          res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'User with this email already exists'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (error.message.includes('Password validation failed')) {
          SecurityLogger.logError({
            type: 'VALIDATION_ERROR',
            email,
            ip,
            userAgent,
            message: 'Admin creation failed - password validation failed',
            details: { attemptedBy: req.user?.userId }
          });
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message
            },
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      SecurityLogger.logError({
        type: 'SIGNUP_FAILURE',
        email,
        ip,
        userAgent,
        message: 'Admin creation failed - internal error',
        details: { attemptedBy: req.user?.userId }
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Admin creation failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // List all users (admin only)
  listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const database = this.userService['database']; // Access private property for admin operations
      
      const [users, total] = await Promise.all([
        database.getClient().user.findMany({
          select: {
            id: true,
            email: true,
            isAdmin: true,
            createdAt: true,
            _count: {
              select: {
                applications: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        database.getClient().user.count()
      ]);

      res.status(200).json({
        success: true,
        data: {
          users: users.map(user => ({
            id: user.id,
            email: user.email,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            applicationCount: user._count.applications
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        },
        message: 'Users retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('List users error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve users'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Promote user to admin
  promoteToAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json(ValidationUtil.createValidationError(['User ID is required']));
        return;
      }

      // Validate UUID
      const uuidValidation = ValidationUtil.validateUUID(userId);
      if (!uuidValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(uuidValidation.errors));
        return;
      }

      // Update user to admin
      const updatedUser = await this.userService.updateUser(userId, { isAdmin: true });

      // Log promotion
      SecurityLogger.logSuccess({
        type: 'AUTH_SUCCESS',
        userId: updatedUser.id,
        email: updatedUser.email,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'User promoted to admin',
        details: { promotedBy: req.user?.userId || 'unknown' }
      });

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'User promoted to admin successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Promote to admin error:', error);

      const { userId } = req.params;
      SecurityLogger.logError({
        type: 'UNAUTHORIZED_ACCESS',
        userId: req.user?.userId || 'unknown',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'Failed to promote user to admin',
        details: { targetUserId: userId }
      });

      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to promote user to admin'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Remove admin privileges
  demoteAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json(ValidationUtil.createValidationError(['User ID is required']));
        return;
      }

      // Validate UUID
      const uuidValidation = ValidationUtil.validateUUID(userId);
      if (!uuidValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(uuidValidation.errors));
        return;
      }

      // Prevent self-demotion
      if (userId === req.user?.userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot demote yourself'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Update user to remove admin privileges
      const updatedUser = await this.userService.updateUser(userId, { isAdmin: false });

      // Log demotion
      SecurityLogger.logWarning({
        type: 'AUTH_SUCCESS',
        userId: updatedUser.id,
        email: updatedUser.email,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'Admin privileges removed from user',
        details: { demotedBy: req.user?.userId || 'unknown' }
      });

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'Admin privileges removed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Demote admin error:', error);

      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove admin privileges'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Get system statistics (admin only)
  getSystemStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const database = this.userService['database'];

      const [
        totalUsers,
        totalAdmins,
        totalClasses,
        totalApplications,
        recentUsers
      ] = await Promise.all([
        database.getClient().user.count(),
        database.getClient().user.count({ where: { isAdmin: true } }),
        database.getClient().mClass.count(),
        database.getClient().application.count(),
        database.getClient().user.findMany({
          select: {
            id: true,
            email: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          statistics: {
            users: {
              total: totalUsers,
              admins: totalAdmins,
              regular: totalUsers - totalAdmins
            },
            classes: {
              total: totalClasses
            },
            applications: {
              total: totalApplications
            }
          },
          recentUsers
        },
        message: 'System statistics retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get system stats error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve system statistics'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

export default AdminController;