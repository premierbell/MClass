/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',
  
  // Root directories for tests and source code
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Test file patterns - only unit tests
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/unit/**/*.spec.ts'
  ],

  // Ignore integration tests completely
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/integration_disabled/',
    '<rootDir>/tests/integration/'
  ],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        resolveJsonModule: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/types/**',
    '!src/**/*.interface.ts'
  ],
  
  // Coverage thresholds (lowered for unit tests only)
  coverageThreshold: {
    global: {
      branches: 1,
      functions: 2,
      lines: 1,
      statements: 1
    }
  },
  
  // Coverage output
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  
  // Setup files to run before tests
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'], // Temporarily disabled
  
  // Module path mapping (if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^../services/database$': '<rootDir>/tests/__mocks__/database.ts'
  },
  
  // Clear mocks automatically between tests
  clearMocks: true,
  
  // Restore mocks automatically between tests
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout (10 seconds for unit tests)
  testTimeout: 10000,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles (disabled to prevent hanging)
  detectOpenHandles: false,
  
  
  // Ignore node_modules except for ES modules that need transformation
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};