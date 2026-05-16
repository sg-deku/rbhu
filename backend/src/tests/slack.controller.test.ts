import request from 'supertest';
import app from '../server';
import { PrismaClient } from '@prisma/client';
import { WebClient } from '@slack/web-api';
import jwt from 'jsonwebtoken';

const mockAccess = jest.fn();
const mockList = jest.fn();

jest.mock('@prisma/client', () => {
  const mPrisma = {
    integration: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    integrationActivity: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../utils/encryption', () => ({
  encrypt: jest.fn((text) => text),
  decrypt: jest.fn((text) => text),
}));

jest.mock('@slack/web-api', () => {
  return {
    WebClient: jest.fn().mockImplementation(() => ({
      oauth: {
        v2: {
          access: mockAccess,
        },
      },
      conversations: {
        list: mockList,
      },
    })),
  };
});

const prisma = new PrismaClient() as any;

describe('Slack Controller', () => {
  const userId = 'user-123';
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'secret');

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: userId, role: 'USER' });
  });

  describe('GET /api/slack/auth', () => {
    it('should redirect to Slack authorize URL', async () => {
      prisma.integration.upsert.mockResolvedValue({});
      prisma.integration.findUnique.mockResolvedValue({ id: 'int-123' });
      const res = await request(app)
        .get('/api/slack/auth')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('slack.com/oauth/v2/authorize');
    });
  });

  describe('GET /api/slack/callback', () => {
    it('should exchange code and save integration', async () => {
      mockAccess.mockResolvedValue({
        ok: true,
        access_token: 'xoxb-123',
        bot_user_id: 'U123',
        team: { id: 'T123', name: 'Test Team' },
      });

      prisma.integration.upsert.mockResolvedValue({});
      prisma.integration.findUnique.mockResolvedValue({ id: 'int-123' });
      const res = await request(app)
        .get('/api/slack/callback')
        .query({ code: 'code-123', state: userId });

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('status=success');
      expect(prisma.integration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_provider: { userId, provider: 'slack' } },
          create: expect.objectContaining({
            accessToken: 'xoxb-123',
            accountId: 'T123',
            accountName: 'Test Team',
          }),
        })
      );
    });

    it('should handle error if exchange fails', async () => {
      mockAccess.mockResolvedValue({
        ok: false,
        error: 'invalid_code',
      });

      prisma.integration.upsert.mockResolvedValue({});
      prisma.integration.findUnique.mockResolvedValue({ id: 'int-123' });
      const res = await request(app)
        .get('/api/slack/callback')
        .query({ code: 'wrong-code', state: userId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/slack/channels', () => {
    it('should return channels for authenticated user', async () => {
      prisma.integration.findUnique.mockResolvedValue({
        accessToken: 'xoxb-123',
      });

      mockList.mockResolvedValue({
        ok: true,
        channels: [{ id: 'C123', name: 'general' }],
      });

      prisma.integration.findUnique.mockResolvedValue({
        id: 'int-123',
        accessToken: 'xoxb-123',
      });
      const res = await request(app)
        .get('/api/slack/channels')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
