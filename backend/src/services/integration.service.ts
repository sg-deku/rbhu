import axios from 'axios';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { generateOAuthState, verifyOAuthState } from '../utils/oauth-state';
import { getProviderConfig } from '../config/integrations';
import { runSync } from './integration-sync.service';

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

export async function initiateOAuth(
  userId: string,
  provider: 'jira' | 'slack' | 'confluence'
): Promise<{ authorizationUrl: string }> {
  const state = generateOAuthState(userId, provider);
  const config = getProviderConfig(provider);
  const scopeStr = config.scopes.join('%20');

  let url =
    `${config.authorizationUrl}` +
    `?client_id=${config.clientId}` +
    `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
    `&scope=${scopeStr}` +
    `&response_type=code` +
    `&state=${state}` +
    `&prompt=consent`;

  if (provider === 'jira' || provider === 'confluence') {
    url += '&audience=api.atlassian.com';
  }

  return { authorizationUrl: url };
}

async function fetchAtlassianAccount(accessToken: string): Promise<{ accountName: string | null; accountEmail: string | null }> {
  try {
    const res = await axios.get('https://api.atlassian.com/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      accountName: res.data.name || null,
      accountEmail: res.data.email || null,
    };
  } catch {
    return { accountName: null, accountEmail: null };
  }
}

export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<{ userId: string; provider: string }> {
  const { userId, provider } = verifyOAuthState(state);
  const config = getProviderConfig(provider as 'jira' | 'slack' | 'confluence');

  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const tokenRes = await axios.post(config.tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const tokenData = tokenRes.data;
  const rawAccessToken: string = tokenData.access_token;
  const rawRefreshToken: string | undefined = tokenData.refresh_token;
  const expiresIn: number | undefined = tokenData.expires_in;

  const encryptedAccessToken = encrypt(rawAccessToken);
  const encryptedRefreshToken = rawRefreshToken ? encrypt(rawRefreshToken) : null;
  const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  let accountName: string | null = null;
  let accountEmail: string | null = null;

  if (provider === 'slack') {
    accountName = tokenData.team?.name || null;
    accountEmail = tokenData.authed_user?.id || null;
  } else {
    const account = await fetchAtlassianAccount(rawAccessToken);
    accountName = account.accountName;
    accountEmail = account.accountEmail;
  }

  await prisma.integration.upsert({
    where: { userId_provider: { userId, provider: provider as any } },
    create: {
      userId,
      provider: provider as any,
      status: 'connected',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
      accountName,
      accountEmail,
      syncStatus: 'idle',
    },
    update: {
      status: 'connected',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
      accountName,
      accountEmail,
      syncStatus: 'idle',
    },
  });

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: provider as any } },
  });

  if (integration) {
    await prisma.integrationActivity.create({
      data: {
        integrationId: integration.id,
        userId,
        provider: provider as any,
        eventType: 'connected',
        message: `Connected to ${provider}`,
      },
    });
  }

  return { userId, provider };
}

export async function syncIntegration(
  userId: string,
  provider: 'jira' | 'slack' | 'confluence'
): Promise<{ jobId: string; status: string }> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!integration) {
    throw new Error('Integration not found');
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { syncStatus: 'syncing' },
  });

  runSync(integration as any)
    .then(async ({ syncedItemCount }) => {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'success',
          lastSyncedAt: new Date(),
          syncedItemCount,
        },
      });
      await prisma.integrationActivity.create({
        data: {
          integrationId: integration.id,
          userId,
          provider: provider as any,
          eventType: 'sync_success',
          message: `Sync completed for ${provider}`,
          syncedItemCount,
        },
      });
    })
    .catch(async (err: Error) => {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { syncStatus: 'failed' },
      });
      await prisma.integrationActivity.create({
        data: {
          integrationId: integration.id,
          userId,
          provider: provider as any,
          eventType: 'sync_failed',
          message: `Sync failed for ${provider}`,
          detail: err.message,
        },
      });
    });

  return { jobId: integration.id, status: 'queued' };
}

export async function getIntegrationStatus(
  userId: string,
  provider: 'jira' | 'slack' | 'confluence'
): Promise<{ status: string; lastSyncedAt: Date | null; syncedItemCount: number | null } | null> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!integration) return null;

  return {
    status: integration.syncStatus,
    lastSyncedAt: integration.lastSyncedAt,
    syncedItemCount: integration.syncedItemCount,
  };
}

export async function syncAllIntegrations(): Promise<void> {
  const integrations = await prisma.integration.findMany({
    where: { status: 'connected' },
  });

  for (const integration of integrations) {
    try {
      await syncIntegration(
        integration.userId,
        integration.provider as 'jira' | 'slack' | 'confluence'
      );
    } catch {
    }
  }
}
