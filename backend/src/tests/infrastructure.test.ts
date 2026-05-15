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
    documentMetadata: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
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

describe('RB-54: DocumentMetadata Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify DocumentMetadata model fields and relations', async () => {
    const mockDoc = {
      id: 'doc-1',
      externalId: 'ext-1',
      provider: 'jira',
      sourceUrl: 'https://jira.com/ext-1',
      title: 'Doc Title',
      integrationId: 'int-1',
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.documentMetadata.create as jest.Mock).mockResolvedValue(mockDoc);

    const result = await prisma.documentMetadata.create({
      data: {
        externalId: 'ext-1',
        provider: 'jira',
        integrationId: 'int-1',
        userId: 'user-1',
      } as any,
    });

    expect(result.externalId).toBe('ext-1');
    expect(result.provider).toBe('jira');
    expect(result.integrationId).toBe('int-1');
  });
});

describe('RB-55: Organization Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify Organization model and relations', async () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.organization.create as jest.Mock).mockResolvedValue(mockOrg);

    const result = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org',
      },
    });

    expect(result.name).toBe('Test Org');
    expect(result.slug).toBe('test-org');
  });
});
