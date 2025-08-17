/**
 * User-friendly Error Messages and Constants
 * 
 * This file contains standardized error messages that are safe to expose
 * to users without revealing sensitive system information.
 */

export const ErrorMessages = {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED: 'Please sign in to access this resource',
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again',
  TOKEN_INVALID: 'Invalid authentication token. Please sign in again',
  ACCESS_DENIED: 'You do not have permission to access this resource',
  ADMIN_ONLY: 'This action requires administrator privileges',
  
  // User Management
  EMAIL_ALREADY_EXISTS: 'An account with this email address already exists',
  USER_NOT_FOUND: 'User account not found',
  WEAK_PASSWORD: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters',
  INVALID_EMAIL_FORMAT: 'Please provide a valid email address',
  
  // Class Management
  CLASS_NOT_FOUND: 'The requested class could not be found',
  CLASS_CREATION_FAILED: 'Failed to create class. Please check your information and try again',
  CLASS_UPDATE_FAILED: 'Failed to update class information',
  CLASS_DELETE_FAILED: 'Failed to delete class. This class may have existing applications',
  INVALID_CLASS_DATES: 'Class start date must be before end date and both must be in the future',
  CLASS_DURATION_INVALID: 'Class duration must be between 30 minutes and 8 hours',
  
  // Applications
  APPLICATION_NOT_FOUND: 'Application not found',
  ALREADY_APPLIED: 'You have already applied to this class',
  CAPACITY_EXCEEDED: 'This class is fully booked. No more applications can be accepted',
  APPLICATION_DEADLINE_PASSED: 'The application deadline for this class has passed',
  CLASS_ALREADY_STARTED: 'Cannot apply to or cancel a class that has already started',
  APPLICATION_FAILED: 'Failed to submit application. Please try again',
  CANCELLATION_FAILED: 'Failed to cancel application. Please try again',
  
  // Validation
  VALIDATION_FAILED: 'Please check the provided information and correct any errors',
  INVALID_UUID: 'Invalid identifier format',
  REQUIRED_FIELD_MISSING: 'Required information is missing',
  INVALID_DATE_FORMAT: 'Please provide a valid date in the correct format',
  INVALID_NUMBER_FORMAT: 'Please provide a valid number',
  STRING_TOO_LONG: 'The provided text is too long',
  STRING_TOO_SHORT: 'The provided text is too short',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests. Please wait before trying again',
  RATE_LIMIT_EXCEEDED: 'Request limit exceeded. Please try again later',
  
  // System Errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later',
  DATABASE_ERROR: 'A database error occurred. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  
  // Resource Not Found
  ROUTE_NOT_FOUND: 'The requested endpoint does not exist',
  RESOURCE_NOT_FOUND: 'The requested resource could not be found',
  
  // Pagination
  INVALID_PAGE_NUMBER: 'Page number must be a positive integer',
  INVALID_LIMIT: 'Limit must be between 1 and 100',
  
  // Business Logic
  INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions for this action',
  OPERATION_NOT_ALLOWED: 'This operation is not allowed at this time',
  CONFLICT_ERROR: 'This action conflicts with existing data',
  DEPENDENCY_ERROR: 'This item cannot be deleted because it is referenced by other data'
} as const;

export const SuccessMessages = {
  // Authentication
  LOGIN_SUCCESS: 'Successfully signed in',
  LOGOUT_SUCCESS: 'Successfully signed out',
  TOKEN_REFRESHED: 'Authentication token refreshed',
  
  // User Management
  USER_CREATED: 'User account created successfully',
  USER_UPDATED: 'User information updated successfully',
  USER_DELETED: 'User account deleted successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  
  // Class Management
  CLASS_CREATED: 'Class created successfully',
  CLASS_UPDATED: 'Class information updated successfully',
  CLASS_DELETED: 'Class deleted successfully',
  CLASS_RETRIEVED: 'Class information retrieved successfully',
  CLASSES_LISTED: 'Classes retrieved successfully',
  
  // Applications
  APPLICATION_SUBMITTED: 'Application submitted successfully',
  APPLICATION_CANCELLED: 'Application cancelled successfully',
  APPLICATIONS_RETRIEVED: 'Applications retrieved successfully',
  
  // General
  OPERATION_SUCCESSFUL: 'Operation completed successfully',
  DATA_RETRIEVED: 'Data retrieved successfully',
  DATA_UPDATED: 'Data updated successfully',
  DATA_DELETED: 'Data deleted successfully'
} as const;

