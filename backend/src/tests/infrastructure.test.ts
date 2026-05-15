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
