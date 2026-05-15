import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findMany: jest.fn().mockResolvedValue([]),
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
  },
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/integration-sync.service', () => ({
  runSync: jest.fn().mockResolvedValue({ syncedItemCount: 3 }),
  refreshTokenIfNeeded: jest.fn().mockImplementation((integration: any) => Promise.resolve(integration)),
}));

jest.mock('../services/integration-scheduler', () => ({
  startIntegrationScheduler: jest.fn(),
}));

jest.mock('axios');

import app from '../server';
import prisma from '../config/database';
import axios from 'axios';
import { generateOAuthState } from '../utils/oauth-state';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const mockPrisma = prisma as any;
const mockAxios = axios as any;

function makeToken(userId = 'user-1') {
  return jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Integration Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.integration.findMany.mockResolvedValue([]);
    mockPrisma.integrationActivity.create.mockResolvedValue({});
  });

  describe('GET /api/integrations', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/integrations');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with valid JWT and empty data', async () => {
      const token = makeToken();
      const res = await request(app)
        .get('/api/integrations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Provider validation', () => {
    it('should return 400 for invalid provider', async () => {
      const token = makeToken();
      const res = await request(app)
        .get('/api/integrations/invalid/status')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid provider');
    });
  });

  describe('POST /api/integrations/:provider/connect', () => {
    it('should return 200 with authorizationUrl for valid provider', async () => {
      process.env.SLACK_CLIENT_ID = 'slack-client-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5001/api/integrations/slack/callback';

      const token = makeToken();
      const res = await request(app)
        .post('/api/integrations/slack/connect')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorizationUrl).toContain('slack.com/oauth');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/integrations/slack/connect');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/integrations/:provider/callback', () => {
    it('should redirect to error URL when error query param is present', async () => {
      const state = generateOAuthState('user-1', 'slack');
      const res = await request(app)
        .get(`/api/integrations/slack/callback?error=access_denied&state=${encodeURIComponent(state)}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/error=slack/);
    });

    it('should redirect to connected URL on successful code exchange', async () => {
      process.env.SLACK_CLIENT_ID = 'slack-client-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5001/api/integrations/slack/callback';

      const state = generateOAuthState('user-1', 'slack');

      mockAxios.post = jest.fn().mockResolvedValue({
        data: {
          access_token: 'raw-access-token',
          team: { name: 'My Team' },
          authed_user: { id: 'U123' },
        },
      });

      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.upsert.mockResolvedValue(mockIntegration);
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);

      const res = await request(app)
        .get(`/api/integrations/slack/callback?code=testcode&state=${encodeURIComponent(state)}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/connected=slack/);
    });
  });

  describe('GET /api/integrations/:provider/status', () => {
    it('should return 200 with status data when integration exists', async () => {
      const token = makeToken();
      const mockIntegration = {
        id: 'int-1',
        syncStatus: 'success',
        lastSyncedAt: new Date('2026-05-13T09:00:00Z'),
        syncedItemCount: 10,
      };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);

      const res = await request(app)
        .get('/api/integrations/slack/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('success');
      expect(res.body.data.syncedItemCount).toBe(10);
    });

    it('should return 404 when integration not found', async () => {
      const token = makeToken();
      mockPrisma.integration.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/integrations/slack/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/integrations/:provider/sync', () => {
    it('should return 200 with jobId and status queued', async () => {
      const token = makeToken();
      const mockIntegration = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: 'encrypted',
        refreshToken: null,
        tokenExpiresAt: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
      };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integration.update.mockResolvedValue({ ...mockIntegration, syncStatus: 'syncing' });

      const res = await request(app)
        .post('/api/integrations/slack/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobId).toBe('int-1');
      expect(res.body.data.status).toBe('queued');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/integrations/slack/sync');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/integrations/:provider', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).delete('/api/integrations/slack');
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid provider', async () => {
      const token = makeToken();
      const res = await request(app)
        .delete('/api/integrations/invalid')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with success message when integration exists', async () => {
      process.env.SLACK_CLIENT_ID = 'slack-client-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5001/api/integrations/slack/callback';

      const token = makeToken();
      const { encrypt } = jest.requireActual('../utils/encryption') as any;
      const encryptedToken = encrypt('raw-access-token');

      const mockIntegration = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: encryptedToken,
      };

      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integration.delete.mockResolvedValue(mockIntegration);
      mockAxios.post = jest.fn().mockResolvedValue({ data: { ok: true } });

      const res = await request(app)
        .delete('/api/integrations/slack')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Integration disconnected');
    });

    it('should return 404 when integration not found', async () => {
      const token = makeToken();
      mockPrisma.integration.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/integrations/slack')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/integrations/:provider/resources', () => {
    it('should return 200 with resource data when integration exists', async () => {
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
      const { encrypt } = jest.requireActual('../utils/encryption') as any;
      const token = makeToken();
      const encryptedToken = encrypt('raw-access-token');

      const mockIntegration = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: encryptedToken,
        refreshToken: null,
        tokenExpiresAt: null,
      };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integration.update.mockResolvedValue(mockIntegration);

      mockAxios.get = jest.fn().mockResolvedValue({
        data: { channels: [{ id: 'C001', name: 'general' }] },
      });

      const res = await request(app)
        .get('/api/integrations/slack/resources')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('channel');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/integrations/slack/resources');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/integrations/:provider/config', () => {
    it('should return 200 with config data', async () => {
      const token = makeToken();
      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue({ selectedResourceIds: ['C001'] });

      const res = await request(app)
        .get('/api/integrations/slack/config')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selectedResourceIds).toEqual(['C001']);
    });
  });

  describe('PUT /api/integrations/:provider/config', () => {
    it('should return 200 with updated config', async () => {
      const token = makeToken();
      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integrationConfig.upsert.mockResolvedValue({ integrationId: 'int-1', selectedResourceIds: ['C001', 'C002'] });

      const res = await request(app)
        .put('/api/integrations/slack/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedResourceIds: ['C001', 'C002'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selectedResourceIds).toEqual(['C001', 'C002']);
    });

    it('should return 400 when selectedResourceIds is not an array', async () => {
      const token = makeToken();

      const res = await request(app)
        .put('/api/integrations/slack/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedResourceIds: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/integrations/activity', () => {
    it('should return 200 with paginated activity', async () => {
      const token = makeToken();
      const mockActivities = [
        { id: 'act-1', provider: 'slack', eventType: 'sync_success', message: 'Sync done', detail: null, syncedItemCount: 5, createdAt: new Date() },
      ];
      mockPrisma.integrationActivity.findMany.mockResolvedValue(mockActivities);
      mockPrisma.integrationActivity.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/integrations/activity?page=1&limit=20')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/integrations/activity');
      expect(res.status).toBe(401);
    });
  });
});