export const ValidationMessages = {
  EMAIL: {
    REQUIRED: 'Email address is required',
    INVALID: 'Please provide a valid email address',
    TOO_LONG: 'Email address is too long (maximum 255 characters)'
  },
  
  PASSWORD: {
    REQUIRED: 'Password is required',
    TOO_SHORT: 'Password must be at least 8 characters long',
    TOO_LONG: 'Password is too long (maximum 128 characters)',
    WEAK: 'Password must contain uppercase, lowercase, numbers, and special characters'
  },
  
  CLASS: {
    TITLE_REQUIRED: 'Class title is required',
    TITLE_TOO_SHORT: 'Class title must be at least 3 characters long',
    TITLE_TOO_LONG: 'Class title is too long (maximum 100 characters)',
    DESCRIPTION_REQUIRED: 'Class description is required',
    DESCRIPTION_TOO_SHORT: 'Class description must be at least 10 characters long',
    DESCRIPTION_TOO_LONG: 'Class description is too long (maximum 500 characters)',
    MAX_PARTICIPANTS_REQUIRED: 'Maximum participants is required',
    MAX_PARTICIPANTS_MIN: 'At least 1 participant is required',
    MAX_PARTICIPANTS_MAX: 'Maximum participants cannot exceed 1000',
    START_DATE_REQUIRED: 'Start date is required',
    END_DATE_REQUIRED: 'End date is required',
    INVALID_DATE_ORDER: 'Start date must be before end date',
    PAST_DATE: 'Date must be in the future',
    DURATION_TOO_SHORT: 'Class duration must be at least 30 minutes',
    DURATION_TOO_LONG: 'Class duration cannot exceed 8 hours'
  },
  
  PAGINATION: {
    PAGE_INVALID: 'Page number must be a positive integer',
    LIMIT_INVALID: 'Limit must be between 1 and 100',
    LIMIT_TOO_HIGH: 'Limit cannot exceed 100'
  },
  
  UUID: {
    INVALID: 'Invalid identifier format'
  }
} as const;

/**
 * Helper function to get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  
  // Map common technical errors to user-friendly messages
  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    return ErrorMessages.EMAIL_ALREADY_EXISTS;
  }
  
  if (message.includes('not found') || message.includes('does not exist')) {
    return ErrorMessages.RESOURCE_NOT_FOUND;
  }
  
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return ErrorMessages.AUTHENTICATION_REQUIRED;
  }
  
  if (message.includes('forbidden') || message.includes('permission')) {
    return ErrorMessages.ACCESS_DENIED;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorMessages.VALIDATION_FAILED;
  }
  
  if (message.includes('rate limit') || message.includes('too many')) {
    return ErrorMessages.TOO_MANY_REQUESTS;
  }
  
  if (message.includes('capacity') || message.includes('full')) {
    return ErrorMessages.CAPACITY_EXCEEDED;
  }
  
  if (message.includes('already applied') || message.includes('duplicate application')) {
    return ErrorMessages.ALREADY_APPLIED;
  }
  
  // Default to generic error message for unknown errors
  return ErrorMessages.INTERNAL_ERROR;
}

/**
 * Development vs Production message handling
 */
export function getContextualMessage(
  userMessage: string,
  technicalMessage?: string
): string {
  if (process.env.NODE_ENV === 'development' && technicalMessage) {
    return `${userMessage} (Debug: ${technicalMessage})`;
  }
  return userMessage;
}

export default {
  ErrorMessages,
  SuccessMessages,
  ValidationMessages,
  getUserFriendlyMessage,
  getContextualMessage
};