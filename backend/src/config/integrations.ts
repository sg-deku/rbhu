interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  revokeUrl?: string;
}

export function getProviderConfig(provider: 'jira' | 'slack' | 'confluence'): ProviderConfig {
  switch (provider) {
    case 'slack':
      return {
        clientId: process.env.SLACK_CLIENT_ID!,
        clientSecret: process.env.SLACK_CLIENT_SECRET!,
        redirectUri: process.env.SLACK_REDIRECT_URI!,
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: ['channels:read', 'groups:read', 'users:read'],
        revokeUrl: 'https://slack.com/api/auth.revoke',
      };
    case 'jira':
      return {
        clientId: process.env.JIRA_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID!,
        clientSecret: process.env.JIRA_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET!,
        redirectUri: process.env.JIRA_REDIRECT_URI || process.env.ATLASSIAN_REDIRECT_URI!,
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        scopes: ['read:jira-work', 'read:jira-user', 'offline_access'],
        revokeUrl: 'https://auth.atlassian.com/oauth/token/revoke',
      };
    case 'confluence':
      return {
        clientId: process.env.CONFLUENCE_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID!,
        clientSecret: process.env.CONFLUENCE_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET!,
        redirectUri: process.env.CONFLUENCE_REDIRECT_URI || process.env.ATLASSIAN_REDIRECT_URI!,
        authorizationUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        scopes: ['read:confluence-space.summary', 'read:confluence-content.all', 'offline_access'],
        revokeUrl: 'https://auth.atlassian.com/oauth/token/revoke',
      };
  }
}
