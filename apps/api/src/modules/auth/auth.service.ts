import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { authRepository, UserRecord } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schemas';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../middleware/error-handler';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
  tokens: AuthTokens;
}

export class AuthService {
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private generateAccessToken(user: UserRecord): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any
    });
  }

  private async generateTokens(user: UserRecord): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(user);
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    // Default 7 days
    expiresAt.setDate(expiresAt.getDate() + 7);

    await authRepository.createRefreshToken({
      tokenHash,
      userId: user.id,
      expiresAt
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRY
    };
  }

  public verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  public async register(input: RegisterInput, ipAddress?: string): Promise<AuthResponse> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role as any
    });

    const tokens = await this.generateTokens(user);

    await authRepository.logAudit({
      userId: user.id,
      action: 'REGISTER',
      resource: 'User',
      details: { email: user.email, role: user.role },
      ipAddress
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      tokens
    };
  }

  public async login(input: LoginInput, ipAddress?: string): Promise<AuthResponse> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      await authRepository.logAudit({
        action: 'LOGIN_FAILURE',
        resource: 'User',
        details: { email: input.email, reason: 'USER_NOT_FOUND' },
        ipAddress
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      await authRepository.logAudit({
        userId: user.id,
        action: 'LOGIN_FAILURE',
        resource: 'User',
        details: { email: input.email, reason: 'INVALID_PASSWORD' },
        ipAddress
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);

    await authRepository.logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'User',
      details: { email: user.email },
      ipAddress
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      tokens
    };
  }

  public async refreshToken(rawRefreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await authRepository.findRefreshToken(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Security Hardening: Token reuse detection
    if (storedToken.revokedAt) {
      await authRepository.revokeAllUserRefreshTokens(storedToken.userId);
      await authRepository.logAudit({
        userId: storedToken.userId,
        action: 'TOKEN_REUSE_DETECTED',
        resource: 'RefreshToken',
        details: { tokenId: storedToken.id },
        ipAddress
      });
      throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked for security.');
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    const user = await authRepository.findUserById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedError('User associated with token no longer exists');
    }

    // Rotate refresh token
    const newAccessToken = this.generateAccessToken(user);
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Revoke old token and note replacement
    await authRepository.revokeRefreshToken(tokenHash, newTokenHash);

    // Save new token
    await authRepository.createRefreshToken({
      tokenHash: newTokenHash,
      userId: user.id,
      expiresAt: newExpiresAt
    });

    await authRepository.logAudit({
      userId: user.id,
      action: 'TOKEN_ROTATED',
      resource: 'RefreshToken',
      details: { oldTokenId: storedToken.id },
      ipAddress
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRY
    };
  }

  public async logout(rawRefreshToken: string, userId?: string, ipAddress?: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await authRepository.revokeRefreshToken(tokenHash);

    await authRepository.logAudit({
      userId,
      action: 'LOGOUT',
      resource: 'RefreshToken',
      ipAddress
    });
  }

  public async getCurrentUser(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export const authService = new AuthService();
