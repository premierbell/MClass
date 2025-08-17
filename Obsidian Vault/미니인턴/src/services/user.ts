import DatabaseService from './database';
import PasswordUtil from '../utils/password';
import JwtUtil, { JwtPayload } from '../utils/jwt';

export interface CreateUserData {
  email: string;
  password: string;
  isAdmin?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface LoginResponse {
  user: UserResponse;
  accessToken: string;
}

class UserService {
  private database = DatabaseService.getInstance();

  async createUser(userData: CreateUserData): Promise<UserResponse> {
    const { email, password, isAdmin = false } = userData;

    // Check if user already exists
    const existingUser = await this.database.getClient().user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = PasswordUtil.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hashPassword(password);

    // Create user
    const user = await this.database.getClient().user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        isAdmin
      },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    return user;
  }

  async authenticateUser(credentials: LoginCredentials): Promise<LoginResponse> {
    const { email, password } = credentials;

    // Find user by email
    const user = await this.database.getClient().user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin
    };

    const accessToken = JwtUtil.generateToken(jwtPayload);

    // Return user data (without password) and token
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    };

    return {
      user: userResponse,
      accessToken
    };
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.database.getClient().user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    return user;
  }

  async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await this.database.getClient().user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    return user;
  }

  async getUserApplications(userId: string) {
    const applications = await this.database.getClient().application.findMany({
      where: { userId },
      include: {
        mclass: {
          select: {
            id: true,
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            maxParticipants: true,
            host: {
              select: {
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return applications.map(app => ({
      id: app.id,
      appliedAt: app.createdAt,
      class: {
        id: app.mclass.id,
        title: app.mclass.title,
        description: app.mclass.description,
        startAt: app.mclass.startAt,
        endAt: app.mclass.endAt,
        maxParticipants: app.mclass.maxParticipants,
        hostEmail: app.mclass.host.email
      }
    }));
  }

  async updateUser(userId: string, updateData: Partial<CreateUserData>): Promise<UserResponse> {
    const updateFields: any = {};

    if (updateData.email) {
      updateFields.email = updateData.email.toLowerCase();
      
      // Check if email is already taken by another user
      const existingUser = await this.database.getClient().user.findFirst({
        where: {
          email: updateData.email.toLowerCase(),
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        throw new Error('Email is already taken by another user');
      }
    }

    if (updateData.password) {
      const passwordValidation = PasswordUtil.validatePasswordStrength(updateData.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }
      updateFields.password = await PasswordUtil.hashPassword(updateData.password);
    }

    if (updateData.isAdmin !== undefined) {
      updateFields.isAdmin = updateData.isAdmin;
    }

    const user = await this.database.getClient().user.update({
      where: { id: userId },
      data: updateFields,
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.database.getClient().user.delete({
      where: { id: userId }
    });
  }

  async createAdminUser(email: string, password: string): Promise<UserResponse> {
    return this.createUser({
      email,
      password,
      isAdmin: true
    });
  }

  async refreshUserToken(userId: string): Promise<string> {
    const user = await this.database.getClient().user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isAdmin: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin
    };

    return JwtUtil.generateToken(jwtPayload);
  }
}

export default UserService;