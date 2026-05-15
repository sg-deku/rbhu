import prisma from '../config/database';
import { decrypt, encrypt } from '../utils/encryption';
import { refreshAtlassianToken } from '../config/atlassian.auth';

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;

export class JiraService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getTokens() {
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: this.userId, provider: 'jira' } },
    });

    if (!integration || !integration.accessToken) {
      throw new Error('JIRA integration not found for user');
    }

    return {
      id: integration.id,
      accessToken: decrypt(integration.accessToken),
      refreshToken: integration.refreshToken ? decrypt(integration.refreshToken) : null,
      accountId: integration.accountId
    };
  }

  private async refreshAccessToken(refreshToken: string) {
    const tokens = await refreshAtlassianToken(
      refreshToken,
      JIRA_CLIENT_ID!,
      JIRA_CLIENT_SECRET!,
    );

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: this.userId, provider: 'jira' } },
    });

    if (!integration) throw new Error('Integration not found');

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
      },
    });

    return tokens.accessToken;
  }

  private async backoff(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  private async jiraFetch(endpoint: string, options: any = {}, retryCount: number = 0): Promise<any> {
    let { accessToken, accountId: cloudId, refreshToken } = await this.getTokens();

    if (!cloudId) throw new Error('JIRA cloudId not found');

    const url = `https://api.atlassian.com/ex/jira/${cloudId}${endpoint}`;
    
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 429 && retryCount < 3) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) : Math.pow(2, retryCount);
      await this.backoff(waitTime);
      return this.jiraFetch(endpoint, options, retryCount + 1);
    }

    if (response.status === 401 && refreshToken) {
      accessToken = await this.refreshAccessToken(refreshToken);
      return this.jiraFetch(endpoint, options, retryCount);
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

  async getComments(issueIdOrKey: string, threaded: boolean = false) {
    const data = await this.jiraFetch(`/rest/api/3/issue/${issueIdOrKey}/comment`);
    
    if (threaded && data.comments) {
      return data.comments.sort((a: any, b: any) => 
        new Date(a.created).getTime() - new Date(b.created).getTime()
      );
    }

    return data;
  }

  async generateIssueUrl(issueKey: string) {
    let { accountId: cloudId, accessToken, refreshToken } = await this.getTokens();
    
    const fetchResources = async (token: string) => {
      const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      return response;
    };

    let response = await fetchResources(accessToken);

    if (response.status === 401 && refreshToken) {
      accessToken = await this.refreshAccessToken(refreshToken);
      response = await fetchResources(accessToken);
    }

    if (!response.ok) {
      throw new Error('Failed to fetch JIRA accessible resources');
    }

    const resources = await response.json() as any[];
    const resource = resources.find(r => r.id === cloudId);
    
    if (!resource) {
      throw new Error('JIRA resource not found');
    }

    return `${resource.url}/browse/${issueKey}`;
  }
}
