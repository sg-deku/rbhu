import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    integrationActivity: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
  connectDB: jest.fn().mockResolvedValue(undefined),
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
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5000/api/integrations/slack/callback';

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
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5000/api/integrations/slack/callback';

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
});
