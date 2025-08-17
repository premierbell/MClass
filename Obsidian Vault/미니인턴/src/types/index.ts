// Re-export standardized response types
export * from './responses';

// Legacy response types (deprecated - use types from ./responses instead)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// User related types
export interface User {
  id: string;
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSignupRequest {
  email: string;
  password: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserLoginResponse {
  accessToken: string;
  user: Omit<User, 'password'>;
}

// M-Class related types
export interface MClass {
  id: string;
  title: string;
  description: string;
  maxParticipants: number;
  startAt: Date;
  endAt: Date;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MClassCreateRequest {
  title: string;
  description: string;
  maxParticipants: number;
  startAt: string;
  endAt: string;
}

export interface MClassWithStats extends MClass {
  currentParticipants: number;
  isRegistrationOpen: boolean;
}

// Application related types
export interface Application {
  id: string;
  userId: string;
  classId: string;
  createdAt: Date;
}

export interface ApplicationWithDetails extends Application {
  user: Omit<User, 'password'>;
  mclass: MClass;
}

// JWT payload type
export interface JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// Express Request extension
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Database connection types
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}