import { prisma, tryPrisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

// Pre-computed hash for Password123!
const DEMO_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

export const DEMO_CLIENT: UserRecord = {
  id: 'demo-client-id-001',
  name: 'Sarah Connor (Acme Capital)',
  email: 'client@expertlink.com',
  passwordHash: DEMO_PASSWORD_HASH,
  role: 'CLIENT',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z')
};

export const DEMO_EXPERT: UserRecord = {
  id: 'demo-expert-id-001',
  name: 'Dr. Alan Turing',
  email: 'expert@expertlink.com',
  passwordHash: DEMO_PASSWORD_HASH,
  role: 'EXPERT',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z')
};

export const DEMO_ADMIN: UserRecord = {
  id: 'demo-admin-id-001',
  name: 'Admin User',
  email: 'admin@expertlink.com',
  passwordHash: DEMO_PASSWORD_HASH,
  role: 'ADMIN',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z')
};

// In-memory fallback storage with seeded demo accounts
class InMemoryAuthStore {
  public users = new Map<string, UserRecord>();
  public refreshTokens = new Map<string, RefreshTokenRecord>();
  public auditLogs: AuditLogRecord[] = [];

  constructor() {
    this.seedDemoUsers();
  }

  public seedDemoUsers() {
    this.users.set(DEMO_CLIENT.id, { ...DEMO_CLIENT });
    this.users.set(DEMO_EXPERT.id, { ...DEMO_EXPERT });
    this.users.set(DEMO_ADMIN.id, { ...DEMO_ADMIN });
  }

  clear() {
    this.users.clear();
    this.refreshTokens.clear();
    this.auditLogs = [];
  }
}

export const inMemoryAuthStore = new InMemoryAuthStore();

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();

    const lookupInMemory = () => {
      let match = Array.from(inMemoryAuthStore.users.values()).find(
        (u) => u.email.toLowerCase() === normalized
      );
      if (!match) {
        if (normalized === DEMO_EXPERT.email) match = DEMO_EXPERT;
        else if (normalized === DEMO_CLIENT.email) match = DEMO_CLIENT;
        else if (normalized === DEMO_ADMIN.email) match = DEMO_ADMIN;
        if (match) {
          inMemoryAuthStore.users.set(match.id, { ...match });
        }
      }
      return match || null;
    };

    if (env.NODE_ENV === 'test') {
      return lookupInMemory();
    }

    return tryPrisma(
      async () => {
        return await prisma.user.findUnique({ where: { email: normalized } });
      },
      () => lookupInMemory()
    );
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    const lookupInMemory = () => {
      let user = inMemoryAuthStore.users.get(id);
      if (!user) {
        if (id === DEMO_EXPERT.id) user = DEMO_EXPERT;
        else if (id === DEMO_CLIENT.id) user = DEMO_CLIENT;
        else if (id === DEMO_ADMIN.id) user = DEMO_ADMIN;
        if (user) {
          inMemoryAuthStore.users.set(user.id, { ...user });
        }
      }
      return user || null;
    };

    if (env.NODE_ENV === 'test') {
      return lookupInMemory();
    }

    return tryPrisma(
      async () => {
        return await prisma.user.findUnique({ where: { id } });
      },
      () => lookupInMemory()
    );
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

    inMemoryAuthStore.users.set(record.id, record);

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          return await prisma.user.create({ data: record });
        },
        () => record
      );
    }
    return record;
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

    inMemoryAuthStore.refreshTokens.set(record.tokenHash, record);

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          return await prisma.refreshToken.create({ data: record });
        },
        () => record
      );
    }
    return record;
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const lookupInMemory = () => inMemoryAuthStore.refreshTokens.get(tokenHash) || null;

    if (env.NODE_ENV === 'test') {
      return lookupInMemory();
    }

    return tryPrisma(
      async () => {
        return await prisma.refreshToken.findUnique({ where: { tokenHash } });
      },
      () => lookupInMemory()
    );
  },

  async revokeRefreshToken(tokenHash: string, replacedByToken?: string): Promise<void> {
    const existing = inMemoryAuthStore.refreshTokens.get(tokenHash);
    if (existing) {
      existing.revokedAt = new Date();
      if (replacedByToken) existing.replacedByToken = replacedByToken;
    }

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          await prisma.refreshToken.update({
            where: { tokenHash },
            data: { revokedAt: new Date(), replacedByToken }
          });
        },
        () => {}
      );
    }
  },

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    for (const token of inMemoryAuthStore.refreshTokens.values()) {
      if (token.userId === userId) {
        token.revokedAt = new Date();
      }
    }

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          await prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() }
          });
        },
        () => {}
      );
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
      await tryPrisma(
        async () => {
          await prisma.auditLog.create({ data: record });
        },
        () => {}
      );
    }
  }
};

