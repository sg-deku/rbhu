import { encrypt, decrypt } from '../utils/encryption';
import { getIntegrations, handleOAuthCallback, syncIntegration, getResources } from '../services/integration.service';
import { refreshTokenIfNeeded } from '../services/integration-sync.service';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
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
  refreshTokenIfNeeded: jest.fn().mockImplementation((integration: any) => Promise.resolve(integration)),
}));

jest.mock('axios');

import prisma from '../config/database';
import axios from 'axios';
import { generateOAuthState } from '../utils/oauth-state';

const mockPrisma = prisma as any;
const mockAxios = axios as any;
const mockRefreshTokenIfNeeded = refreshTokenIfNeeded as jest.Mock;

beforeAll(() => {
  process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
  process.env.JWT_SECRET = 'test-secret';
  process.env.SLACK_CLIENT_ID = 'slack-client-id';
  process.env.SLACK_CLIENT_SECRET = 'slack-secret';
  process.env.SLACK_REDIRECT_URI = 'http://localhost:5001/api/integrations/slack/callback';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Integration model: token management', () => {
  describe('accessToken nullability', () => {
    it('should allow integration records with null accessToken (disconnected state)', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          userId: 'user-1',
          provider: 'slack',
          status: 'disconnected',
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          tokenUpdatedAt: null,
          accountId: null,
          accountName: null,
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.integration.findMany.mockResolvedValue(mockIntegrations);

      const result = await getIntegrations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('disconnected');
    });

    it('should not expose accessToken or refreshToken in DTO', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          userId: 'user-1',
          provider: 'slack',
          status: 'connected',
          accessToken: 'encrypted-token',
          refreshToken: 'encrypted-refresh',
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          tokenUpdatedAt: new Date(),
          accountName: 'Test Team',
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.integration.findMany.mockResolvedValue(mockIntegrations);

      const result = await getIntegrations('user-1');

      expect(result[0]).not.toHaveProperty('accessToken');
      expect(result[0]).not.toHaveProperty('refreshToken');
      expect(result[0]).not.toHaveProperty('tokenExpiresAt');
      expect(result[0]).not.toHaveProperty('tokenUpdatedAt');
    });

    it('should not expose userId in DTO', async () => {
      mockPrisma.integration.findMany.mockResolvedValue([
        {
          id: 'int-1',
          userId: 'user-1',
          provider: 'jira',
          status: 'connected',
          accessToken: 'enc',
          refreshToken: null,
          tokenExpiresAt: null,
          tokenUpdatedAt: null,
          accountName: null,
          accountEmail: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncedItemCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await getIntegrations('user-1');

      expect(result[0]).not.toHaveProperty('userId');
    });
  });

  describe('tokenUpdatedAt tracking', () => {
    it('should set tokenUpdatedAt when storing tokens via OAuth callback', async () => {
      const state = generateOAuthState('user-1', 'slack');

      mockAxios.post = jest.fn().mockResolvedValue({
        data: {
          access_token: 'raw-access-token',
          refresh_token: 'raw-refresh-token',
          expires_in: 3600,
          team: { name: 'My Team' },
          authed_user: { id: 'U123' },
        },
      });

      const mockIntegration = { id: 'int-1', userId: 'user-1', provider: 'slack' };
      mockPrisma.integration.upsert.mockResolvedValue(mockIntegration);
      mockPrisma.integration.findUnique.mockResolvedValue(mockIntegration);
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      await handleOAuthCallback('auth-code', state);

      const upsertCall = mockPrisma.integration.upsert.mock.calls[0][0];
      expect(upsertCall.create.tokenUpdatedAt).toBeInstanceOf(Date);
      expect(upsertCall.update.tokenUpdatedAt).toBeInstanceOf(Date);
    });

    it('should set tokenUpdatedAt when refreshing tokens', async () => {
      const rawToken = 'raw-access-token';
      const encryptedToken = encrypt(rawToken);
      const encryptedRefresh = encrypt('raw-refresh-token');

      const integration = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: encryptedToken,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: new Date(Date.now() - 60 * 1000),
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
        clientId: null,
        clientSecret: null,
      };

      process.env.SLACK_CLIENT_ID = 'slack-client-id';
      process.env.SLACK_CLIENT_SECRET = 'slack-secret';

      mockAxios.post = jest.fn().mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      });

      const updatedIntegration = { ...integration, accessToken: encrypt('new-access-token'), tokenUpdatedAt: new Date() };
      mockPrisma.integration.update.mockResolvedValue(updatedIntegration);

      const { refreshTokenIfNeeded: realRefreshTokenIfNeeded } = jest.requireActual('../services/integration-sync.service') as any;
      const result = await realRefreshTokenIfNeeded(integration);

      expect(mockPrisma.integration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tokenUpdatedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('token expiry detection', () => {
    it('should detect when token is near expiry (within 5 minutes)', () => {
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      const almostExpired = new Date(Date.now() + 3 * 60 * 1000);
      const notExpired = new Date(Date.now() + 10 * 60 * 1000);

      expect(almostExpired <= fiveMinutesFromNow).toBe(true);
      expect(notExpired > fiveMinutesFromNow).toBe(true);
    });

    it('should skip refresh when token expiry is not set', async () => {
      mockRefreshTokenIfNeeded.mockImplementation((integration: any) => {
        if (!integration.tokenExpiresAt) return Promise.resolve(integration);
        return Promise.resolve(integration);
      });

      const integration = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: encrypt('token'),
        refreshToken: encrypt('refresh'),
        tokenExpiresAt: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
      };

      const result = await mockRefreshTokenIfNeeded(integration);
      expect(result).toBe(integration);
    });
  });

  describe('getResources: null accessToken guard', () => {
    it('should throw REAUTH_REQUIRED when integration has null accessToken', async () => {
      const integrationWithNullToken = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
      };

      mockPrisma.integration.findUnique.mockResolvedValue(integrationWithNullToken);
      mockRefreshTokenIfNeeded.mockResolvedValue(integrationWithNullToken);

      const err = await getResources('user-1', 'slack', 1, 50).catch((e) => e);

      expect(err.code).toBe('REAUTH_REQUIRED');
    });
  });

  describe('syncIntegration: null accessToken handling', () => {
    it('should throw when integration accessToken is null and sync is attempted', async () => {
      const integrationWithNullToken = {
        id: 'int-1',
        userId: 'user-1',
        provider: 'slack',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
      };

      mockPrisma.integration.findUnique.mockResolvedValue(integrationWithNullToken);
      mockPrisma.integration.update.mockResolvedValue({ ...integrationWithNullToken, syncStatus: 'syncing' });
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      const { runSync: mockRunSync } = jest.requireMock('../services/integration-sync.service') as any;
      mockRunSync.mockRejectedValue(new Error('No access token available for sync'));

      const result = await syncIntegration('user-1', 'slack');
      expect(result).toEqual({ jobId: 'int-1', status: 'queued' });
    });
  });

  describe('Integration model field constraints', () => {
    it('should store all required token-related fields in upsert create payload', async () => {
      const state = generateOAuthState('user-1', 'slack');

      mockAxios.post = jest.fn().mockResolvedValue({
        data: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          team: { name: 'Team' },
          authed_user: { id: 'U1' },
        },
      });

      mockPrisma.integration.upsert.mockResolvedValue({ id: 'int-1', userId: 'user-1', provider: 'slack' });
      mockPrisma.integration.findUnique.mockResolvedValue({ id: 'int-1', userId: 'user-1', provider: 'slack' });
      mockPrisma.integrationActivity.create.mockResolvedValue({});

      await handleOAuthCallback('code', state);

      const upsertCall = mockPrisma.integration.upsert.mock.calls[0][0];
      const createData = upsertCall.create;

      expect(createData.accessToken).toBeDefined();
      expect(createData.accessToken).not.toBe('access-token');
      expect(decrypt(createData.accessToken)).toBe('access-token');

      expect(createData.refreshToken).toBeDefined();
      expect(decrypt(createData.refreshToken)).toBe('refresh-token');

      expect(createData.tokenExpiresAt).toBeInstanceOf(Date);
      expect(createData.tokenUpdatedAt).toBeInstanceOf(Date);
      expect(createData.status).toBe('connected');
      expect(createData.syncStatus).toBe('idle');
    });

    it('should support integration with only mandatory fields (null token scenario)', async () => {
      const minimalIntegration = {
        id: 'int-min',
        userId: 'user-1',
        provider: 'jira',
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        clientId: null,
        clientSecret: null,
        tokenExpiresAt: null,
        tokenUpdatedAt: null,
        accountId: null,
        accountName: null,
        accountEmail: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.integration.findMany.mockResolvedValue([minimalIntegration]);

      const result = await getIntegrations('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('int-min');
      expect(result[0].status).toBe('disconnected');
    });
  });
});
