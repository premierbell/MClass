import { Request, Response, NextFunction } from 'express';
import JwtUtil, { JwtPayload } from '../utils/jwt';
import DatabaseService from '../services/database';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export class AuthMiddleware {
  private static database = DatabaseService.getInstance();

  static async authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = JwtUtil.extractTokenFromHeader(authHeader);

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Access token is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const payload = JwtUtil.verifyToken(token);

      // Optional: Verify user still exists in database
      const user = await this.database.getClient().user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, isAdmin: true }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Attach user information to request
      req.user = {
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : 'Invalid token'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  static async requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

    if (!req.user.isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  }

  static optional(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = JwtUtil.extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const payload = JwtUtil.verifyToken(token);
        req.user = payload;
      } catch (error) {
        // For optional auth, we ignore token errors and continue without user
        console.warn('Optional auth failed:', error);
      }
    }

    next();
  }
}

// Export convenience functions
export const authenticate = AuthMiddleware.authenticate.bind(AuthMiddleware);
export const requireAdmin = AuthMiddleware.requireAdmin.bind(AuthMiddleware);
export const optionalAuth = AuthMiddleware.optional.bind(AuthMiddleware);

// Composite middleware for admin routes
export const adminOnly = [authenticate, requireAdmin];