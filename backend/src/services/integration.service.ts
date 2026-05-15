import axios from 'axios';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { generateOAuthState, verifyOAuthState } from '../utils/oauth-state';
import { getProviderConfig } from '../config/integrations';
import { runSync, refreshTokenIfNeeded } from './integration-sync.service';

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
  provider: 'jira' | 'slack' | 'confluence',
  customConfig?: { clientId: string; clientSecret: string }
): Promise<{ authorizationUrl: string }> {
  const state = generateOAuthState(userId, provider, customConfig);
  const config = getProviderConfig(provider);
  const clientId = customConfig?.clientId || config.clientId;
  const scopeStr = config.scopes.join('%20');

  let url =
    `${config.authorizationUrl}` +
    `?client_id=${clientId}` +
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
  const { userId, provider, customConfig } = verifyOAuthState(state);
  const config = getProviderConfig(provider as 'jira' | 'slack' | 'confluence');

  const clientId = customConfig?.clientId || config.clientId;
  const clientSecret = customConfig?.clientSecret || config.clientSecret;

  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
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
  const encryptedClientId = customConfig?.clientId || null;
  const encryptedClientSecret = customConfig?.clientSecret ? encrypt(customConfig.clientSecret) : null;
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
      clientId: encryptedClientId,
      clientSecret: encryptedClientSecret,
      tokenExpiresAt,
      accountName,
      accountEmail,
      syncStatus: 'idle',
    },
    update: {
      status: 'connected',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      clientId: encryptedClientId,
      clientSecret: encryptedClientSecret,
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

export async function disconnectIntegration(
  userId: string,
  provider: 'jira' | 'slack' | 'confluence'
): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!integration) {
    const err = new Error('Integration not found') as any;
    err.statusCode = 404;
    throw err;
  }

  const config = getProviderConfig(provider);
  if (config.revokeUrl) {
    try {
      const rawToken = decrypt(integration.accessToken);
      await axios.post(config.revokeUrl, { token: rawToken });
    } catch (revokeErr) {
      console.error(`Failed to revoke token for ${provider}:`, revokeErr);
    }
  }

  await prisma.integration.delete({ where: { id: integration.id } });
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

export interface ResourceDTO {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityDTO {
  id: string;
  provider: string;
  eventType: string;
  message: string;
  detail: string | null;
  syncedItemCount: number | null;
  createdAt: Date;
}

export async function getResources(
  userId: string,
  provider: 'jira' | 'slack' | 'confluence',
  page: number,
  limit: number
): Promise<{ data: ResourceDTO[]; pagination: { page: number; limit: number; total: number } }> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!integration) {
    const err = new Error('Integration not found') as any;
    err.statusCode = 404;
    throw err;
  }

  const fresh = await refreshTokenIfNeeded(integration as any);
  const rawToken = decrypt(fresh.accessToken);

  let resources: ResourceDTO[] = [];

  try {
    if (provider === 'slack') {
      const res = await axios.get(
        `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=${limit}`,
        { headers: { Authorization: `Bearer ${rawToken}` } }
      );
      if (res.data.error === 'invalid_auth' || res.data.error === 'token_revoked') {
        const err = new Error('Reauth required') as any;
        err.code = 'REAUTH_REQUIRED';
        throw err;
      }
      resources = (res.data.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        type: 'channel',
      }));
    } else if (provider === 'jira') {
      const resourcesRes = await axios.get(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        { headers: { Authorization: `Bearer ${rawToken}` } }
      );
      const cloudId = resourcesRes.data[0]?.id;
      if (!cloudId) return { data: [], pagination: { page, limit, total: 0 } };
      const projectsRes = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`,
        { headers: { Authorization: `Bearer ${rawToken}` } }
      );
      resources = (projectsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        type: 'project',
      }));
    } else if (provider === 'confluence') {
      const resourcesRes = await axios.get(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        { headers: { Authorization: `Bearer ${rawToken}` } }
      );
      const cloudId = resourcesRes.data[0]?.id;
      if (!cloudId) return { data: [], pagination: { page, limit, total: 0 } };
      const spacesRes = await axios.get(
        `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/space`,
        { headers: { Authorization: `Bearer ${rawToken}` } }
      );
      resources = (spacesRes.data?.results || spacesRes.data || []).map((s: any) => ({
        id: s.key,
        name: s.name,
        type: 'space',
      }));
    }
  } catch (err: any) {
    if (err.code === 'REAUTH_REQUIRED') throw err;
    if (err.response?.status === 401) {
      const authErr = new Error('Reauth required') as any;
      authErr.code = 'REAUTH_REQUIRED';
      throw authErr;
    }
    throw err;
  }

  const total = resources.length;
  const start = (page - 1) * limit;
  const paginated = resources.slice(start, start + limit);

  return { data: paginated, pagination: { page, limit, total } };
}

export async function getConfig(
  userId: string,
  provider: 'jira' | 'slack' | 'confluence'
): Promise<{ selectedResourceIds: string[] }> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!integration) {
    const err = new Error('Integration not found') as any;
    err.statusCode = 404;
    throw err;
  }

  const config = await prisma.integrationConfig.findUnique({
    where: { integrationId: integration.id },
  });

  return { selectedResourceIds: config?.selectedResourceIds ?? [] };
}

export async function updateConfig(
  userId: string,
  provider: 'jira' | 'slack' | 'confluence',
  selectedResourceIds: string[]
): Promise<{ selectedResourceIds: string[] }> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!integration) {
    const err = new Error('Integration not found') as any;
    err.statusCode = 404;
    throw err;
  }

  await prisma.integrationConfig.upsert({
    where: { integrationId: integration.id },
    create: { integrationId: integration.id, selectedResourceIds },
    update: { selectedResourceIds },
  });

  await prisma.integrationActivity.create({
    data: {
      integrationId: integration.id,
      userId,
      provider: provider as any,
      eventType: 'config_updated',
      message: `Configuration updated for ${provider}`,
    },
  });

  return { selectedResourceIds };
}

export async function getActivity(
  userId: string,
  page: number,
  limit: number
): Promise<{ data: ActivityDTO[]; pagination: { page: number; limit: number; total: number } }> {
  const [activities, total] = await Promise.all([
    prisma.integrationActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.integrationActivity.count({ where: { userId } }),
  ]);

  return {
    data: activities.map((a: any) => ({
      id: a.id,
      provider: a.provider,
      eventType: a.eventType,
      message: a.message,
      detail: a.detail,
      syncedItemCount: a.syncedItemCount,
      createdAt: a.createdAt,
    })),
    pagination: { page, limit, total },
  };
}
