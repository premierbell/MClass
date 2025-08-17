import PasswordUtil from '../../src/utils/password';
import bcrypt from 'bcrypt';

// Mock bcrypt functions for deterministic testing
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = 'mocked-hash';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await PasswordUtil.hashPassword(plainPassword);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(plainPassword, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should throw error when hashing fails', async () => {
      const plainPassword = 'testPassword123!';
      
      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing failed') as never);

      await expect(PasswordUtil.hashPassword(plainPassword)).rejects.toThrow('Failed to hash password');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = 'hashed-password';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await PasswordUtil.comparePassword(plainPassword, hashedPassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = 'hashed-password';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await PasswordUtil.comparePassword(plainPassword, hashedPassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should throw error when comparison fails', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = 'hashed-password';
      
      mockedBcrypt.compare.mockRejectedValue(new Error('Comparison failed') as never);

      await expect(PasswordUtil.comparePassword(plainPassword, hashedPassword)).rejects.toThrow('Failed to compare passwords');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept valid strong password', () => {
      const strongPassword = 'StrongPass123!';
      
      const result = PasswordUtil.validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';
      
      const result = PasswordUtil.validatePasswordStrength(shortPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      
      const result = PasswordUtil.validatePasswordStrength(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should reject password without lowercase letters', () => {
      const password = 'UPPERCASE123!';
      
      const result = PasswordUtil.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letters', () => {
      const password = 'lowercase123!';
      
      const result = PasswordUtil.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'NoNumbers!';
      
      const result = PasswordUtil.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'NoSpecialChars123';
      
      const result = PasswordUtil.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should reject password with repeated characters', () => {
      const password = 'TestPassword111!';
      
      const result = PasswordUtil.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not contain repeated characters');
    });

    it('should accumulate multiple validation errors', () => {
      const weakPassword = 'weak';
      
      const result = PasswordUtil.validatePasswordStrength(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password of specified length', () => {
      const length = 20;
      const password = PasswordUtil.generateRandomPassword(length);
      
      expect(password).toHaveLength(length);
    });

    it('should generate password of default length (16)', () => {
      const password = PasswordUtil.generateRandomPassword();
      
      expect(password).toHaveLength(16);
    });

    it('should generate password that passes strength validation', () => {
      const password = PasswordUtil.generateRandomPassword();
      const validation = PasswordUtil.validatePasswordStrength(password);
      
      expect(validation.isValid).toBe(true);
    });

    it('should contain at least one character from each required set', () => {
      const password = PasswordUtil.generateRandomPassword(16);
      
      // Test for lowercase
      expect(/[a-z]/.test(password)).toBe(true);
      
      // Test for uppercase
      expect(/[A-Z]/.test(password)).toBe(true);
      
      // Test for numbers
      expect(/\d/.test(password)).toBe(true);
      
      // Test for special characters
      expect(/[@$!%*?&]/.test(password)).toBe(true);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = PasswordUtil.generateRandomPassword();
      const password2 = PasswordUtil.generateRandomPassword();
      
      expect(password1).not.toBe(password2);
    });
  });
});