import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 12);
  const adminPassword = await bcrypt.hash('admin', 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'rbhu' },
    update: {},
    create: {
      name: 'RBHU',
      slug: 'rbhu',
    },
  });

  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Corp',
      slug: 'demo-corp',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rbhu.ai' },
    update: { organizationId: org.id },
    create: {
      email: 'admin@rbhu.ai',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin' },
    update: { organizationId: org.id },
    create: {
      email: 'admin',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: 'user@rbhu.ai' },
    update: { organizationId: org.id },
    create: {
      email: 'user@rbhu.ai',
      name: 'Test User',
      password: hashedPassword,
      role: 'USER',
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@demo-corp.com' },
    update: { organizationId: demoOrg.id },
    create: {
      email: 'demo@demo-corp.com',
      name: 'Demo User',
      password: hashedPassword,
      role: 'USER',
      organizationId: demoOrg.id,
    },
  });

  const jiraIntegration = await prisma.integration.upsert({
    where: { userId_provider: { userId: admin.id, provider: 'jira' } },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      provider: 'jira',
      status: 'connected',
      accessToken: 'sample-jira-access-token',
      refreshToken: 'sample-jira-refresh-token',
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      tokenUpdatedAt: new Date(),
      accountId: 'jira-account-id',
      accountName: 'RBHU Jira',
      accountEmail: 'admin@rbhu.ai',
      syncStatus: 'success',
      lastSyncedAt: new Date(Date.now() - 30 * 60 * 1000),
      syncedItemCount: 42,
    },
  });

  const slackIntegration = await prisma.integration.upsert({
    where: { userId_provider: { userId: admin.id, provider: 'slack' } },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      provider: 'slack',
      status: 'connected',
      accessToken: 'sample-slack-access-token',
      tokenUpdatedAt: new Date(),
      accountId: 'T0123456789',
      accountName: 'RBHU Workspace',
      accountEmail: 'admin@rbhu.ai',
      syncStatus: 'idle',
      lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      syncedItemCount: 18,
    },
  });

  await prisma.integration.upsert({
    where: { userId_provider: { userId: admin.id, provider: 'confluence' } },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      provider: 'confluence',
      status: 'disconnected',
      syncStatus: 'idle',
    },
  });

  await prisma.integration.upsert({
    where: { userId_provider: { userId: testUser.id, provider: 'slack' } },
    update: {},
    create: {
      userId: testUser.id,
      organizationId: org.id,
      provider: 'slack',
      status: 'error',
      accessToken: 'expired-slack-token',
      tokenUpdatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      accountId: 'T0123456789',
      accountName: 'RBHU Workspace',
      accountEmail: 'user@rbhu.ai',
      syncStatus: 'failed',
      lastSyncedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      syncedItemCount: 5,
    },
  });

  await prisma.integrationConfig.upsert({
    where: { integrationId: jiraIntegration.id },
    update: {},
    create: {
      integrationId: jiraIntegration.id,
      selectedResourceIds: ['PROJECT-1', 'PROJECT-2', 'PROJECT-3'],
    },
  });

  await prisma.integrationConfig.upsert({
    where: { integrationId: slackIntegration.id },
    update: {},
    create: {
      integrationId: slackIntegration.id,
      selectedResourceIds: ['C01GENERAL', 'C02ENGINEERING', 'C03PRODUCT'],
    },
  });

  await prisma.integrationActivity.createMany({
    data: [
      {
        integrationId: jiraIntegration.id,
        userId: admin.id,
        provider: 'jira',
        eventType: 'connected',
        message: 'Jira integration connected successfully',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        integrationId: jiraIntegration.id,
        userId: admin.id,
        provider: 'jira',
        eventType: 'config_updated',
        message: 'Sync configuration updated for Jira',
        detail: 'Selected 3 projects for synchronization',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        integrationId: jiraIntegration.id,
        userId: admin.id,
        provider: 'jira',
        eventType: 'sync_success',
        message: 'Jira sync completed successfully',
        syncedItemCount: 42,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        integrationId: slackIntegration.id,
        userId: admin.id,
        provider: 'slack',
        eventType: 'connected',
        message: 'Slack integration connected successfully',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        integrationId: slackIntegration.id,
        userId: admin.id,
        provider: 'slack',
        eventType: 'sync_success',
        message: 'Slack sync completed successfully',
        syncedItemCount: 18,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        integrationId: jiraIntegration.id,
        userId: admin.id,
        provider: 'jira',
        eventType: 'sync_failed',
        message: 'Jira sync failed',
        detail: 'Token expired during sync. Please reconnect.',
        syncedItemCount: 0,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.syncLog.createMany({
    data: [
      {
        integrationId: jiraIntegration.id,
        provider: 'jira',
        status: 'success',
        triggeredBy: 'scheduler',
        startedAt: new Date(Date.now() - 31 * 60 * 1000),
        completedAt: new Date(Date.now() - 30 * 60 * 1000),
        syncedCount: 42,
        details: { projects: 3, issues: 39 },
      },
      {
        integrationId: jiraIntegration.id,
        provider: 'jira',
        status: 'failed',
        triggeredBy: 'scheduler',
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90000),
        syncedCount: 0,
        errorMessage: 'Token expired during sync',
        details: { retries: 3 },
      },
      {
        integrationId: slackIntegration.id,
        provider: 'slack',
        status: 'success',
        triggeredBy: 'user',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000),
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 60000),
        syncedCount: 18,
        details: { channels: 3, messages: 15 },
      },
      {
        integrationId: slackIntegration.id,
        provider: 'slack',
        status: 'partial',
        triggeredBy: 'scheduler',
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 45000),
        syncedCount: 10,
        errorMessage: 'Rate limit reached, partial sync completed',
        details: { channels: 3, messages: 10, skipped: 5 },
      },
    ],
  });

  await prisma.documentMetadata.createMany({
    data: [
      {
        externalId: 'PROJ-101',
        provider: 'jira',
        contentType: 'issue',
        sourceUrl: 'https://rbhu.atlassian.net/browse/PROJ-101',
        title: 'Implement OAuth flow for integrations',
        metadata: { priority: 'high', status: 'in_progress', assignee: 'admin@rbhu.ai' },
        lastSyncedAt: new Date(Date.now() - 30 * 60 * 1000),
        integrationId: jiraIntegration.id,
        userId: admin.id,
        organizationId: org.id,
      },
      {
        externalId: 'PROJ-102',
        provider: 'jira',
        contentType: 'issue',
        sourceUrl: 'https://rbhu.atlassian.net/browse/PROJ-102',
        title: 'Add sync progress indicators to UI',
        metadata: { priority: 'medium', status: 'todo', assignee: 'user@rbhu.ai' },
        lastSyncedAt: new Date(Date.now() - 30 * 60 * 1000),
        integrationId: jiraIntegration.id,
        userId: admin.id,
        organizationId: org.id,
      },
      {
        externalId: 'C01GENERAL',
        provider: 'slack',
        contentType: 'channel',
        sourceUrl: 'https://rbhu-workspace.slack.com/archives/C01GENERAL',
        title: '#general',
        metadata: { memberCount: 45, isPrivate: false },
        lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        integrationId: slackIntegration.id,
        userId: admin.id,
        organizationId: org.id,
      },
      {
        externalId: 'C02ENGINEERING',
        provider: 'slack',
        contentType: 'channel',
        sourceUrl: 'https://rbhu-workspace.slack.com/archives/C02ENGINEERING',
        title: '#engineering',
        metadata: { memberCount: 12, isPrivate: false },
        lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        integrationId: slackIntegration.id,
        userId: admin.id,
        organizationId: org.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding successful:', {
    organizations: [
      { id: org.id, slug: org.slug },
      { id: demoOrg.id, slug: demoOrg.slug },
    ],
    users: [
      { id: admin.id, email: admin.email, role: admin.role },
      { id: testUser.id, email: testUser.email, role: testUser.role },
    ],
    integrations: [
      { id: jiraIntegration.id, provider: jiraIntegration.provider, status: jiraIntegration.status },
      { id: slackIntegration.id, provider: slackIntegration.provider, status: slackIntegration.status },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
