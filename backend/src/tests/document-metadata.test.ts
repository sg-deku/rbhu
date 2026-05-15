import {
  upsertDocumentMetadata,
  getDocumentsByIntegration,
  getDocumentsByUser,
} from '../services/integration.service';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findUnique: jest.fn(),
    },
    documentMetadata: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
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

import prisma from '../config/database';

const mockPrisma = prisma as any;

beforeAll(() => {
  process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DocumentMetadata: upsertDocumentMetadata', () => {
  it('should create a new DocumentMetadata entry with all fields', async () => {
    const now = new Date();
    const mockDoc = {
      id: 'doc-1',
      externalId: 'PROJ-123',
      provider: 'jira',
      contentType: 'project',
      sourceUrl: 'https://acme.atlassian.net/browse/PROJ',
      title: 'Project Alpha',
      metadata: { key: 'PROJ', projectTypeKey: 'software', cloudId: 'cloud-1' },
      lastSyncedAt: now,
      integrationId: 'int-1',
      userId: 'user-1',
      organizationId: 'org-1',
      createdAt: now,
      updatedAt: now,
    };

    mockPrisma.documentMetadata.upsert.mockResolvedValue(mockDoc);

    const result = await upsertDocumentMetadata({
      integrationId: 'int-1',
      userId: 'user-1',
      organizationId: 'org-1',
      provider: 'jira',
      externalId: 'PROJ-123',
      contentType: 'project',
      title: 'Project Alpha',
      sourceUrl: 'https://acme.atlassian.net/browse/PROJ',
      metadata: { key: 'PROJ', projectTypeKey: 'software', cloudId: 'cloud-1' },
    });

    expect(mockPrisma.documentMetadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { integrationId_externalId: { integrationId: 'int-1', externalId: 'PROJ-123' } },
        create: expect.objectContaining({
          integrationId: 'int-1',
          userId: 'user-1',
          organizationId: 'org-1',
          provider: 'jira',
          externalId: 'PROJ-123',
          contentType: 'project',
          title: 'Project Alpha',
        }),
        update: expect.objectContaining({
          title: 'Project Alpha',
        }),
      })
    );

    expect(result.id).toBe('doc-1');
    expect(result.externalId).toBe('PROJ-123');
    expect(result.provider).toBe('jira');
    expect(result.contentType).toBe('project');
    expect(result.title).toBe('Project Alpha');
    expect(result.integrationId).toBe('int-1');
    expect(result.userId).toBe('user-1');
    expect(result.organizationId).toBe('org-1');
    expect(result.metadata).toEqual({ key: 'PROJ', projectTypeKey: 'software', cloudId: 'cloud-1' });
  });

  it('should update an existing DocumentMetadata entry on re-sync', async () => {
    const now = new Date();
    const updatedDoc = {
      id: 'doc-1',
      externalId: 'C001',
      provider: 'slack',
      contentType: 'channel',
      sourceUrl: null,
      title: 'general-renamed',
      metadata: { is_private: false, num_members: 50 },
      lastSyncedAt: now,
      integrationId: 'int-2',
      userId: 'user-1',
      organizationId: null,
      createdAt: new Date(now.getTime() - 10000),
      updatedAt: now,
    };

    mockPrisma.documentMetadata.upsert.mockResolvedValue(updatedDoc);

    const result = await upsertDocumentMetadata({
      integrationId: 'int-2',
      userId: 'user-1',
      provider: 'slack',
      externalId: 'C001',
      contentType: 'channel',
      title: 'general-renamed',
      metadata: { is_private: false, num_members: 50 },
    });

    expect(result.title).toBe('general-renamed');
    expect(result.metadata).toEqual({ is_private: false, num_members: 50 });
    expect(result.organizationId).toBeNull();
  });

  it('should handle null optional fields gracefully', async () => {
    const now = new Date();
    const minimalDoc = {
      id: 'doc-min',
      externalId: 'SPACE-1',
      provider: 'confluence',
      contentType: 'space',
      sourceUrl: null,
      title: null,
      metadata: null,
      lastSyncedAt: now,
      integrationId: 'int-3',
      userId: 'user-2',
      organizationId: null,
      createdAt: now,
      updatedAt: now,
    };

    mockPrisma.documentMetadata.upsert.mockResolvedValue(minimalDoc);

    const result = await upsertDocumentMetadata({
      integrationId: 'int-3',
      userId: 'user-2',
      provider: 'confluence',
      externalId: 'SPACE-1',
      contentType: 'space',
    });

    expect(result.sourceUrl).toBeNull();
    expect(result.title).toBeNull();
    expect(result.metadata).toBeNull();
  });

  it('should set lastSyncedAt on upsert', async () => {
    const now = new Date();
    const mockDoc = {
      id: 'doc-ts',
      externalId: 'CH-1',
      provider: 'slack',
      contentType: 'channel',
      sourceUrl: null,
      title: 'random',
      metadata: null,
      lastSyncedAt: now,
      integrationId: 'int-1',
      userId: 'user-1',
      organizationId: null,
      createdAt: now,
      updatedAt: now,
    };

    mockPrisma.documentMetadata.upsert.mockResolvedValue(mockDoc);

    await upsertDocumentMetadata({
      integrationId: 'int-1',
      userId: 'user-1',
      provider: 'slack',
      externalId: 'CH-1',
      contentType: 'channel',
      title: 'random',
    });

    const upsertCall = mockPrisma.documentMetadata.upsert.mock.calls[0][0];
    expect(upsertCall.create.lastSyncedAt).toBeInstanceOf(Date);
    expect(upsertCall.update.lastSyncedAt).toBeInstanceOf(Date);
  });
});

