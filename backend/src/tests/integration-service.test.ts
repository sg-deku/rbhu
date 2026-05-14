import { getIntegrations, initiateOAuth, handleOAuthCallback, syncIntegration, getIntegrationStatus, disconnectIntegration } from '../services/integration.service';
import { encrypt, decrypt } from '../utils/encryption';
import { generateOAuthState, verifyOAuthState } from '../utils/oauth-state';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    integrationActivity: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../services/integration-sync.service', () => ({
  runSync: jest.fn(),
}));

jest.mock('axios');

import prisma from '../config/database';
import axios from 'axios';
import { runSync } from '../services/integration-sync.service';

const mockPrisma = prisma as any;
const mockAxios = axios as any;
const mockRunSync = runSync as jest.Mock;

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

  describe('syncIntegration', () => {
    it('should set syncStatus to syncing immediately and return { jobId, status: queued }', async () => {
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
      mockRunSync.mockResolvedValue({ syncedItemCount: 5 });
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      const result = await syncIntegration('user-1', 'slack');

      expect(mockPrisma.integration.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { syncStatus: 'syncing' } })
      );
      expect(result).toEqual({ jobId: 'int-1', status: 'queued' });
    });

    it('should throw when integration not found', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue(null);
      await expect(syncIntegration('user-1', 'slack')).rejects.toThrow('Integration not found');
    });
  });

  describe('getIntegrationStatus', () => {
    it('should return status fields when integration exists', async () => {
      const mockIntegration = {
        id: 'int-1',
        syncStatus: 'success',
        lastSyncedAt: new Date('2026-05-13T09:00:00Z'),
        syncedItemCount: 10,
      };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);

      const result = await getIntegrationStatus('user-1', 'slack');

      expect(result).toEqual({
        status: 'success',
        lastSyncedAt: mockIntegration.lastSyncedAt,
        syncedItemCount: 10,
      });
    });

    it('should return null when integration not found', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue(null);
      const result = await getIntegrationStatus('user-1', 'slack');
      expect(result).toBeNull();
    });
  });

  describe('disconnectIntegration', () => {
    beforeEach(() => {
      process.env.SLACK_CLIENT_ID = 'slack-client-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';
      process.env.SLACK_REDIRECT_URI = 'http://localhost:5000/api/integrations/slack/callback';
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
    });

    it('should call axios.post for revoke and then prisma.integration.delete', async () => {
      const rawToken = 'raw-access-token';
      const { encrypt: enc } = jest.requireActual('../utils/encryption') as any;
      const encryptedToken = encrypt(rawToken);

      const mockIntegration = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: encryptedToken,
      };

      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integration.delete.mockResolvedValue(mockIntegration);
      mockAxios.post = jest.fn().mockResolvedValue({ data: { ok: true } });

      await disconnectIntegration('user-1', 'slack');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://slack.com/api/auth.revoke',
        { token: rawToken }
      );
      expect(mockPrisma.integration.delete).toHaveBeenCalledWith({
        where: { id: 'int-1' },
      });
    });

    it('should still call prisma.integration.delete when revoke fails (best-effort)', async () => {
      const encryptedToken = encrypt('raw-access-token');
      const mockIntegration = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: encryptedToken,
      };

      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integration.delete.mockResolvedValue(mockIntegration);
      mockAxios.post = jest.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await disconnectIntegration('user-1', 'slack');

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockPrisma.integration.delete).toHaveBeenCalledWith({
        where: { id: 'int-1' },
      });

      consoleSpy.mockRestore();
    });

    it('should throw a 404-style error when integration not found', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue(null);

      const error = await disconnectIntegration('user-1', 'slack').catch((e) => e);

      expect(error.message).toBe('Integration not found');
      expect(error.statusCode).toBe(404);
    });
  });
});
