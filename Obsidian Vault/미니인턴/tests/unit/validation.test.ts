import { ValidationUtil } from '../../src/utils/validation';

describe('ValidationUtil', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user@domain.org',
        'test.email@example.co.uk',
        'user+tag@example.com',
        'test123@domain123.com'
      ];

      validEmails.forEach(email => {
        const result = ValidationUtil.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject clearly invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@missing-local.com',
        'double@@domain.com'
      ];

      invalidEmails.forEach(email => {
        const result = ValidationUtil.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject empty or null email', () => {
      const result1 = ValidationUtil.validateEmail('');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Email is required');

      const result2 = ValidationUtil.validateEmail(null as any);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Email is required');
    });

    it('should reject non-string email', () => {
      const result = ValidationUtil.validateEmail(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be a string');
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = ValidationUtil.validateEmail(longEmail);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must not exceed 254 characters');
    });

    it('should reject email with invalid characters', () => {
      const invalidEmail = 'test<>@example.com';
      const result = ValidationUtil.validateEmail(invalidEmail);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email contains invalid characters');
    });
  });

  describe('validatePassword', () => {
    it('should accept strong valid passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Pass1',
        'ValidPass9$'
      ];

      strongPasswords.forEach(password => {
        const result = ValidationUtil.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';
      const result = ValidationUtil.validatePassword(shortPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = ValidationUtil.validatePassword(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should reject password without lowercase letters', () => {
      const password = 'UPPERCASE123!';
      const result = ValidationUtil.validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letters', () => {
      const password = 'lowercase123!';
      const result = ValidationUtil.validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'NoNumbers!';
      const result = ValidationUtil.validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'NoSpecialChars123';
      const result = ValidationUtil.validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should reject password with repeated characters', () => {
      const password = 'TestPassword111!';
      const result = ValidationUtil.validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not contain more than 2 repeated characters in a row');
    });

    it('should reject password with common patterns', () => {
      const commonPasswords = [
        'Password123456!',
        'TestPassword123!',
        'MyQwerty123!',
        'AdminPassword1!'
      ];

      commonPasswords.forEach(password => {
        const result = ValidationUtil.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password contains common patterns and is not secure');
      });
    });

    it('should reject empty or null password', () => {
      const result1 = ValidationUtil.validatePassword('');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Password is required');

      const result2 = ValidationUtil.validatePassword(null as any);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Password is required');
    });

    it('should reject non-string password', () => {
      const result = ValidationUtil.validatePassword(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be a string');
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags from string', () => {
      const input = '<div>Hello World</div><br/>';
      const result = ValidationUtil.sanitizeString(input);
      
      expect(result).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = ValidationUtil.sanitizeString(input);
      
      expect(result).toBe('Hello World');
    });

    it('should remove null bytes', () => {
      const input = 'Hello\0World';
      const result = ValidationUtil.sanitizeString(input);
      
      expect(result).toBe('HelloWorld');
    });

    it('should return empty string for non-string input', () => {
      const inputs = [123, null, undefined, {}, []];
      
      inputs.forEach(input => {
        const result = ValidationUtil.sanitizeString(input as any);
        expect(result).toBe('');
      });
    });

    it('should handle complex HTML and malicious content', () => {
      const input = '<div onclick="alert(\'xss\')">Content</div>\0';
      const result = ValidationUtil.sanitizeString(input);
      
      expect(result).toBe('Content');
    });
  });

  describe('validateRequestBody', () => {
    it('should accept valid body with all required fields', () => {
      const body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };
      const requiredFields = ['email', 'password', 'name'];
      
      const result = ValidationUtil.validateRequestBody(body, requiredFields);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid body that is not an object', () => {
      const bodies = [null, undefined, 'string', 123];
      
      bodies.forEach(body => {
        const result = ValidationUtil.validateRequestBody(body, ['field']);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Request body must be a valid JSON object');
      });
    });

    it('should reject array as body', () => {
      const result = ValidationUtil.validateRequestBody([], ['field']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Request body must be a valid JSON object');
    });

    it('should reject body missing required fields', () => {
      const body = { email: 'test@example.com' };
      const requiredFields = ['email', 'password', 'name'];
      
      const result = ValidationUtil.validateRequestBody(body, requiredFields);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field \'password\' is required');
      expect(result.errors).toContain('Field \'name\' is required');
    });

    it('should reject body with null or undefined fields', () => {
      const body = {
        email: 'test@example.com',
        password: null,
        name: undefined
      };
      const requiredFields = ['email', 'password', 'name'];
      
      const result = ValidationUtil.validateRequestBody(body, requiredFields);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field \'password\' cannot be null or undefined');
      expect(result.errors).toContain('Field \'name\' cannot be null or undefined');
    });

    it('should reject body with empty string fields', () => {
      const body = {
        email: 'test@example.com',
        password: '   ',
        name: ''
      };
      const requiredFields = ['email', 'password', 'name'];
      
      const result = ValidationUtil.validateRequestBody(body, requiredFields);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field \'password\' cannot be empty');
      expect(result.errors).toContain('Field \'name\' cannot be empty');
    });
  });

  describe('validateUUID', () => {
    it('should accept valid UUID v4 format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        const result = ValidationUtil.validateUUID(uuid);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        'gggggggg-gggg-gggg-gggg-gggggggggggg'
      ];

      invalidUUIDs.forEach(uuid => {
        const result = ValidationUtil.validateUUID(uuid);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid UUID format');
      });
    });

    it('should reject empty or null UUID', () => {
      const result1 = ValidationUtil.validateUUID('');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('UUID is required');

      const result2 = ValidationUtil.validateUUID(null as any);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('UUID is required');
    });

    it('should reject non-string UUID', () => {
      const result = ValidationUtil.validateUUID(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('UUID must be a string');
    });
  });

  describe('createValidationError', () => {
    it('should create properly formatted validation error object', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3'];
      const result = ValidationUtil.createValidationError(errors) as any;

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      });
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
    });

    it('should handle empty errors array', () => {
      const errors: string[] = [];
      const result = ValidationUtil.createValidationError(errors);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: []
        }
      });
    });

    it('should include valid ISO timestamp', () => {
      const errors = ['Test error'];
      const result = ValidationUtil.createValidationError(errors) as any;

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});