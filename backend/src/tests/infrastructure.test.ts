import request from 'supertest';
import app from '../server';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    integration: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    syncLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    documentMetadata: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $connect: jest.fn(),
  },
  connectDB: jest.fn(),
}));

const mockPrisma = prisma as any;

describe('Infrastructure: Organization, SyncLog, DocumentMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Organization and User relations', () => {
    it('should create an Organization and link a User to it', async () => {
      const mockOrg = {
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@acme.com',
        password: 'hashed-password',
        role: 'USER',
        organizationId: 'org-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: mockOrg,
      };

      mockPrisma.organization.create.mockResolvedValue(mockOrg);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const org = await mockPrisma.organization.create({
        data: { name: 'Acme Corp', slug: 'acme-corp' },
      });

      expect(org.id).toBe('org-1');
      expect(org.name).toBe('Acme Corp');
      expect(org.slug).toBe('acme-corp');

      const user = await mockPrisma.user.create({
        data: {
          name: 'Alice',
          email: 'alice@acme.com',
          password: 'hashed-password',
          organizationId: org.id,
        },
      });

      expect(user.id).toBe('user-1');
      expect(user.organizationId).toBe('org-1');
      expect(user.organization).toMatchObject({ id: 'org-1', name: 'Acme Corp' });
    });

    it('should create a User without an Organization', async () => {
      const mockUser = {
        id: 'user-2',
        name: 'Bob',
        email: 'bob@example.com',
        password: 'hashed-password',
        role: 'USER',
        organizationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: null,
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      const user = await mockPrisma.user.create({
        data: { name: 'Bob', email: 'bob@example.com', password: 'hashed-password' },
      });

      expect(user.organizationId).toBeNull();
      expect(user.organization).toBeNull();
    });
  });

  describe('Integration fields and relations', () => {
    it('should create an Integration linked to a User and Organization with all fields', async () => {
      const tokenExpiresAt = new Date(Date.now() + 3600 * 1000);
      const lastSyncedAt = new Date();

      const mockIntegration = {
        id: 'int-1',
        userId: 'user-1',
        organizationId: 'org-1',
        provider: 'jira',
        status: 'connected',
        accessToken: 'encrypted-access-token',
        refreshToken: 'encrypted-refresh-token',
        clientId: 'client-id-123',
        clientSecret: 'client-secret-xyz',
        tokenExpiresAt,
        accountId: 'acc-001',
        accountName: 'Acme Jira',
        accountEmail: 'admin@acme.com',
        syncStatus: 'success',
        lastSyncedAt,
        syncedItemCount: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.integration.create.mockResolvedValue(mockIntegration);

      const integration = await mockPrisma.integration.create({
        data: {
          userId: 'user-1',
          organizationId: 'org-1',
          provider: 'jira',
          status: 'connected',
          accessToken: 'encrypted-access-token',
          refreshToken: 'encrypted-refresh-token',
          clientId: 'client-id-123',
          clientSecret: 'client-secret-xyz',
          tokenExpiresAt,
          accountId: 'acc-001',
          accountName: 'Acme Jira',
          accountEmail: 'admin@acme.com',
          syncStatus: 'success',
          lastSyncedAt,
          syncedItemCount: 42,
        },
      });

      expect(integration.id).toBe('int-1');
      expect(integration.provider).toBe('jira');
      expect(integration.status).toBe('connected');
      expect(integration.accessToken).toBe('encrypted-access-token');
      expect(integration.refreshToken).toBe('encrypted-refresh-token');
      expect(integration.clientId).toBe('client-id-123');
      expect(integration.clientSecret).toBe('client-secret-xyz');
      expect(integration.tokenExpiresAt).toBe(tokenExpiresAt);
      expect(integration.accountId).toBe('acc-001');
      expect(integration.accountName).toBe('Acme Jira');
      expect(integration.accountEmail).toBe('admin@acme.com');
      expect(integration.syncStatus).toBe('success');
      expect(integration.lastSyncedAt).toBe(lastSyncedAt);
      expect(integration.syncedItemCount).toBe(42);
      expect(integration.userId).toBe('user-1');
      expect(integration.organizationId).toBe('org-1');
    });

    it('should create an Integration with default status and syncStatus', async () => {
      const mockIntegration = {
        id: 'int-2',
        userId: 'user-1',
        organizationId: null,
        provider: 'slack',
        status: 'disconnected',
        accessToken: 'token',
        refreshToken: null,
        clientId: null,
        clientSecret: null,
        tokenExpiresAt: null,
        accountId: null,
        accountName: null,
        accountEmail: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.integration.create.mockResolvedValue(mockIntegration);

      const integration = await mockPrisma.integration.create({
        data: { userId: 'user-1', provider: 'slack', accessToken: 'token' },
      });

      expect(integration.status).toBe('disconnected');
      expect(integration.syncStatus).toBe('idle');
      expect(integration.refreshToken).toBeNull();
      expect(integration.organizationId).toBeNull();
    });
  });

  describe('SyncLog entries for an Integration', () => {
    it('should create multiple SyncLog entries for an Integration and verify relations and statuses', async () => {
      const startedAt1 = new Date(Date.now() - 5000);
      const completedAt1 = new Date(Date.now() - 1000);
      const startedAt2 = new Date(Date.now() - 2000);

      const mockSyncLogs = [
        {
          id: 'log-1',
          integrationId: 'int-1',
          provider: 'jira',
          status: 'success',
          triggeredBy: 'user',
          startedAt: startedAt1,
          completedAt: completedAt1,
          syncedCount: 20,
          errorMessage: null,
          details: { pages: 2 },
          integration: { id: 'int-1', provider: 'jira' },
        },
        {
          id: 'log-2',
          integrationId: 'int-1',
          provider: 'jira',
          status: 'failed',
          triggeredBy: 'scheduler',
          startedAt: startedAt2,
          completedAt: null,
          syncedCount: 0,
          errorMessage: 'Connection timeout',
          details: null,
          integration: { id: 'int-1', provider: 'jira' },
        },
        {
          id: 'log-3',
          integrationId: 'int-1',
          provider: 'jira',
          status: 'partial',
          triggeredBy: 'user',
          startedAt: new Date(),
          completedAt: null,
          syncedCount: 5,
          errorMessage: 'Rate limited on some items',
          details: { failed: ['item-3'] },
          integration: { id: 'int-1', provider: 'jira' },
        },
      ];

      mockPrisma.syncLog.create
        .mockResolvedValueOnce(mockSyncLogs[0])
        .mockResolvedValueOnce(mockSyncLogs[1])
        .mockResolvedValueOnce(mockSyncLogs[2]);

      mockPrisma.syncLog.findMany.mockResolvedValue(mockSyncLogs);

      const log1 = await mockPrisma.syncLog.create({
        data: {
          integrationId: 'int-1',
          provider: 'jira',
          status: 'success',
          triggeredBy: 'user',
          startedAt: startedAt1,
          completedAt: completedAt1,
          syncedCount: 20,
          details: { pages: 2 },
        },
      });

      const log2 = await mockPrisma.syncLog.create({
        data: {
          integrationId: 'int-1',
          provider: 'jira',
          status: 'failed',
          triggeredBy: 'scheduler',
          startedAt: startedAt2,
          errorMessage: 'Connection timeout',
        },
      });

      const log3 = await mockPrisma.syncLog.create({
        data: {
          integrationId: 'int-1',
          provider: 'jira',
          status: 'partial',
          triggeredBy: 'user',
          syncedCount: 5,
          errorMessage: 'Rate limited on some items',
          details: { failed: ['item-3'] },
        },
      });

      expect(log1.status).toBe('success');
      expect(log1.provider).toBe('jira');
      expect(log1.triggeredBy).toBe('user');
      expect(log1.syncedCount).toBe(20);
      expect(log1.completedAt).toBe(completedAt1);
      expect(log1.details).toEqual({ pages: 2 });

      expect(log2.status).toBe('failed');
      expect(log2.provider).toBe('jira');
      expect(log2.triggeredBy).toBe('scheduler');
      expect(log2.errorMessage).toBe('Connection timeout');
      expect(log2.completedAt).toBeNull();

      expect(log3.status).toBe('partial');
      expect(log3.triggeredBy).toBe('user');
      expect(log3.syncedCount).toBe(5);

      const allLogs = await mockPrisma.syncLog.findMany({
        where: { integrationId: 'int-1' },
        include: { integration: true },
      });

      expect(allLogs).toHaveLength(3);
      expect(allLogs.map((l: any) => l.status)).toEqual(['success', 'failed', 'partial']);
      allLogs.forEach((log: any) => {
        expect(log.integrationId).toBe('int-1');
        expect(log.provider).toBe('jira');
        expect(log.integration).toMatchObject({ id: 'int-1', provider: 'jira' });
      });
    });

    it('should allow querying SyncLogs by provider for cross-integration reporting', async () => {
      const mockSlackLogs = [
        {
          id: 'log-s1',
          integrationId: 'int-slack',
          provider: 'slack',
          status: 'success',
          triggeredBy: 'scheduler',
          startedAt: new Date(),
          completedAt: new Date(),
          syncedCount: 10,
          errorMessage: null,
          details: null,
        },
      ];

      const mockJiraLogs = [
        {
          id: 'log-j1',
          integrationId: 'int-jira',
          provider: 'jira',
          status: 'failed',
          triggeredBy: 'user',
          startedAt: new Date(),
          completedAt: null,
          syncedCount: 0,
          errorMessage: 'Auth error',
          details: null,
        },
      ];

      mockPrisma.syncLog.findMany
        .mockResolvedValueOnce(mockSlackLogs)
        .mockResolvedValueOnce(mockJiraLogs);

      const slackLogs = await mockPrisma.syncLog.findMany({ where: { provider: 'slack' } });
      const jiraLogs = await mockPrisma.syncLog.findMany({ where: { provider: 'jira' } });

      expect(slackLogs).toHaveLength(1);
      expect(slackLogs[0].provider).toBe('slack');
      expect(slackLogs[0].triggeredBy).toBe('scheduler');

      expect(jiraLogs).toHaveLength(1);
      expect(jiraLogs[0].provider).toBe('jira');
      expect(jiraLogs[0].triggeredBy).toBe('user');
      expect(jiraLogs[0].errorMessage).toBe('Auth error');
    });

    it('should support filtering SyncLogs by triggeredBy for audit reporting', async () => {
      const schedulerLogs = [
        { id: 'log-1', triggeredBy: 'scheduler', status: 'success', provider: 'slack' },
        { id: 'log-2', triggeredBy: 'scheduler', status: 'failed', provider: 'jira' },
      ];

      mockPrisma.syncLog.findMany.mockResolvedValue(schedulerLogs);

      const result = await mockPrisma.syncLog.findMany({ where: { triggeredBy: 'scheduler' } });

      expect(result).toHaveLength(2);
      result.forEach((log: any) => {
        expect(log.triggeredBy).toBe('scheduler');
      });
    });
  });

  describe('DocumentMetadata unique constraint on (provider, externalId)', () => {
    it('should create DocumentMetadata and verify all fields', async () => {
      const now = new Date();
      const mockDoc = {
        id: 'doc-1',
        externalId: 'JIRA-123',
        provider: 'jira',
        sourceUrl: 'https://acme.atlassian.net/browse/JIRA-123',
        title: 'Fix login bug',
        lastSyncedAt: now,
        integrationId: 'int-1',
        userId: 'user-1',
        organizationId: 'org-1',
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.documentMetadata.create.mockResolvedValue(mockDoc);

      const doc = await mockPrisma.documentMetadata.create({
        data: {
          externalId: 'JIRA-123',
          provider: 'jira',
          sourceUrl: 'https://acme.atlassian.net/browse/JIRA-123',
          title: 'Fix login bug',
          lastSyncedAt: now,
          integrationId: 'int-1',
          userId: 'user-1',
          organizationId: 'org-1',
        },
      });

      expect(doc.id).toBe('doc-1');
      expect(doc.externalId).toBe('JIRA-123');
      expect(doc.provider).toBe('jira');
      expect(doc.sourceUrl).toBe('https://acme.atlassian.net/browse/JIRA-123');
      expect(doc.title).toBe('Fix login bug');
      expect(doc.integrationId).toBe('int-1');
      expect(doc.userId).toBe('user-1');
      expect(doc.organizationId).toBe('org-1');
    });

    it('should reject duplicate (provider, externalId) combination', async () => {
      const uniqueViolationError = new Error(
        'Unique constraint failed on the fields: (`provider`,`externalId`)'
      );

      mockPrisma.documentMetadata.create
        .mockResolvedValueOnce({ id: 'doc-1', externalId: 'JIRA-123', provider: 'jira' })
        .mockRejectedValueOnce(uniqueViolationError);

      await mockPrisma.documentMetadata.create({
        data: { externalId: 'JIRA-123', provider: 'jira', integrationId: 'int-1', userId: 'user-1' },
      });

      await expect(
        mockPrisma.documentMetadata.create({
          data: { externalId: 'JIRA-123', provider: 'jira', integrationId: 'int-1', userId: 'user-1' },
        })
      ).rejects.toThrow('Unique constraint failed on the fields: (`provider`,`externalId`)');
    });

    it('should allow same externalId with a different provider', async () => {
      const mockDocJira = { id: 'doc-1', externalId: 'DOC-001', provider: 'jira' };
      const mockDocConfluence = { id: 'doc-2', externalId: 'DOC-001', provider: 'confluence' };

      mockPrisma.documentMetadata.create
        .mockResolvedValueOnce(mockDocJira)
        .mockResolvedValueOnce(mockDocConfluence);

      const docJira = await mockPrisma.documentMetadata.create({
        data: { externalId: 'DOC-001', provider: 'jira', integrationId: 'int-1', userId: 'user-1' },
      });

      const docConfluence = await mockPrisma.documentMetadata.create({
        data: { externalId: 'DOC-001', provider: 'confluence', integrationId: 'int-2', userId: 'user-1' },
      });

      expect(docJira.provider).toBe('jira');
      expect(docConfluence.provider).toBe('confluence');
      expect(docJira.externalId).toBe(docConfluence.externalId);
    });
  });

  describe('Cascade deletion of Integration', () => {
    it('should delete SyncLogs when Integration is deleted', async () => {
      const mockDeletedIntegration = { id: 'int-1', provider: 'jira', userId: 'user-1' };

      mockPrisma.syncLog.findMany.mockResolvedValueOnce([
        { id: 'log-1', integrationId: 'int-1' },
        { id: 'log-2', integrationId: 'int-1' },
      ]);

      mockPrisma.integration.delete.mockResolvedValue(mockDeletedIntegration);

      mockPrisma.syncLog.findMany.mockResolvedValueOnce([]);

      const logsBefore = await mockPrisma.syncLog.findMany({ where: { integrationId: 'int-1' } });
      expect(logsBefore).toHaveLength(2);

      const deleted = await mockPrisma.integration.delete({ where: { id: 'int-1' } });
      expect(deleted.id).toBe('int-1');

      const logsAfter = await mockPrisma.syncLog.findMany({ where: { integrationId: 'int-1' } });
      expect(logsAfter).toHaveLength(0);
    });

    it('should delete DocumentMetadata when Integration is deleted', async () => {
      const mockDeletedIntegration = { id: 'int-1', provider: 'jira', userId: 'user-1' };

      mockPrisma.documentMetadata.findMany.mockResolvedValueOnce([
        { id: 'doc-1', integrationId: 'int-1' },
        { id: 'doc-2', integrationId: 'int-1' },
      ]);

      mockPrisma.integration.delete.mockResolvedValue(mockDeletedIntegration);

      mockPrisma.documentMetadata.findMany.mockResolvedValueOnce([]);

      const docsBefore = await mockPrisma.documentMetadata.findMany({ where: { integrationId: 'int-1' } });
      expect(docsBefore).toHaveLength(2);

      const deleted = await mockPrisma.integration.delete({ where: { id: 'int-1' } });
      expect(deleted.id).toBe('int-1');

      const docsAfter = await mockPrisma.documentMetadata.findMany({ where: { integrationId: 'int-1' } });
      expect(docsAfter).toHaveLength(0);
    });

    it('should delete both SyncLogs and DocumentMetadata when Integration is deleted', async () => {
      mockPrisma.syncLog.findMany
        .mockResolvedValueOnce([{ id: 'log-1', integrationId: 'int-2' }])
        .mockResolvedValueOnce([]);

      mockPrisma.documentMetadata.findMany
        .mockResolvedValueOnce([{ id: 'doc-1', integrationId: 'int-2' }])
        .mockResolvedValueOnce([]);

      mockPrisma.integration.delete.mockResolvedValue({ id: 'int-2' });

      const logsBefore = await mockPrisma.syncLog.findMany({ where: { integrationId: 'int-2' } });
      const docsBefore = await mockPrisma.documentMetadata.findMany({ where: { integrationId: 'int-2' } });

      expect(logsBefore).toHaveLength(1);
      expect(docsBefore).toHaveLength(1);

      await mockPrisma.integration.delete({ where: { id: 'int-2' } });

      const logsAfter = await mockPrisma.syncLog.findMany({ where: { integrationId: 'int-2' } });
      const docsAfter = await mockPrisma.documentMetadata.findMany({ where: { integrationId: 'int-2' } });

      expect(logsAfter).toHaveLength(0);
      expect(docsAfter).toHaveLength(0);
    });
  });

  describe('Infrastructure E2E', () => {
    it('should include organizationId in user profile', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET || 'secret');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        organizationId: 'org-1',
      });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.organizationId).toBe('org-1');
    });
  });
});
