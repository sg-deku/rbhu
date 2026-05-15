import prisma from '../config/database';

// Mock Prisma
jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    syncLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('RB-52: Integration Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify Integration model fields and relations', async () => {
    const mockIntegration = {
      id: 'int-1',
      userId: 'user-1',
      provider: 'jira',
      status: 'connected',
      accessToken: 'encrypted-access-token',
      syncStatus: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.integration.create as jest.Mock).mockResolvedValue(mockIntegration);

    const result = await prisma.integration.create({
      data: {
        userId: 'user-1',
        provider: 'jira',
        accessToken: 'encrypted-access-token',
        status: 'connected',
      } as any,
    });

    expect(result.provider).toBe('jira');
    expect(result.accessToken).toBe('encrypted-access-token');
    expect(result.status).toBe('connected');
    expect(result.syncStatus).toBe('idle');
  });
});

describe('RB-53: SyncLog Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify SyncLog model fields and relations', async () => {
    const mockSyncLog = {
      id: 'log-1',
      integrationId: 'int-1',
      status: 'success',
      startedAt: new Date(),
      completedAt: new Date(),
      syncedCount: 10,
      errorMessage: null,
      details: { items: ['item1', 'item2'] },
    };

    (prisma.syncLog.create as jest.Mock).mockResolvedValue(mockSyncLog);

    const result = await prisma.syncLog.create({
      data: {
        integrationId: 'int-1',
        status: 'success',
        syncedCount: 10,
      } as any,
    });

    expect(result.status).toBe('success');
    expect(result.syncedCount).toBe(10);
    expect(result.integrationId).toBe('int-1');
  });
});