describe('DocumentMetadata: getDocumentsByIntegration', () => {
  it('should return paginated documents for an integration', async () => {
    const now = new Date();
    const mockDocs = [
      {
        id: 'doc-1',
        externalId: 'PROJ-1',
        provider: 'jira',
        contentType: 'project',
        sourceUrl: 'https://jira.example.com/browse/PROJ-1',
        title: 'Project Alpha',
        metadata: { key: 'PA' },
        lastSyncedAt: now,
        integrationId: 'int-1',
        userId: 'user-1',
        organizationId: 'org-1',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'doc-2',
        externalId: 'PROJ-2',
        provider: 'jira',
        contentType: 'project',
        sourceUrl: 'https://jira.example.com/browse/PROJ-2',
        title: 'Project Beta',
        metadata: { key: 'PB' },
        lastSyncedAt: now,
        integrationId: 'int-1',
        userId: 'user-1',
        organizationId: 'org-1',
        createdAt: now,
        updatedAt: now,
      },
    ];

    mockPrisma.documentMetadata.findMany.mockResolvedValue(mockDocs);
    mockPrisma.documentMetadata.count.mockResolvedValue(2);

    const result = await getDocumentsByIntegration('int-1', 1, 20);

    expect(mockPrisma.documentMetadata.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { integrationId: 'int-1' },
        orderBy: { lastSyncedAt: 'desc' },
        skip: 0,
        take: 20,
      })
    );
    expect(mockPrisma.documentMetadata.count).toHaveBeenCalledWith({ where: { integrationId: 'int-1' } });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
    expect(result.data[0].contentType).toBe('project');
    expect(result.data[0].metadata).toEqual({ key: 'PA' });
  });

  it('should apply correct skip for page 2', async () => {
    mockPrisma.documentMetadata.findMany.mockResolvedValue([]);
    mockPrisma.documentMetadata.count.mockResolvedValue(30);

    await getDocumentsByIntegration('int-1', 2, 10);

    expect(mockPrisma.documentMetadata.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it('should return empty result when no documents exist', async () => {
    mockPrisma.documentMetadata.findMany.mockResolvedValue([]);
    mockPrisma.documentMetadata.count.mockResolvedValue(0);

    const result = await getDocumentsByIntegration('int-no-docs', 1, 20);

    expect(result.data).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});

describe('DocumentMetadata: getDocumentsByUser', () => {
  it('should return paginated documents across all integrations for a user', async () => {
    const now = new Date();
    const mockDocs = [
      {
        id: 'doc-j1',
        externalId: 'PROJ-1',
        provider: 'jira',
        contentType: 'project',
        sourceUrl: null,
        title: 'Jira Project',
        metadata: null,
        lastSyncedAt: now,
        integrationId: 'int-jira',
        userId: 'user-1',
        organizationId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'doc-s1',
        externalId: 'C001',
        provider: 'slack',
        contentType: 'channel',
        sourceUrl: null,
        title: 'general',
        metadata: null,
        lastSyncedAt: now,
        integrationId: 'int-slack',
        userId: 'user-1',
        organizationId: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    mockPrisma.documentMetadata.findMany.mockResolvedValue(mockDocs);
    mockPrisma.documentMetadata.count.mockResolvedValue(2);

    const result = await getDocumentsByUser('user-1', 1, 20);

    expect(mockPrisma.documentMetadata.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { lastSyncedAt: 'desc' },
        skip: 0,
        take: 20,
      })
    );
    expect(mockPrisma.documentMetadata.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });

    expect(result.data).toHaveLength(2);
    expect(result.data.map((d) => d.provider)).toEqual(['jira', 'slack']);
    expect(result.pagination.total).toBe(2);
  });

  it('should scope documents per user so different users do not see each other documents', async () => {
    const now = new Date();
    const user1Docs = [{ id: 'doc-1', externalId: 'C001', provider: 'slack', contentType: 'channel', sourceUrl: null, title: 'general', metadata: null, lastSyncedAt: now, integrationId: 'int-u1', userId: 'user-1', organizationId: null, createdAt: now, updatedAt: now }];
    const user2Docs = [{ id: 'doc-2', externalId: 'C001', provider: 'slack', contentType: 'channel', sourceUrl: null, title: 'general', metadata: null, lastSyncedAt: now, integrationId: 'int-u2', userId: 'user-2', organizationId: null, createdAt: now, updatedAt: now }];

    mockPrisma.documentMetadata.findMany
      .mockResolvedValueOnce(user1Docs)
      .mockResolvedValueOnce(user2Docs);
    mockPrisma.documentMetadata.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const result1 = await getDocumentsByUser('user-1', 1, 20);
    const result2 = await getDocumentsByUser('user-2', 1, 20);

    expect(result1.data[0].userId).toBe('user-1');
    expect(result1.data[0].integrationId).toBe('int-u1');

    expect(result2.data[0].userId).toBe('user-2');
    expect(result2.data[0].integrationId).toBe('int-u2');
  });
});

describe('DocumentMetadata: model field validation', () => {
  it('should include contentType in all returned DTOs', async () => {
    const now = new Date();
    const docs = [
      { id: 'd1', externalId: 'C001', provider: 'slack', contentType: 'channel', sourceUrl: null, title: 'general', metadata: null, lastSyncedAt: now, integrationId: 'int-1', userId: 'user-1', organizationId: null, createdAt: now, updatedAt: now },
      { id: 'd2', externalId: 'PROJ-1', provider: 'jira', contentType: 'project', sourceUrl: null, title: 'Alpha', metadata: null, lastSyncedAt: now, integrationId: 'int-1', userId: 'user-1', organizationId: null, createdAt: now, updatedAt: now },
      { id: 'd3', externalId: 'SPACE-1', provider: 'confluence', contentType: 'space', sourceUrl: null, title: 'Engineering', metadata: null, lastSyncedAt: now, integrationId: 'int-1', userId: 'user-1', organizationId: null, createdAt: now, updatedAt: now },
    ];

    mockPrisma.documentMetadata.findMany.mockResolvedValue(docs);
    mockPrisma.documentMetadata.count.mockResolvedValue(3);

    const result = await getDocumentsByIntegration('int-1', 1, 20);

    expect(result.data[0].contentType).toBe('channel');
    expect(result.data[1].contentType).toBe('project');
    expect(result.data[2].contentType).toBe('space');
  });

  it('should include metadata JSON field in returned DTOs', async () => {
    const now = new Date();
    const metadataPayload = { key: 'ENG', projectTypeKey: 'software', cloudId: 'cloud-abc' };
    const doc = {
      id: 'doc-m1',
      externalId: 'ENG-1',
      provider: 'jira',
      contentType: 'project',
      sourceUrl: 'https://jira.example.com/browse/ENG',
      title: 'Engineering',
      metadata: metadataPayload,
      lastSyncedAt: now,
      integrationId: 'int-1',
      userId: 'user-1',
      organizationId: null,
      createdAt: now,
      updatedAt: now,
    };

    mockPrisma.documentMetadata.upsert.mockResolvedValue(doc);

    const result = await upsertDocumentMetadata({
      integrationId: 'int-1',
      userId: 'user-1',
      provider: 'jira',
      externalId: 'ENG-1',
      contentType: 'project',
      metadata: metadataPayload,
    });

    expect(result.metadata).toEqual(metadataPayload);
  });

  it('should use integrationId+externalId as the unique key (not provider+externalId)', async () => {
    const now = new Date();
    const user1Doc = {
      id: 'doc-u1',
      externalId: 'PROJ-1',
      provider: 'jira',
      contentType: 'project',
      sourceUrl: null,
      title: 'Shared Project',
      metadata: null,
      lastSyncedAt: now,
      integrationId: 'int-user1',
      userId: 'user-1',
      organizationId: null,
      createdAt: now,
      updatedAt: now,
    };
    const user2Doc = {
      id: 'doc-u2',
      externalId: 'PROJ-1',
      provider: 'jira',
      contentType: 'project',
      sourceUrl: null,
      title: 'Shared Project',
      metadata: null,
      lastSyncedAt: now,
      integrationId: 'int-user2',
      userId: 'user-2',
      organizationId: null,
      createdAt: now,
      updatedAt: now,
    };

    mockPrisma.documentMetadata.upsert
      .mockResolvedValueOnce(user1Doc)
      .mockResolvedValueOnce(user2Doc);

    const result1 = await upsertDocumentMetadata({
      integrationId: 'int-user1',
      userId: 'user-1',
      provider: 'jira',
      externalId: 'PROJ-1',
      contentType: 'project',
      title: 'Shared Project',
    });

    const result2 = await upsertDocumentMetadata({
      integrationId: 'int-user2',
      userId: 'user-2',
      provider: 'jira',
      externalId: 'PROJ-1',
      contentType: 'project',
      title: 'Shared Project',
    });

    expect(result1.id).toBe('doc-u1');
    expect(result2.id).toBe('doc-u2');
    expect(result1.integrationId).not.toBe(result2.integrationId);

    const call1 = mockPrisma.documentMetadata.upsert.mock.calls[0][0];
    const call2 = mockPrisma.documentMetadata.upsert.mock.calls[1][0];
    expect(call1.where.integrationId_externalId.integrationId).toBe('int-user1');
    expect(call2.where.integrationId_externalId.integrationId).toBe('int-user2');
  });
});
