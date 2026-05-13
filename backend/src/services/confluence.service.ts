import { PrismaClient } from '@prisma/client';
import { refreshAtlassianToken } from '../config/atlassian.auth';

const prisma = new PrismaClient();

const CONFLUENCE_CLIENT_ID = process.env.CONFLUENCE_CLIENT_ID;
const CONFLUENCE_CLIENT_SECRET = process.env.CONFLUENCE_CLIENT_SECRET;

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  homepageId?: string;
}

export interface PageTreeNode {
  id: string;
  title: string;
  parentId: string | null;
  createdAt: string;
  version: number;
  children: PageTreeNode[];
}

export interface BlogPostSummary {
  id: string;
  title: string;
  createdAt: string;
  version: number;
}

export class ConfluenceService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getIntegration() {
    const integration = await prisma.atlassianIntegration.findFirst({
      where: { userId: this.userId, confluenceEnabled: true },
    });

    if (!integration) {
      throw new Error('Confluence integration not found for user');
    }

    return integration;
  }

  private async refreshAccessToken(refreshToken: string) {
    const tokens = await refreshAtlassianToken(
      refreshToken,
      CONFLUENCE_CLIENT_ID!,
      CONFLUENCE_CLIENT_SECRET!,
    );

    const integration = await prisma.atlassianIntegration.findFirst({
      where: { userId: this.userId, confluenceEnabled: true },
    });

    await prisma.atlassianIntegration.update({
      where: { id: integration!.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });

    return tokens.accessToken;
  }

  private async backoff(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  private async confluenceFetch(endpoint: string, options: any = {}, retryCount: number = 0): Promise<any> {
    let { accessToken, cloudId, refreshToken } = await this.getIntegration();

    const url = `https://api.atlassian.com/ex/confluence/${cloudId}${endpoint}`;
    
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
      return this.confluenceFetch(endpoint, options, retryCount + 1);
    }

    if (response.status === 401 && refreshToken) {
      accessToken = await this.refreshAccessToken(refreshToken);
      return this.confluenceFetch(endpoint, options, retryCount);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Confluence API Error: ${response.statusText} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async getSpaces(): Promise<ConfluenceSpace[]> {
    const data = await this.confluenceFetch('/wiki/api/v2/spaces');
    return data.results.map((space: any) => ({
      id: space.id,
      key: space.key,
      name: space.name,
      type: space.type,
      homepageId: space.homepageId,
    }));
  }

  async getPageTree(spaceId: string): Promise<PageTreeNode[]> {
    let pages: any[] = [];
    let nextUrl = `/wiki/api/v2/spaces/${spaceId}/pages?status=current&limit=250`;

    while (nextUrl) {
      const data = await this.confluenceFetch(nextUrl);
      pages = pages.concat(data.results);
      nextUrl = data._links?.next ? data._links.next : null;
      // The nextUrl from Atlassian API might be a full URL or just the path with query.
      // confluenceFetch expects an endpoint starting with /wiki/...
      if (nextUrl && nextUrl.startsWith('https://')) {
        const url = new URL(nextUrl);
        nextUrl = url.pathname + url.search;
        // Strip the /ex/confluence/{cloudId} prefix if it exists in the pathname
        const prefixMatch = nextUrl.match(/^\/ex\/confluence\/[^\/]+/);
        if (prefixMatch) {
          nextUrl = nextUrl.substring(prefixMatch[0].length);
        }
      }
    }

    const pageMap = new Map<string, PageTreeNode>();
    pages.forEach(page => {
      pageMap.set(page.id, {
        id: page.id,
        title: page.title,
        parentId: page.parentId,
        createdAt: page.createdAt,
        version: page.version?.number || 1,
        children: [],
      });
    });

    const roots: PageTreeNode[] = [];
    pageMap.forEach(node => {
      if (node.parentId && pageMap.has(node.parentId)) {
        pageMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getBlogPosts(spaceId: string): Promise<BlogPostSummary[]> {
    let blogPosts: any[] = [];
    let nextUrl = `/wiki/api/v2/blogposts?spaceId=${spaceId}&status=current&limit=250`;

    while (nextUrl) {
      const data = await this.confluenceFetch(nextUrl);
      blogPosts = blogPosts.concat(data.results);
      nextUrl = data._links?.next ? data._links.next : null;
      
      if (nextUrl && nextUrl.startsWith('https://')) {
        const url = new URL(nextUrl);
        nextUrl = url.pathname + url.search;
        const prefixMatch = nextUrl.match(/^\/ex\/confluence\/[^\/]+/);
        if (prefixMatch) {
          nextUrl = nextUrl.substring(prefixMatch[0].length);
        }
      }
    }

    return blogPosts.map(post => ({
      id: post.id,
      title: post.title,
      createdAt: post.createdAt,
      version: post.version?.number || 1,
    }));
  }
}
