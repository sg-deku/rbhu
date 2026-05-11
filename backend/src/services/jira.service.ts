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

  private async jiraFetch(endpoint: string, options: any = {}): Promise<any> {
    let { accessToken, cloudId, refreshToken } = await this.getTokens();

    const url = `https://api.atlassian.com/ex/jira/${cloudId}${endpoint}`;
    
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401 && refreshToken) {
      accessToken = await this.refreshAccessToken(refreshToken);
      return this.jiraFetch(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`JIRA API Error: ${response.statusText} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async getProjects() {
    return this.jiraFetch('/rest/api/3/project');
  }

  async getIssues(projectKey?: string, startAt: number = 0, maxResults: number = 50) {
    const jql = projectKey ? `project = "${projectKey}"` : '';
    let query = `?startAt=${startAt}&maxResults=${maxResults}`;
    if (jql) {
      query += `&jql=${encodeURIComponent(jql)}`;
    }
    return this.jiraFetch(`/rest/api/3/search${query}`);
  }

  async getComments(issueIdOrKey: string) {
    return this.jiraFetch(`/rest/api/3/issue/${issueIdOrKey}/comment`);
  }
}
