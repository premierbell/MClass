import { Response } from 'express';
import MClassService, { CreateMClassData } from '../services/mclass';
import { AuthenticatedRequest } from '../middleware/auth';
import ValidationUtil from '../utils/validation';
import SecurityLogger from '../utils/logger';

class MClassController {
  private mclassService = new MClassService();

  // Create new M-Class (admin only)
  createClass = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate request body structure
      const bodyValidation = ValidationUtil.validateRequestBody(req.body, [
        'title',
        'description',
        'maxParticipants',
        'startAt',
        'endAt'
      ]);

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

      let { title, description, maxParticipants, startAt, endAt } = req.body;

      // Sanitize string inputs
      title = ValidationUtil.sanitizeString(title);
      description = ValidationUtil.sanitizeString(description);

      // Validate title
      if (!title || title.length < 3 || title.length > 100) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Title must be between 3 and 100 characters'])
        );
        return;
      }

      // Validate description
      if (!description || description.length > 500) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Description must not exceed 500 characters'])
        );
        return;
      }

      // Validate maxParticipants
      if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Maximum participants must be a positive integer'])
        );
        return;
      }

      // Validate and parse dates
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);
      const now = new Date();

      if (isNaN(startDate.getTime())) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Start date must be a valid ISO date'])
        );
        return;
      }

      if (isNaN(endDate.getTime())) {
        res.status(400).json(
          ValidationUtil.createValidationError(['End date must be a valid ISO date'])
        );
        return;
      }

      // Business logic validation
      if (startDate <= now) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Start date must be in the future'])
        );
        return;
      }

      if (endDate <= startDate) {
        res.status(400).json(
          ValidationUtil.createValidationError(['End date must be after start date'])
        );
        return;
      }

      // Create class data
      const classData: CreateMClassData = {
        title,
        description,
        maxParticipants,
        startAt: startDate,
        endAt: endDate,
        hostId: req.user!.userId
      };

      // Create the class
      const newClass = await this.mclassService.createClass(classData);

      // Log successful class creation
      SecurityLogger.logSuccess({
        type: 'RESOURCE_CREATED',
        userId: req.user!.userId,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'M-Class created successfully',
        details: {
          classId: newClass.id,
          title: newClass.title,
          maxParticipants: newClass.maxParticipants
        }
      });

      res.status(201).json({
        success: true,
        data: {
          class: {
            id: newClass.id,
            title: newClass.title,
            description: newClass.description,
            maxParticipants: newClass.maxParticipants,
            startAt: newClass.startAt,
            endAt: newClass.endAt,
            hostId: newClass.hostId,
            createdAt: newClass.createdAt,
            updatedAt: newClass.updatedAt
          }
        },
        message: 'M-Class created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Create class error:', error);

      SecurityLogger.logError({
        type: 'RESOURCE_CREATION_FAILURE',
        userId: req.user?.userId || 'unknown',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'M-Class creation failed',
        details: { title: req.body?.title }
      });

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'A class with this title already exists'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create M-Class'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Get all classes with pagination
  getClasses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50 per page
      const includeExpired = req.query.includeExpired === 'true';

      if (page < 1 || limit < 1) {
        res.status(400).json(
          ValidationUtil.createValidationError(['Page and limit must be positive integers'])
        );
        return;
      }

      const result = await this.mclassService.getClasses(page, limit, includeExpired);

      res.status(200).json({
        success: true,
        data: {
          classes: result.classes.map(mclass => ({
            id: mclass.id,
            title: mclass.title,
            description: mclass.description,
            maxParticipants: mclass.maxParticipants,
            currentParticipants: mclass.currentParticipants,
            availableSpots: Math.max(0, mclass.maxParticipants - mclass.currentParticipants),
            isFullyBooked: mclass.currentParticipants >= mclass.maxParticipants,
            startAt: mclass.startAt,
            endAt: mclass.endAt,
            host: mclass.host,
            createdAt: mclass.createdAt
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
        message: 'Classes retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get classes error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve classes'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Get single class details
  getClassById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;

      if (!classId) {
        res.status(400).json(ValidationUtil.createValidationError(['Class ID is required']));
        return;
      }

      // Validate UUID
      const uuidValidation = ValidationUtil.validateUUID(classId);
      if (!uuidValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(uuidValidation.errors));
        return;
      }

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

      res.status(200).json({
        success: true,
        data: {
          class: {
            id: mclass.id,
            title: mclass.title,
            description: mclass.description,
            maxParticipants: mclass.maxParticipants,
            currentParticipants: mclass.currentParticipants,
            availableSpots: Math.max(0, mclass.maxParticipants - mclass.currentParticipants),
            isFullyBooked: mclass.currentParticipants >= mclass.maxParticipants,
            startAt: mclass.startAt,
            endAt: mclass.endAt,
            host: mclass.host,
            createdAt: mclass.createdAt,
            updatedAt: mclass.updatedAt
          }
        },
        message: 'Class details retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get class by ID error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve class details'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // Delete class (admin only)
  deleteClass = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;

      if (!classId) {
        res.status(400).json(ValidationUtil.createValidationError(['Class ID is required']));
        return;
      }

      // Validate UUID
      const uuidValidation = ValidationUtil.validateUUID(classId);
      if (!uuidValidation.isValid) {
        res.status(400).json(ValidationUtil.createValidationError(uuidValidation.errors));
        return;
      }

      // Check if class exists before deletion
      const existingClass = await this.mclassService.getClassById(classId);
      if (!existingClass) {
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

      // Delete the class (cascade will handle applications)
      await this.mclassService.deleteClass(classId);

      // Log successful deletion
      SecurityLogger.logWarning({
        type: 'RESOURCE_DELETED',
        userId: req.user!.userId,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'M-Class deleted successfully',
        details: {
          classId,
          title: existingClass.title,
          affectedApplications: existingClass.currentParticipants
        }
      });

      res.status(200).json({
        success: true,
        data: {
          deletedClass: {
            id: classId,
            title: existingClass.title
          }
        },
        message: 'M-Class deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Delete class error:', error);

      SecurityLogger.logError({
        type: 'RESOURCE_DELETION_FAILURE',
        userId: req.user?.userId || 'unknown',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        message: 'M-Class deletion failed',
        details: { classId: req.params.classId }
      });

      if (error instanceof Error && error.message.includes('not found')) {
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

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete M-Class'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

export default MClassController;