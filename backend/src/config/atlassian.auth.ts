export interface AtlassianTokenSet {
  accessToken: string;
  refreshToken: string;
}

export interface AtlassianSite {
  id: string;
  name: string;
  url: string;
  scopes: string[];
}

export async function exchangeAtlassianCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<AtlassianTokenSet> {
  const response = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(`Failed to exchange Atlassian code: ${JSON.stringify(data)}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export async function getAtlassianSites(accessToken: string): Promise<AtlassianSite[]> {
  const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const data = await response.json() as any[];

  if (!response.ok) {
    throw new Error(`Failed to fetch Atlassian accessible resources: ${JSON.stringify(data)}`);
  }

  return data.map((resource: any) => ({
    id: resource.id,
    name: resource.name,
    url: resource.url,
    scopes: resource.scopes ?? [],
  }));
}

export async function refreshAtlassianToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<AtlassianTokenSet> {
  const response = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(`Failed to refresh Atlassian token: ${JSON.stringify(data)}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
  };
}
