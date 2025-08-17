import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export interface JwtTokens {
  accessToken: string;
  refreshToken?: string;
}

class JwtUtil {
  private static readonly secret = process.env.JWT_SECRET!;

  static generateToken(payload: JwtPayload): string {
    if (!this.secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
      payload,
      this.secret,
      {
        expiresIn: '24h',
        issuer: 'miniintern-mclass',
        audience: 'miniintern-users'
      }
    );
  }

  static verifyToken(token: string): JwtPayload {
    if (!this.secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'miniintern-mclass',
        audience: 'miniintern-users'
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  static generateTokens(payload: JwtPayload): JwtTokens {
    const accessToken = this.generateToken(payload);
    
    return {
      accessToken
    };
  }

  static decodeTokenWithoutVerification(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

export default JwtUtil;