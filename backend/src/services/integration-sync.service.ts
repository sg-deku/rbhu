import axios from 'axios';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { getProviderConfig } from '../config/integrations';

type Integration = {
  id: string;
  userId: string;
  provider: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  syncStatus: string;
  lastSyncedAt: Date | null;
  syncedItemCount: number | null;
  [key: string]: any;
};

export async function refreshTokenIfNeeded(integration: Integration): Promise<Integration> {
  if (!integration.refreshToken) return integration;
  if (!integration.tokenExpiresAt) return integration;

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (integration.tokenExpiresAt > fiveMinutesFromNow) return integration;

  const config = getProviderConfig(integration.provider as 'jira' | 'slack' | 'confluence');
  const clientId = integration.clientId || config.clientId;
  const clientSecret = integration.clientSecret ? decrypt(integration.clientSecret) : config.clientSecret;

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: decrypt(integration.refreshToken),
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await axios.post(config.tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const tokenData = tokenRes.data;
  const rawAccessToken: string = tokenData.access_token;
  const rawRefreshToken: string | undefined = tokenData.refresh_token;
  const expiresIn: number | undefined = tokenData.expires_in;

  const encryptedAccessToken = encrypt(rawAccessToken);
  const encryptedRefreshToken = rawRefreshToken ? encrypt(rawRefreshToken) : integration.refreshToken;
  const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  const updated = await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
      tokenUpdatedAt: new Date(),
    },
  });

  return updated as Integration;
}

export async function syncSlack(integration: Integration): Promise<{ syncedItemCount: number }> {
  const fresh = await refreshTokenIfNeeded(integration);
  if (!fresh.accessToken) throw new Error('No access token available for sync');
  const accessToken = decrypt(fresh.accessToken);

  const response = await axios.get('https://slack.com/api/conversations.list', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const channels: any[] = response.data.channels ?? [];
  const now = new Date();

  await Promise.all(
    channels.map((ch) =>
      prisma.documentMetadata.upsert({
        where: { integrationId_externalId: { integrationId: integration.id, externalId: ch.id } },
        create: {
          integrationId: integration.id,
          userId: integration.userId,
          organizationId: integration.organizationId ?? null,
          provider: 'slack',
          externalId: ch.id,
          contentType: 'channel',
          title: ch.name ?? null,
          sourceUrl: null,
          metadata: { is_private: ch.is_private ?? false, num_members: ch.num_members ?? null },
          lastSyncedAt: now,
        },
        update: {
          title: ch.name ?? null,
          metadata: { is_private: ch.is_private ?? false, num_members: ch.num_members ?? null },
          lastSyncedAt: now,
        },
      })
    )
  );

  return { syncedItemCount: channels.length };
}

export async function syncJira(integration: Integration): Promise<{ syncedItemCount: number }> {
  const fresh = await refreshTokenIfNeeded(integration);
  if (!fresh.accessToken) throw new Error('No access token available for sync');
  const accessToken = decrypt(fresh.accessToken);

  const resourcesRes = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const cloudId = resourcesRes.data[0]?.id;
  const cloudUrl = resourcesRes.data[0]?.url ?? null;
  if (!cloudId) return { syncedItemCount: 0 };

  const projectsRes = await axios.get(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const projects: any[] = projectsRes.data ?? [];
  const now = new Date();

  await Promise.all(
    projects.map((p) =>
      prisma.documentMetadata.upsert({
        where: { integrationId_externalId: { integrationId: integration.id, externalId: p.id } },
        create: {
          integrationId: integration.id,
          userId: integration.userId,
          organizationId: integration.organizationId ?? null,
          provider: 'jira',
          externalId: p.id,
          contentType: 'project',
          title: p.name ?? null,
          sourceUrl: cloudUrl ? `${cloudUrl}/browse/${p.key}` : null,
          metadata: { key: p.key, projectTypeKey: p.projectTypeKey ?? null, cloudId },
          lastSyncedAt: now,
        },
        update: {
          title: p.name ?? null,
          sourceUrl: cloudUrl ? `${cloudUrl}/browse/${p.key}` : null,
          metadata: { key: p.key, projectTypeKey: p.projectTypeKey ?? null, cloudId },
          lastSyncedAt: now,
        },
      })
    )
  );

  return { syncedItemCount: projects.length };
}

export async function syncConfluence(integration: Integration): Promise<{ syncedItemCount: number }> {
  const fresh = await refreshTokenIfNeeded(integration);
  if (!fresh.accessToken) throw new Error('No access token available for sync');
  const accessToken = decrypt(fresh.accessToken);

  const resourcesRes = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const cloudId = resourcesRes.data[0]?.id;
  const cloudUrl = resourcesRes.data[0]?.url ?? null;
  if (!cloudId) return { syncedItemCount: 0 };

  const spacesRes = await axios.get(
    `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api/space`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const spaces: any[] = spacesRes.data?.results ?? spacesRes.data ?? [];
  const now = new Date();

  await Promise.all(
    spaces.map((s) =>
      prisma.documentMetadata.upsert({
        where: { integrationId_externalId: { integrationId: integration.id, externalId: s.key } },
        create: {
          integrationId: integration.id,
          userId: integration.userId,
          organizationId: integration.organizationId ?? null,
          provider: 'confluence',
          externalId: s.key,
          contentType: 'space',
          title: s.name ?? null,
          sourceUrl: cloudUrl ? `${cloudUrl}/wiki/spaces/${s.key}` : null,
          metadata: { type: s.type ?? null, cloudId },
          lastSyncedAt: now,
        },
        update: {
          title: s.name ?? null,
          sourceUrl: cloudUrl ? `${cloudUrl}/wiki/spaces/${s.key}` : null,
          metadata: { type: s.type ?? null, cloudId },
          lastSyncedAt: now,
        },
      })
    )
  );

  return { syncedItemCount: spaces.length };
}

export async function runSync(integration: Integration): Promise<{ syncedItemCount: number }> {
  switch (integration.provider) {
    case 'slack':
      return syncSlack(integration);
    case 'jira':
      return syncJira(integration);
    case 'confluence':
      return syncConfluence(integration);
    default:
      throw new Error(`Unknown provider: ${integration.provider}`);
  }
}
