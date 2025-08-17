export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationUtil {
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    if (typeof email !== 'string') {
      errors.push('Email must be a string');
      return { isValid: false, errors };
    }

    // Email length check
    if (email.length > 254) {
      errors.push('Email must not exceed 254 characters');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    // More strict email validation
    const strictEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!strictEmailRegex.test(email)) {
      errors.push('Email contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (typeof password !== 'string') {
      errors.push('Password must be a string');
      return { isValid: false, errors };
    }

    // Length requirements
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    // Character requirements
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password must not contain more than 2 repeated characters in a row');
    }

    // Check for common patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains common patterns and is not secure');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    return sanitized;
  }

  static validateRequestBody(body: any, requiredFields: string[]): ValidationResult {
    const errors: string[] = [];

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      errors.push('Request body must be a valid JSON object');
      return { isValid: false, errors };
    }

    for (const field of requiredFields) {
      if (!body.hasOwnProperty(field)) {
        errors.push(`Field '${field}' is required`);
      } else if (body[field] === null || body[field] === undefined) {
        errors.push(`Field '${field}' cannot be null or undefined`);
      } else if (typeof body[field] === 'string' && body[field].trim() === '') {
        errors.push(`Field '${field}' cannot be empty`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUUID(uuid: string): ValidationResult {
    const errors: string[] = [];

    if (!uuid) {
      errors.push('UUID is required');
      return { isValid: false, errors };
    }

    if (typeof uuid !== 'string') {
      errors.push('UUID must be a string');
      return { isValid: false, errors };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      errors.push('Invalid UUID format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static createValidationError(errors: string[]): object {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default ValidationUtil;