import { getIntegrations, initiateOAuth, handleOAuthCallback } from '../services/integration.service';
import { encrypt, decrypt } from '../utils/encryption';
import { generateOAuthState, verifyOAuthState } from '../utils/oauth-state';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    integrationActivity: {
      create: jest.fn(),
    },
  },
}));

jest.mock('axios');

import prisma from '../config/database';
import axios from 'axios';

const mockPrisma = prisma as any;
const mockAxios = axios as any;

describe('Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getIntegrations', () => {
    it('should return DTO array without token fields', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          userId: 'user-1',
          provider: 'slack',
          status: 'connected',
          accessToken: 'secret-access-token',
          refreshToken: 'secret-refresh-token',
          tokenExpiresAt: null,
          accountId: 'team-123',
          accountName: 'My Team',
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ];

      mockPrisma.integration.findMany.mockResolvedValue(mockIntegrations);

      const result = await getIntegrations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('accessToken');
      expect(result[0]).not.toHaveProperty('refreshToken');
      expect(result[0]).not.toHaveProperty('userId');
      expect(result[0].id).toBe('int-1');
      expect(result[0].provider).toBe('slack');
      expect(result[0].status).toBe('connected');
      expect(result[0].accountName).toBe('My Team');
    });

    it('should return empty array when no integrations found', async () => {
      mockPrisma.integration.findMany.mockResolvedValue([]);

      const result = await getIntegrations('user-1');

      expect(result).toEqual([]);
    });

    it('should query with correct userId and ordering', async () => {
      mockPrisma.integration.findMany.mockResolvedValue([]);

      await getIntegrations('user-1');

      expect(mockPrisma.integration.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('initiateOAuth', () => {
    it('should return authorizationUrl containing slack.com/oauth for slack', async () => {
      process.env.SLACK_CLIENT_ID = 'slack-client-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5000/api/integrations/slack/callback';

      const result = await initiateOAuth('user-1', 'slack');

      expect(result.authorizationUrl).toContain('slack.com/oauth');
      expect(result.authorizationUrl).toContain('slack-client-id');
      expect(result.authorizationUrl).toContain('channels:read');
    });

    it('should include audience=api.atlassian.com for jira', async () => {
      process.env.JIRA_CLIENT_ID = 'jira-client-id';
      process.env.JIRA_CLIENT_SECRET = 'jira-secret';
      process.env.JIRA_REDIRECT_URI = 'http://localhost:5000/api/integrations/jira/callback';

      const result = await initiateOAuth('user-1', 'jira');

      expect(result.authorizationUrl).toContain('auth.atlassian.com');
      expect(result.authorizationUrl).toContain('audience=api.atlassian.com');
    });
  });

  describe('handleOAuthCallback', () => {
    it('should call prisma upsert with encrypted tokens and log connected activity', async () => {
      process.env.SLACK_CLIENT_ID = 'slack-client-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5000/api/integrations/slack/callback';

      const state = generateOAuthState('user-1', 'slack');

      mockAxios.post = jest.fn().mockResolvedValue({
        data: {
          access_token: 'raw-access-token',
          refresh_token: 'raw-refresh-token',
          expires_in: 3600,
          team: { name: 'My Slack Team' },
          authed_user: { id: 'U123' },
        },
      });

      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.upsert.mockResolvedValue(mockIntegration);
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      const result = await handleOAuthCallback('auth-code', state);

      expect(result.userId).toBe('user-1');
      expect(result.provider).toBe('slack');

      expect(mockPrisma.integration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: 'connected',
            accountName: 'My Slack Team',
          }),
        })
      );

      const upsertCall = mockPrisma.integration.upsert.mock.calls[0][0];
      expect(upsertCall.create.accessToken).not.toBe('raw-access-token');
      expect(decrypt(upsertCall.create.accessToken)).toBe('raw-access-token');

      expect(mockPrisma.integrationActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'connected' }),
        })
      );
    });
  });

  describe('encrypt/decrypt', () => {
    it('should roundtrip correctly', () => {
      const secret = 'my-secret-token-value';
      const encrypted = encrypt(secret);
      expect(encrypted).not.toBe(secret);
      expect(decrypt(encrypted)).toBe(secret);
    });
  });

  describe('generateOAuthState/verifyOAuthState', () => {
    it('should roundtrip returning correct userId and provider', () => {
      const state = generateOAuthState('user-abc', 'confluence');
      const decoded = verifyOAuthState(state);
      expect(decoded.userId).toBe('user-abc');
      expect(decoded.provider).toBe('confluence');
    });
  });
});
