/**
 * Request Validation Middleware using Express-Validator
 * 
 * This module provides comprehensive input validation for all API endpoints
 * with standardized error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { sendValidationError } from '../utils/response';
import { ValidationError } from '../types/responses';

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    sendValidationError(res, validationErrors, 'Validation failed');
    return;
  }
  
  next();
};

/**
 * Common validation rules
 */
export const commonValidations = {
  email: body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  uuid: (field: string) => param(field)
    .isUUID(4)
    .withMessage(`${field} must be a valid UUID`),

  positiveInteger: (field: string, min: number = 1, max?: number) => {
    let validation = body(field)
      .isInt({ min })
      .withMessage(`${field} must be a positive integer (minimum: ${min})`);
    
    if (max) {
      validation = validation.isInt({ max }).withMessage(`${field} must not exceed ${max}`);
    }
    
    return validation;
  },

  dateString: (field: string) => body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date string`)
    .toDate(),

  string: (field: string, minLength: number = 1, maxLength: number = 255) => body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`),

  optionalString: (field: string, maxLength: number = 255) => body(field)
    .optional()
    .isString()
    .withMessage(`${field} must be a string`)
    .trim()
    .isLength({ max: maxLength })
    .withMessage(`${field} must not exceed ${maxLength} characters`),

  pagination: {
    page: query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    
    limit: query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  }
};

/**
 * User Authentication Validation Schemas
 */
export const userValidation = {
  signup: [
    commonValidations.email,
    commonValidations.password,
    handleValidationErrors
  ],

  login: [
    commonValidations.email,
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ max: 128 })
      .withMessage('Password must not exceed 128 characters'),
    handleValidationErrors
  ]
};

/**
 * M-Class Validation Schemas
 */
export const mclassValidation = {
  create: [
    commonValidations.string('title', 3, 100),
    commonValidations.string('description', 10, 500),
    commonValidations.positiveInteger('maxParticipants', 1, 1000),
    commonValidations.dateString('startAt'),
    commonValidations.dateString('endAt'),
    
    // Custom validation for date logic
    body('startAt').custom((startAt, { req }) => {
      const endAt = new Date(req.body.endAt);
      const start = new Date(startAt);
      const now = new Date();
      
      if (start <= now) {
        throw new Error('Start date must be in the future');
      }
      
      if (start >= endAt) {
        throw new Error('Start date must be before end date');
      }
      
      return true;
    }),
    
    body('endAt').custom((endAt, { req }) => {
      const startAt = new Date(req.body.startAt);
      const end = new Date(endAt);
      const now = new Date();
      
      if (end <= now) {
        throw new Error('End date must be in the future');
      }
      
      // Minimum class duration: 30 minutes
      const minDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
      if (end.getTime() - startAt.getTime() < minDuration) {
        throw new Error('Class duration must be at least 30 minutes');
      }
      
      // Maximum class duration: 8 hours
      const maxDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      if (end.getTime() - startAt.getTime() > maxDuration) {
        throw new Error('Class duration must not exceed 8 hours');
      }
      
      return true;
    }),
    
    handleValidationErrors
  ],

  update: [
    commonValidations.uuid('classId'),
    commonValidations.optionalString('title', 100),
    commonValidations.optionalString('description', 500),
    
    body('maxParticipants')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('maxParticipants must be between 1 and 1000'),
    
    body('startAt')
      .optional()
      .isISO8601()
      .withMessage('startAt must be a valid ISO 8601 date string')
      .toDate(),
    
    body('endAt')
      .optional()
      .isISO8601()
      .withMessage('endAt must be a valid ISO 8601 date string')
      .toDate(),
    
    handleValidationErrors
  ],

  getById: [
    commonValidations.uuid('classId'),
    handleValidationErrors
  ],

  delete: [
    commonValidations.uuid('classId'),
    handleValidationErrors
  ],

  list: [
    commonValidations.pagination.page,
    commonValidations.pagination.limit,
    
    query('search')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    query('status')
      .optional()
      .isIn(['upcoming', 'ongoing', 'completed'])
      .withMessage('Status must be one of: upcoming, ongoing, completed'),
    
    handleValidationErrors
  ]
};

/**
 * Application Validation Schemas
 */
export const applicationValidation = {
  apply: [
    commonValidations.uuid('classId'),
    handleValidationErrors
  ],

  cancel: [
    commonValidations.uuid('classId'),
    handleValidationErrors
  ],

  getUserApplications: [
    commonValidations.pagination.page,
    commonValidations.pagination.limit,
    handleValidationErrors
  ],

  getClassApplications: [
    commonValidations.uuid('classId'),
    commonValidations.pagination.page,
    commonValidations.pagination.limit,
    handleValidationErrors
  ]
};

/**
 * Admin Validation Schemas
 */
export const adminValidation = {
  createUser: [
    commonValidations.email,
    commonValidations.password,
    body('isAdmin')
      .optional()
      .isBoolean()
      .withMessage('isAdmin must be a boolean'),
    handleValidationErrors
  ],

  updateUser: [
    commonValidations.uuid('userId'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail(),
    
    body('isAdmin')
      .optional()
      .isBoolean()
      .withMessage('isAdmin must be a boolean'),
    
    handleValidationErrors
  ],

  deleteUser: [
    commonValidations.uuid('userId'),
    handleValidationErrors
  ],

  listUsers: [
    commonValidations.pagination.page,
    commonValidations.pagination.limit,
    
    query('search')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    query('isAdmin')
      .optional()
      .isBoolean()
      .withMessage('isAdmin filter must be a boolean'),
    
    handleValidationErrors
  ]
};

/**
 * Utility function to create custom validation chains
 */
export function createValidationChain(validations: ValidationChain[]): (ValidationChain | typeof handleValidationErrors)[] {
  return [...validations, handleValidationErrors];
}

/**
 * Sanitization helpers
 */
export const sanitize = {
  trimAndEscape: (field: string) => body(field).trim().escape(),
  normalizeEmail: (field: string) => body(field).normalizeEmail(),
  toInt: (field: string) => body(field).toInt(),
  toFloat: (field: string) => body(field).toFloat(),
  toBoolean: (field: string) => body(field).toBoolean(),
  toDate: (field: string) => body(field).toDate()
};

export default {
  userValidation,
  mclassValidation,
  applicationValidation,
  adminValidation,
  commonValidations,
  handleValidationErrors,
  createValidationChain,
  sanitize
};