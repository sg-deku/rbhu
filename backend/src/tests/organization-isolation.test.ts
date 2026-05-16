import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    integration: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    integrationConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    integrationActivity: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    syncLog: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    documentMetadata: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/integration-sync.service', () => ({
  runSync: jest.fn().mockResolvedValue({ syncedItemCount: 0 }),
  refreshTokenIfNeeded: jest.fn().mockImplementation((i: any) => Promise.resolve(i)),
}));

jest.mock('../services/integration-scheduler', () => ({
  startIntegrationScheduler: jest.fn(),
}));

jest.mock('axios');

import app from '../server';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const mockPrisma = prisma as any;

function makeTokenWithOrg(userId: string, organizationId: string | null = null) {
  mockPrisma.user.findUnique.mockResolvedValue({ id: userId, email: `${userId}@example.com`, organizationId, role: 'USER' });
  return jwt.sign({ userId, email: `${userId}@example.com`, organizationId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Organization Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.integrationActivity.create.mockResolvedValue({});
    mockPrisma.integrationActivity.findMany.mockResolvedValue([]);
    mockPrisma.integrationActivity.count.mockResolvedValue(0);
  });

  describe('GET /api/integrations - organization scoping', () => {
    it('should return org-scoped integrations when user has organizationId in JWT', async () => {
      const orgIntegrations = [
        {
          id: 'int-1',
          userId: 'user-a',
          organizationId: 'org-1',
          provider: 'slack',
          status: 'connected',
          accountName: 'Team A',
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'int-2',
          userId: 'user-b',
          organizationId: 'org-1',
          provider: 'jira',
          status: 'connected',
          accountName: 'Jira Corp',
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.integration.findMany.mockResolvedValue(orgIntegrations);

      const token = makeTokenWithOrg('user-a', 'org-1');
      const res = await request(app)
        .get('/api/integrations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);

      expect(mockPrisma.integration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } })
      );
    });

    it('should return user-scoped integrations when user has no organizationId', async () => {
      const userIntegrations = [
        {
          id: 'int-3',
          userId: 'user-c',
          organizationId: null,
          provider: 'confluence',
          status: 'connected',
          accountName: null,
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.integration.findMany.mockResolvedValue(userIntegrations);

      const token = makeTokenWithOrg('user-c', null);
      const res = await request(app)
        .get('/api/integrations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);

      expect(mockPrisma.integration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-c' } })
      );
    });

    it('should not return integrations from a different organization', async () => {
      mockPrisma.integration.findMany.mockResolvedValue([]);

      const token = makeTokenWithOrg('user-x', 'org-2');
      const res = await request(app)
        .get('/api/integrations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);

      expect(mockPrisma.integration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-2' } })
      );
    });
  });

  describe('GET /api/integrations/activity - organization scoping', () => {
    it('should return org-scoped activity when user has organizationId', async () => {
      const orgActivities = [
        {
          id: 'act-1',
          integrationId: 'int-1',
          userId: 'user-a',
          provider: 'slack',
          eventType: 'connected',
          message: 'Connected to slack',
          detail: null,
          syncedItemCount: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.integrationActivity.findMany.mockResolvedValue(orgActivities);
      mockPrisma.integrationActivity.count.mockResolvedValue(1);

      const token = makeTokenWithOrg('user-a', 'org-1');
      const res = await request(app)
        .get('/api/integrations/activity')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);

      expect(mockPrisma.integrationActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { integration: { organizationId: 'org-1' } },
        })
      );
    });

    it('should return user-scoped activity when user has no organizationId', async () => {
      mockPrisma.integrationActivity.findMany.mockResolvedValue([]);
      mockPrisma.integrationActivity.count.mockResolvedValue(0);

      const token = makeTokenWithOrg('user-c', null);
      const res = await request(app)
        .get('/api/integrations/activity')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      expect(mockPrisma.integrationActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-c' } })
      );
    });
  });

  describe('JWT token includes organizationId', () => {
    it('should include organizationId in login response token', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-org',
        name: 'Org User',
        email: 'orguser@example.com',
        password: hashedPassword,
        organizationId: 'org-enterprise',
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'orguser@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
      expect(decoded.organizationId).toBe('org-enterprise');
    });

    it('should include null organizationId in token for users without org', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-solo',
        name: 'Solo User',
        email: 'solo@example.com',
        password: hashedPassword,
        organizationId: null,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'solo@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
      expect(decoded.organizationId).toBeNull();
    });

    it('should include organizationId in register response token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        name: 'New User',
        email: 'newuser@example.com',
        organizationId: null,
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
      expect(decoded).toHaveProperty('organizationId');
    });
  });
});

