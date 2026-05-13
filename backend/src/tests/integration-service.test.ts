import { getIntegrations } from '../services/integration.service';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '../config/database';

const mockPrisma = prisma as any;

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
});
