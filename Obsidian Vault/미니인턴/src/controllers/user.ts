import { Request, Response } from 'express';
import UserService from '../services/user';
import { AuthenticatedRequest } from '../middleware/auth';
import ValidationUtil from '../utils/validation';
import SecurityLogger from '../utils/logger';

class UserController {
  private userService = new UserService();

  signup = async (req: Request, res: Response): Promise<void> => {
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

      // Create user
      const user = await this.userService.createUser({
        email,
        password
      });

      // Log successful signup
      SecurityLogger.logSignupSuccess(
        user.email,
        user.id,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt
          }
        },
        message: 'User registered successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('User signup error:', error);

      const { email } = req.body;
      const ip = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          SecurityLogger.logSignupFailure(email, ip, userAgent, 'Email already exists');
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
          SecurityLogger.logSignupFailure(email, ip, userAgent, 'Password validation failed');
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

      SecurityLogger.logSignupFailure(email, ip, userAgent, 'Internal server error');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body structure
      const bodyValidation = ValidationUtil.validateRequestBody(req.body, ['email', 'password']);
      if (!bodyValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(bodyValidation.errors));
        return;
      }

      let { email, password } = req.body;

      // Sanitize inputs
      email = ValidationUtil.sanitizeString(email);
      password = ValidationUtil.sanitizeString(password);

      // Basic email validation for login (less strict than signup)
      if (!email || email.length === 0) {
        res.status(400).json(ValidationUtil.createValidationError(['Email is required']));
        return;
      }

      if (!password || password.length === 0) {
        res.status(400).json(ValidationUtil.createValidationError(['Password is required']));
        return;
      }

      // Authenticate user
      const loginResult = await this.userService.authenticateUser({
        email,
        password
      });

      // Log successful login
      SecurityLogger.logAuthSuccess(
        loginResult.user.email,
        loginResult.user.id,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      res.status(200).json({
        success: true,
        data: {
          user: loginResult.user,
          accessToken: loginResult.accessToken
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('User login error:', error);

      const { email } = req.body;
      const ip = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (error instanceof Error && error.message.includes('Invalid email or password')) {
        SecurityLogger.logAuthFailure(email, ip, userAgent, 'Invalid credentials');
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      SecurityLogger.logAuthFailure(email, ip, userAgent, 'Internal server error');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  getApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const applications = await this.userService.getUserApplications(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          applications,
          total: applications.length
        },
        message: 'User applications retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get user applications error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user applications'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = await this.userService.getUserById(req.user.userId);

      if (!user) {
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

      res.status(200).json({
        success: true,
        data: {
          user
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get user profile error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user profile'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { email, password } = req.body;
      const updateData: any = {};

      if (email) {
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid email format'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }
        updateData.email = email;
      }

      if (password) {
        updateData.password = password;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields provided for update'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedUser = await this.userService.updateUser(req.user.userId, updateData);

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'User profile updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update user profile error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already taken')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Email is already taken by another user'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (error.message.includes('Password validation failed')) {
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

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user profile'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

export default UserController;