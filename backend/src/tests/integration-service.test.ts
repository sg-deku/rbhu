import { getIntegrations, initiateOAuth, handleOAuthCallback, syncIntegration, getIntegrationStatus, disconnectIntegration, getResources, getConfig, updateConfig, getActivity } from '../services/integration.service';
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
    integrationConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    integrationActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../services/integration-sync.service', () => ({
  runSync: jest.fn(),
  refreshTokenIfNeeded: jest.fn().mockImplementation((integration: any) => Promise.resolve(integration)),
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

  describe('getResources', () => {
    beforeEach(() => {
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
    });

    it('should return ResourceDTO[] with type channel for slack', async () => {
      const rawToken = 'raw-access-token';
      const encryptedToken = encrypt(rawToken);
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
        data: {
          channels: [
            { id: 'C001', name: 'general' },
            { id: 'C002', name: 'random' },
          ],
        },
      });

      const result = await getResources('user-1', 'slack', 1, 50);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ id: 'C001', name: 'general', type: 'channel' });
      expect(result.pagination.total).toBe(2);
    });

    it('should throw REAUTH_REQUIRED when provider returns 401', async () => {
      const rawToken = 'raw-access-token';
      const encryptedToken = encrypt(rawToken);
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

      const authError: any = new Error('Request failed with status code 401');
      authError.response = { status: 401 };
      mockAxios.get = jest.fn().mockRejectedValue(authError);

      const err = await getResources('user-1', 'slack', 1, 50).catch((e) => e);
      expect(err.code).toBe('REAUTH_REQUIRED');
    });
  });

  describe('getConfig', () => {
    it('should return selectedResourceIds from existing config', async () => {
      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue({ selectedResourceIds: ['C001', 'C002'] });

      const result = await getConfig('user-1', 'slack');
      expect(result.selectedResourceIds).toEqual(['C001', 'C002']);
    });

    it('should return empty array when no config exists', async () => {
      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(null);

      const result = await getConfig('user-1', 'slack');
      expect(result.selectedResourceIds).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should call integrationConfig.upsert and integrationActivity.create with config_updated', async () => {
      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integrationConfig.upsert.mockResolvedValue({ integrationId: 'int-1', selectedResourceIds: ['C001'] });
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      const result = await updateConfig('user-1', 'slack', ['C001']);

      expect(mockPrisma.integrationConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { integrationId: 'int-1' },
          create: expect.objectContaining({ selectedResourceIds: ['C001'] }),
          update: expect.objectContaining({ selectedResourceIds: ['C001'] }),
        })
      );
      expect(mockPrisma.integrationActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'config_updated' }),
        })
      );
      expect(result.selectedResourceIds).toEqual(['C001']);
    });
  });

  describe('getActivity', () => {
    it('should return paginated activity with correct skip/take', async () => {
      const mockActivities = [
        { id: 'act-1', provider: 'slack', eventType: 'sync_success', message: 'Sync done', detail: null, syncedItemCount: 5, createdAt: new Date() },
      ];
      mockPrisma.integrationActivity.findMany.mockResolvedValue(mockActivities);
      mockPrisma.integrationActivity.count.mockResolvedValue(21);

      const result = await getActivity('user-1', 2, 20);

      expect(mockPrisma.integrationActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
          skip: 20,
          take: 20,
        })
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 2, limit: 20, total: 21 });
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
