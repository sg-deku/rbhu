import prisma from '../config/database';
import { decrypt, encrypt } from '../utils/encryption';
import { refreshAtlassianToken } from '../config/atlassian.auth';
import { transformToMarkdown } from '../utils/confluence.transformer';
import { indexDocument, createIndex } from './search.service';

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

export interface ConfluenceComment {
  id: string;
  type: 'inline' | 'footer';
  body: string;
  author: string;
  createdAt: string;
}

export interface ConfluencePageContent {
  id: string;
  title: string;
  type: 'page' | 'blogpost';
  spaceId: string;
  parentId: string | null;
  version: number;
  rawBody: string;
  markdown: string;
  labels: string[];
  comments: ConfluenceComment[];
  fetchedAt: string;
}

export class ConfluenceService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getIntegration() {
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: this.userId, provider: 'confluence' } },
    });

    if (!integration || !integration.accessToken) {
      throw new Error('Confluence integration not found for user');
    }

    return {
      id: integration.id,
      accessToken: decrypt(integration.accessToken),
      refreshToken: integration.refreshToken ? decrypt(integration.refreshToken) : null,
      accountId: integration.accountId,
      siteUrl: integration.accountName // Assuming siteUrl was stored in accountName during migration or fix it if needed
    };
  }

  private async refreshAccessToken(refreshToken: string) {
    const tokens = await refreshAtlassianToken(
      refreshToken,
      CONFLUENCE_CLIENT_ID!,
      CONFLUENCE_CLIENT_SECRET!,
    );

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: this.userId, provider: 'confluence' } },
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

  private async confluenceFetch(endpoint: string, options: any = {}, retryCount: number = 0): Promise<any> {
    let { accessToken, accountId: cloudId, refreshToken } = await this.getIntegration();

    if (!cloudId) throw new Error('Confluence cloudId not found');

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

  private async getLabels(type: 'pages' | 'blogposts', id: string): Promise<string[]> {
    const data = await this.confluenceFetch(`/wiki/api/v2/${type}/${id}/labels`);
    return data.results.map((label: any) => label.name);
  }

  private async getComments(type: 'pages' | 'blogposts', id: string): Promise<ConfluenceComment[]> {
    const comments: ConfluenceComment[] = [];

    // Footer comments for both pages and blog posts
    const footerData = await this.confluenceFetch(`/wiki/api/v2/${type}/${id}/footer-comments?body-format=storage`);
    footerData.results.forEach((comment: any) => {
      comments.push({
        id: comment.id,
        type: 'footer',
        body: transformToMarkdown(comment.body?.storage?.value || ''),
        author: comment.authorId, // Simplified for now, could fetch full user info
        createdAt: comment.createdAt,
      });
    });

    // Inline comments only for pages
    if (type === 'pages') {
      const inlineData = await this.confluenceFetch(`/wiki/api/v2/pages/${id}/inline-comments?body-format=storage`);
      inlineData.results.forEach((comment: any) => {
        comments.push({
          id: comment.id,
          type: 'inline',
          body: transformToMarkdown(comment.body?.storage?.value || ''),
          author: comment.authorId,
          createdAt: comment.createdAt,
        });
      });
    }

    return comments;
  }

  private async resolvePageLinks(markdown: string): Promise<string> {
    const integration = await this.getIntegration();
    const siteUrl = integration.siteUrl;
    
    // Replace relative links like [title](/wiki/spaces/KEY/pages/123) with absolute siteUrl
    return markdown.replace(/\[([^\]]+)\]\((\/wiki\/[^)]+)\)/g, `[$1](${siteUrl}$2)`);
  }

  private async resolveConfluencePagePlaceholders(markdown: string, spaceId: string): Promise<string> {
    const integration = await this.getIntegration();
    const siteUrl = integration.siteUrl;

    const placeholders = markdown.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (!placeholders) return markdown;

    let resolvedMarkdown = markdown;

    for (const placeholder of placeholders) {
      const match = placeholder.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match && match[1] === match[2]) {
        const title = match[1];
        try {
          // Search for the page by title in the same space
          const data = await this.confluenceFetch(`/wiki/api/v2/pages?title=${encodeURIComponent(title)}&spaceId=${spaceId}&limit=1`);
          if (data.results && data.results.length > 0) {
            const pageId = data.results[0].id;
            const spaceKey = data.results[0].spaceId; // Actually the API returns spaceId as ID, but for URLs we might need key if it's available. 
            // V2 API returns spaceId. Let's stick to siteUrl/wiki/spaces/ID/pages/ID or siteUrl/wiki/pages/ID
            resolvedMarkdown = resolvedMarkdown.replace(placeholder, `[${title}](${siteUrl}/wiki/pages/${pageId})`);
          } else {
            // Degrade to plain text if not found
            resolvedMarkdown = resolvedMarkdown.replace(placeholder, title);
          }
        } catch (error) {
          resolvedMarkdown = resolvedMarkdown.replace(placeholder, title);
        }
      }
    }

    return resolvedMarkdown;
  }

  private async ensureIndexCreated() {
    await createIndex('confluence-content', {
      properties: {
        title: { type: 'text' },
        type: { type: 'keyword' },
        spaceId: { type: 'keyword' },
        markdown: { type: 'text' },
        labels: { type: 'keyword' },
        userId: { type: 'keyword' },
        fetchedAt: { type: 'date' },
      },
    });
  }

  async getPage(pageId: string): Promise<ConfluencePageContent> {
    const data = await this.confluenceFetch(`/wiki/api/v2/pages/${pageId}?body-format=storage`);
    const labels = await this.getLabels('pages', pageId);
    const comments = await this.getComments('pages', pageId);
    
    let markdown = transformToMarkdown(data.body.storage.value);
    
    // Append comments section
    if (comments.length > 0) {
      markdown += '\n\n## Comments\n';
      comments.forEach(comment => {
        markdown += `\n### Comment by ${comment.author} (${comment.type})\n${comment.body}\n`;
      });
    }

    markdown = await this.resolvePageLinks(markdown);
    markdown = await this.resolveConfluencePagePlaceholders(markdown, data.spaceId);

    const content: ConfluencePageContent = {
      id: data.id,
      title: data.title,
      type: 'page',
      spaceId: data.spaceId,
      parentId: data.parentId,
      version: data.version?.number || 1,
      rawBody: data.body.storage.value,
      markdown,
      labels,
      comments,
      fetchedAt: new Date().toISOString(),
    };

    await this.ensureIndexCreated();
    await indexDocument('confluence-content', content.id, {
      ...content,
      userId: this.userId,
    });

    return content;
  }

  async getBlogPost(blogpostId: string): Promise<ConfluencePageContent> {
    const data = await this.confluenceFetch(`/wiki/api/v2/blogposts/${blogpostId}?body-format=storage`);
    const labels = await this.getLabels('blogposts', blogpostId);
    const comments = await this.getComments('blogposts', blogpostId);

    let markdown = transformToMarkdown(data.body.storage.value);

    if (comments.length > 0) {
      markdown += '\n\n## Comments\n';
      comments.forEach(comment => {
        markdown += `\n### Comment by ${comment.author} (${comment.type})\n${comment.body}\n`;
      });
    }

    markdown = await this.resolvePageLinks(markdown);
    // Blog posts might not have same hierarchy placeholders but we can still resolve them if they exist
    markdown = await this.resolveConfluencePagePlaceholders(markdown, data.spaceId);

    const content: ConfluencePageContent = {
      id: data.id,
      title: data.title,
      type: 'blogpost',
      spaceId: data.spaceId,
      parentId: null,
      version: data.version?.number || 1,
      rawBody: data.body.storage.value,
      markdown,
      labels,
      comments,
      fetchedAt: new Date().toISOString(),
    };

    await this.ensureIndexCreated();
    await indexDocument('confluence-content', content.id, {
      ...content,
      userId: this.userId,
    });

    return content;
  }
}
