import { Response } from 'express';
import ApplicationService from '../services/application';
import MClassService from '../services/mclass';
import EmailService from '../services/email';
import { AuthenticatedRequest } from '../middleware/auth';
import ValidationUtil from '../utils/validation';
import SecurityLogger from '../utils/logger';

class ApplicationController {
  private applicationService = new ApplicationService();
  private mclassService = new MClassService();
  private emailService = new EmailService();

  // Apply to a class
  applyToClass = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;
      const userId = req.user!.userId;

      // Validate classId
      if (!classId) {
        res.status(400).json(ValidationUtil.createValidationError(['Class ID is required']));
        return;
      }

      const uuidValidation = ValidationUtil.validateUUID(classId);
      if (!uuidValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(uuidValidation.errors));
        return;
      }

      // Check if class exists
      const mclass = await this.mclassService.getClassById(classId);
      if (!mclass) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Class not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if class has already started or ended
      const now = new Date();
      if (mclass.startAt <= now) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot apply to a class that has already started'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Note: Capacity and duplicate checking is now handled atomically 
      // within the ApplicationService.createApplication transaction

      // Create application
      const application = await this.applicationService.createApplication({
        userId,
        classId
      });

      // Log successful application
      SecurityLogger.logSuccess({
        type: 'RESOURCE_CREATED',
        userId,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'User applied to class successfully',
        details: {
          applicationId: application.id,
          classId: mclass.id,
          classTitle: mclass.title
        }
      });

      // 이메일 알림 전송 (백그라운드에서 실행)
      this.sendApplicationSuccessEmail(req.user!.email, mclass, application.createdAt)
        .catch((error: any) => {
          console.error('Failed to send application success email:', error);
          // 이메일 전송 실패는 로그만 남기고 API 응답에는 영향을 주지 않음
        });

      res.status(201).json({
        success: true,
        data: {
          application: {
            id: application.id,
            userId: application.userId,
            classId: application.classId,
            createdAt: application.createdAt,
            class: {
              id: mclass.id,
              title: mclass.title,
              description: mclass.description,
              startAt: mclass.startAt,
              endAt: mclass.endAt
            }
          }
        },
        message: 'Application submitted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Apply to class error:', error);

      SecurityLogger.logError({
        type: 'RESOURCE_CREATION_FAILURE',
        userId: req.user?.userId || 'unknown',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'Class application failed',
        details: { classId: req.params.classId }
      });

      if (error instanceof Error) {
        if (error.message.includes('already applied')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'You have already applied to this class'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (error.message.includes('Class is fully booked')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CAPACITY_EXCEEDED',
              message: 'Class is fully booked. No more applications can be accepted.'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (error.message.includes('Class not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Class not found'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (error.message.includes('Invalid user ID or class ID')) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid class or user information'
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
          message: 'Failed to submit application'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Get user's applications
  getUserApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      if (page < 1 || limit < 1) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Page and limit must be positive integers'])
        );
        return;
      }

      const result = await this.applicationService.getUserApplications(userId, page, limit);

      res.status(200).json({
        success: true,
        data: {
          applications: result.applications.map(app => ({
            id: app.id,
            classId: app.classId,
            createdAt: app.createdAt,
            class: {
              id: app.mclass.id,
              title: app.mclass.title,
              description: app.mclass.description,
              maxParticipants: app.mclass.maxParticipants,
              startAt: app.mclass.startAt,
              endAt: app.mclass.endAt,
              host: app.mclass.host
            }
          })),
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: page < result.totalPages,
            hasPrev: page > 1
          }
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
          message: 'Failed to retrieve applications'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Get applications for a specific class (admin or class host only)
  getClassApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;
      const userId = req.user!.userId;
      const isAdmin = req.user!.isAdmin;

      // Validate classId
      if (!classId) {
        res.status(400).json(ValidationUtil.createValidationError(['Class ID is required']));
        return;
      }

      const uuidValidation = ValidationUtil.validateUUID(classId);
      if (!uuidValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(uuidValidation.errors));
        return;
      }

      // Check if class exists
      const mclass = await this.mclassService.getClassById(classId);
      if (!mclass) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Class not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user is admin or class host
      const isHost = await this.mclassService.isUserHost(classId, userId);
      if (!isAdmin && !isHost) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only admin or class host can view applications'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      if (page < 1 || limit < 1) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Page and limit must be positive integers'])
        );
        return;
      }

      const result = await this.applicationService.getClassApplications(classId, page, limit);

      res.status(200).json({
        success: true,
        data: {
          class: {
            id: mclass.id,
            title: mclass.title,
            maxParticipants: mclass.maxParticipants,
            currentParticipants: mclass.currentParticipants
          },
          applications: result.applications.map(app => ({
            id: app.id,
            userId: app.userId,
            createdAt: app.createdAt,
            user: app.user
          })),
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: page < result.totalPages,
            hasPrev: page > 1
          }
        },
        message: 'Class applications retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get class applications error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve class applications'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Cancel application
  cancelApplication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;
      const userId = req.user!.userId;

      // Validate classId
      if (!classId) {
        res.status(400).json(ValidationUtil.createValidationError(['Class ID is required']));
        return;
      }

      const uuidValidation = ValidationUtil.validateUUID(classId);
      if (!uuidValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(uuidValidation.errors));
        return;
      }

      // Check if class exists
      const mclass = await this.mclassService.getClassById(classId);
      if (!mclass) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Class not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if class has already started
      const now = new Date();
      if (mclass.startAt <= now) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot cancel application for a class that has already started'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Cancel application
      await this.applicationService.cancelApplication(userId, classId);

      // Log successful cancellation
      SecurityLogger.logWarning({
        type: 'RESOURCE_DELETED',
        userId,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'User cancelled class application',
        details: {
          classId: mclass.id,
          classTitle: mclass.title
        }
      });

      res.status(200).json({
        success: true,
        data: {
          class: {
            id: mclass.id,
            title: mclass.title
          }
        },
        message: 'Application cancelled successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cancel application error:', error);

      SecurityLogger.logError({
        type: 'RESOURCE_DELETION_FAILURE',
        userId: req.user?.userId || 'unknown',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'Application cancellation failed',
        details: { classId: req.params.classId }
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel application'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * 신청 성공 이메일 전송 (백그라운드 처리)
   */
  private async sendApplicationSuccessEmail(
    userEmail: string, 
    mclass: any, 
    applicationDate: Date
  ): Promise<void> {
    try {
      await this.emailService.sendMClassApplicationSuccessEmail({
        userEmail,
        className: mclass.title,
        classStartDate: mclass.startAt.toISOString(),
        classEndDate: mclass.endAt.toISOString(),
        applicationDate: applicationDate.toISOString()
      });
      
      console.log('Application success email sent to:', userEmail);
    } catch (error) {
      console.error('Failed to send application success email:', error);
      throw error;
    }
  }
}

export default ApplicationController;