import prisma from '../config/database';

export interface IntegrationDTO {
  id: string;
  provider: string;
  status: string;
  accountName: string | null;
  accountEmail: string | null;
  syncStatus: string;
  lastSyncedAt: Date | null;
  syncedItemCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDTO(integration: any): IntegrationDTO {
  return {
    id: integration.id,
    provider: integration.provider,
    status: integration.status,
    accountName: integration.accountName,
    accountEmail: integration.accountEmail,
    syncStatus: integration.syncStatus,
    lastSyncedAt: integration.lastSyncedAt,
    syncedItemCount: integration.syncedItemCount,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

export async function getIntegrations(userId: string): Promise<IntegrationDTO[]> {
  const integrations = await prisma.integration.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return integrations.map(toDTO);
}
