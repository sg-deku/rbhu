import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;

export class JiraService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getTokens() {
    const integration = await prisma.jiraIntegration.findUnique({
      where: { userId: this.userId },
    });

    if (!integration) {
      throw new Error('JIRA integration not found for user');
    }

    return integration;
  }

  private async refreshAccessToken(refreshToken: string) {
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error('Failed to refresh JIRA access token');
    }

    await prisma.jiraIntegration.update({
      where: { userId: this.userId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
      },
    });

    return data.access_token;
  }

  async generateIssueUrl(issueKey: string) {
    const { cloudId, accessToken } = await this.getTokens();
    
    const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const resources = await response.json() as any[];
    const resource = resources.find(r => r.id === cloudId);
    
    if (!resource) {
      throw new Error('JIRA resource not found');
    }

    return `${resource.url}/browse/${issueKey}`;
  }
}