describe('Organization Isolation - Service Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getIntegrations', () => {
    it('should scope by organizationId when provided', async () => {
      const { getIntegrations } = require('../services/integration.service');

      mockPrisma.integration.findMany.mockResolvedValue([]);
      await getIntegrations('user-1', 'org-1');

      expect(mockPrisma.integration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } })
      );
    });

    it('should scope by userId when organizationId is null', async () => {
      const { getIntegrations } = require('../services/integration.service');

      mockPrisma.integration.findMany.mockResolvedValue([]);
      await getIntegrations('user-1', null);

      expect(mockPrisma.integration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
    });

    it('should scope by userId when organizationId is omitted', async () => {
      const { getIntegrations } = require('../services/integration.service');

      mockPrisma.integration.findMany.mockResolvedValue([]);
      await getIntegrations('user-1');

      expect(mockPrisma.integration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
    });

    it('should strip sensitive token fields from org-scoped result', async () => {
      const { getIntegrations } = require('../services/integration.service');

      mockPrisma.integration.findMany.mockResolvedValue([
        {
          id: 'int-1',
          userId: 'user-a',
          organizationId: 'org-1',
          provider: 'slack',
          status: 'connected',
          accessToken: 'super-secret-token',
          refreshToken: 'super-secret-refresh',
          accountName: 'Team Org',
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await getIntegrations('user-a', 'org-1');

      expect(result[0]).not.toHaveProperty('accessToken');
      expect(result[0]).not.toHaveProperty('refreshToken');
      expect(result[0].provider).toBe('slack');
    });
  });

  describe('getDocumentsByUser with organizationId', () => {
    it('should scope by organizationId when provided', async () => {
      const { getDocumentsByUser } = require('../services/integration.service');

      mockPrisma.documentMetadata.findMany.mockResolvedValue([]);
      mockPrisma.documentMetadata.count.mockResolvedValue(0);

      await getDocumentsByUser('user-1', 1, 20, 'org-1');

      expect(mockPrisma.documentMetadata.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } })
      );
    });

    it('should scope by userId when organizationId is null', async () => {
      const { getDocumentsByUser } = require('../services/integration.service');

      mockPrisma.documentMetadata.findMany.mockResolvedValue([]);
      mockPrisma.documentMetadata.count.mockResolvedValue(0);

      await getDocumentsByUser('user-1', 1, 20, null);

      expect(mockPrisma.documentMetadata.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
    });
  });

  describe('getDocumentsByOrganization', () => {
    it('should return only documents for the given organization', async () => {
      const { getDocumentsByOrganization } = require('../services/integration.service');

      const orgDocs = [
        {
          id: 'doc-1',
          externalId: 'ext-1',
          provider: 'jira',
          contentType: 'issue',
          sourceUrl: null,
          title: 'Issue #1',
          metadata: null,
          lastSyncedAt: new Date(),
          integrationId: 'int-1',
          userId: 'user-a',
          organizationId: 'org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.documentMetadata.findMany.mockResolvedValue(orgDocs);
      mockPrisma.documentMetadata.count.mockResolvedValue(1);

      const result = await getDocumentsByOrganization('org-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].organizationId).toBe('org-1');
      expect(result.pagination.total).toBe(1);

      expect(mockPrisma.documentMetadata.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } })
      );
    });
  });

  describe('handleOAuthCallback - links integration to organization', () => {
    it('should set organizationId on integration when user belongs to an org', async () => {
      const { handleOAuthCallback } = require('../services/integration.service');
      const { generateOAuthState } = require('../utils/oauth-state');
      const { encrypt } = require('../utils/encryption');
      const axios = require('axios');

      process.env.SLACK_CLIENT_ID = 'slack-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5001/api/integrations/slack/callback';
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);

      const state = generateOAuthState('user-org', 'slack');

      mockPrisma.user.findUnique.mockResolvedValue({ organizationId: 'org-1' });
      mockPrisma.integration.upsert.mockResolvedValue({ id: 'int-new' });
      mockPrisma.integration.findUnique.mockResolvedValue({ id: 'int-new', userId: 'user-org', provider: 'slack' });
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'raw-access-token',
          team: { name: 'My Org Team' },
          authed_user: { id: 'U123' },
        },
      });

      await handleOAuthCallback('auth-code', state);

      expect(mockPrisma.integration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 'org-1' }),
          update: expect.objectContaining({ organizationId: 'org-1' }),
        })
      );
    });

    it('should set null organizationId when user has no org', async () => {
      const { handleOAuthCallback } = require('../services/integration.service');
      const { generateOAuthState } = require('../utils/oauth-state');
      const axios = require('axios');

      process.env.SLACK_CLIENT_ID = 'slack-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5001/api/integrations/slack/callback';
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);

      const state = generateOAuthState('user-solo', 'slack');

      mockPrisma.user.findUnique.mockResolvedValue({ organizationId: null });
      mockPrisma.integration.upsert.mockResolvedValue({ id: 'int-solo' });
      mockPrisma.integration.findUnique.mockResolvedValue({ id: 'int-solo', userId: 'user-solo', provider: 'slack' });
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'raw-access-token',
          team: { name: 'Solo Team' },
          authed_user: { id: 'U456' },
        },
      });

      await handleOAuthCallback('auth-code-2', state);

      expect(mockPrisma.integration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: null }),
          update: expect.objectContaining({ organizationId: null }),
        })
      );
    });
  });
});
