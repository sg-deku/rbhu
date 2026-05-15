import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'rbhu' },
    update: {},
    create: {
      name: 'RBHU',
      slug: 'rbhu',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rbhu.ai' },
    update: { organizationId: org.id },
    create: {
      email: 'admin@rbhu.ai',
      name: 'Admin User',
      password: hashedPassword,
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
      password: hashedPassword,
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  const integration = await prisma.integration.upsert({
    where: { userId_provider: { userId: admin.id, provider: 'jira' } },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      provider: 'jira',
      status: 'connected',
      accessToken: 'sample-access-token',
      refreshToken: 'sample-refresh-token',
      accountId: 'sample-account-id',
      accountName: 'RBHU Jira',
      accountEmail: 'admin@rbhu.ai',
      syncStatus: 'idle',
    },
  });

  await prisma.syncLog.create({
    data: {
      integrationId: integration.id,
      status: 'success',
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(),
      syncedCount: 42,
      details: { pages: 10, issues: 32 },
    },
  });

  await prisma.syncLog.create({
    data: {
      integrationId: integration.id,
      status: 'failed',
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3540000),
      syncedCount: 0,
      errorMessage: 'Token expired during sync',
      details: { retries: 3 },
    },
  });

  console.log('Seeding successful:', {
    organization: { id: org.id, slug: org.slug },
    admin: { id: admin.id, email: admin.email, role: admin.role },
    integration: { id: integration.id, provider: integration.provider },
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
