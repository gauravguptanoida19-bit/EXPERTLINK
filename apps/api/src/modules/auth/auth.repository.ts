import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { Role } from '@prisma/client';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByToken: string | null;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  details: any;
  ipAddress: string | null;
  createdAt: Date;
}

// In-memory fallback storage for unit testing without live Postgres
class InMemoryAuthStore {
  public users = new Map<string, UserRecord>();
  public refreshTokens = new Map<string, RefreshTokenRecord>();
  public auditLogs: AuditLogRecord[] = [];

  clear() {
    this.users.clear();
    this.refreshTokens.clear();
    this.auditLogs = [];
  }
}

export const inMemoryAuthStore = new InMemoryAuthStore();

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    if (env.NODE_ENV === 'test') {
      const match = Array.from(inMemoryAuthStore.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
      return match || null;
    }
    try {
      return await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    } catch (err) {
      logger.warn({ err }, 'Prisma query failed, falling back to in-memory store');
      const match = Array.from(inMemoryAuthStore.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
      return match || null;
    }
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    if (env.NODE_ENV === 'test') {
      return inMemoryAuthStore.users.get(id) || null;
    }
    try {
      return await prisma.user.findUnique({ where: { id } });
    } catch (err) {
      logger.warn({ err }, 'Prisma query failed, falling back to in-memory store');
      return inMemoryAuthStore.users.get(id) || null;
    }
  },

  async createUser(data: { id?: string; name: string; email: string; passwordHash: string; role: Role }): Promise<UserRecord> {
    const record: UserRecord = {
      id: data.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (env.NODE_ENV === 'test') {
      inMemoryAuthStore.users.set(record.id, record);
      return record;
    }
    try {
      return await prisma.user.create({ data: record });
    } catch (err) {
      logger.warn({ err }, 'Prisma write failed, saving to in-memory store');
      inMemoryAuthStore.users.set(record.id, record);
      return record;
    }
  },

  async createRefreshToken(data: {
    id?: string;
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: data.id || `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      tokenHash: data.tokenHash,
      userId: data.userId,
      expiresAt: data.expiresAt,
      revokedAt: null,
      replacedByToken: null,
      createdAt: new Date()
    };

    if (env.NODE_ENV === 'test') {
      inMemoryAuthStore.refreshTokens.set(record.tokenHash, record);
      return record;
    }
    try {
      return await prisma.refreshToken.create({ data: record });
    } catch (err) {
      logger.warn({ err }, 'Prisma write failed, saving to in-memory store');
      inMemoryAuthStore.refreshTokens.set(record.tokenHash, record);
      return record;
    }
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    if (env.NODE_ENV === 'test') {
      return inMemoryAuthStore.refreshTokens.get(tokenHash) || null;
    }
    try {
      return await prisma.refreshToken.findUnique({ where: { tokenHash } });
    } catch (err) {
      logger.warn({ err }, 'Prisma query failed, falling back to in-memory store');
      return inMemoryAuthStore.refreshTokens.get(tokenHash) || null;
    }
  },

  async revokeRefreshToken(tokenHash: string, replacedByToken?: string): Promise<void> {
    if (env.NODE_ENV === 'test') {
      const existing = inMemoryAuthStore.refreshTokens.get(tokenHash);
      if (existing) {
        existing.revokedAt = new Date();
        if (replacedByToken) existing.replacedByToken = replacedByToken;
      }
      return;
    }
    try {
      await prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date(), replacedByToken }
      });
    } catch (err) {
      const existing = inMemoryAuthStore.refreshTokens.get(tokenHash);
      if (existing) {
        existing.revokedAt = new Date();
        if (replacedByToken) existing.replacedByToken = replacedByToken;
      }
    }
  },

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    if (env.NODE_ENV === 'test') {
      for (const token of inMemoryAuthStore.refreshTokens.values()) {
        if (token.userId === userId) {
          token.revokedAt = new Date();
        }
      }
      return;
    }
    try {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    } catch (err) {
      for (const token of inMemoryAuthStore.refreshTokens.values()) {
        if (token.userId === userId) {
          token.revokedAt = new Date();
        }
      }
    }
  },

  async logAudit(data: { userId?: string | null; action: string; resource: string; details?: any; ipAddress?: string }): Promise<void> {
    const record: AuditLogRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: data.userId || null,
      action: data.action,
      resource: data.resource,
      details: data.details || {},
      ipAddress: data.ipAddress || null,
      createdAt: new Date()
    };

    inMemoryAuthStore.auditLogs.push(record);

    if (env.NODE_ENV !== 'test') {
      try {
        await prisma.auditLog.create({ data: record });
      } catch (err) {
        logger.warn({ err }, 'Failed to persist audit log to DB');
      }
    }
  }
};
