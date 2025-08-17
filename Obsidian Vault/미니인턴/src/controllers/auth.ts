import { Request, Response } from 'express';
import UserService from '../services/user';
import { AuthenticatedRequest } from '../middleware/auth';

class AuthController {
  private userService = new UserService();

  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

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

      // Create user
      const user = await this.userService.createUser({
        email,
        password
      });

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
      console.error('Signup error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
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
          message: 'Registration failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Authenticate user
      const loginResult = await this.userService.authenticateUser({
        email,
        password
      });

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
      console.error('Login error:', error);

      if (error instanceof Error && error.message.includes('Invalid email or password')) {
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

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  refresh = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Generate new token with current user data (user is already authenticated)
      const newToken = await this.userService.refreshUserToken(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          accessToken: newToken
        },
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Token refresh error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Token refresh failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

export default AuthController;