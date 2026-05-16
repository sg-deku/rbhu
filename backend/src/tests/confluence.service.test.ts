import { ConfluenceService } from '../services/confluence.service';
import { PrismaClient } from '@prisma/client';
import { refreshAtlassianToken } from '../config/atlassian.auth';
import { indexDocument, createIndex } from '../services/search.service';

jest.mock('../utils/encryption', () => ({
  encrypt: jest.fn((text) => text),
  decrypt: jest.fn((text) => text),
}));

jest.mock('@prisma/client', () => {
  const mPrisma = {
    integration: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../config/atlassian.auth', () => ({
  refreshAtlassianToken: jest.fn(),
}));

jest.mock('../services/search.service', () => ({
  indexDocument: jest.fn(),
  createIndex: jest.fn(),
}));

const prisma = new PrismaClient() as any;

describe('ConfluenceService', () => {
  let confluenceService: ConfluenceService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    confluenceService = new ConfluenceService(userId);
    (global as any).fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch spaces successfully', async () => {
    prisma.integration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      accountId: 'cloud-123',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [{ id: 'space-1', key: 'SPACE', name: 'Space 1', type: 'global', homepageId: 'home-1' }]
      }),
    });

    const spaces = await confluenceService.getSpaces();

    expect(spaces).toHaveLength(1);
    expect(spaces[0].key).toBe('SPACE');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.atlassian.com/ex/confluence/cloud-123/wiki/api/v2/spaces',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      })
    );
  });

  it('should handle token refresh on 401', async () => {
    prisma.integration.findUnique
      .mockResolvedValueOnce({
        id: 'int-1',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        accountId: 'cloud-123',
      })
      .mockResolvedValueOnce({
        id: 'int-1',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        accountId: 'cloud-123',
      })
      .mockResolvedValueOnce({
        id: 'int-1',
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        accountId: 'cloud-123',
      });

    (refreshAtlassianToken as jest.Mock).mockResolvedValue({
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
    });

    prisma.integration.update.mockResolvedValue({});

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

    await confluenceService.getSpaces();

    expect(prisma.integration.update).toHaveBeenCalledWith({
      where: { id: 'int-1' },
      data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
    });
  });

  it('should retry on 429 rate limit', async () => {
    prisma.integration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      accountId: 'cloud-123',
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 429,
        ok: false,
        headers: { get: () => '1' },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

    const promise = confluenceService.getSpaces();
    
    await jest.advanceTimersByTimeAsync(1000);

    await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should build a nested page tree', async () => {
    prisma.integration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      accountId: 'cloud-123',
    });

    const mockPages = [
      { id: '1', title: 'Home', parentId: null, createdAt: '2023-01-01', version: { number: 1 } },
      { id: '2', title: 'Child 1', parentId: '1', createdAt: '2023-01-02', version: { number: 1 } },
      { id: '3', title: 'Child 2', parentId: '1', createdAt: '2023-01-03', version: { number: 1 } },
      { id: '4', title: 'Grandchild', parentId: '2', createdAt: '2023-01-04', version: { number: 1 } },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: mockPages,
        _links: {}
      }),
    });

    const tree = await confluenceService.getPageTree('space-1');

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('1');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].id).toBe('2');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe('4');
  });

  it('should follow pagination in getPageTree', async () => {
    prisma.integration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      accountId: 'cloud-123',
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [{ id: '1', title: 'Page 1', parentId: null }],
          _links: { next: '/wiki/api/v2/spaces/space-1/pages?cursor=abc' }
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [{ id: '2', title: 'Page 2', parentId: null }],
          _links: {}
        }),
      });

    const tree = await confluenceService.getPageTree('space-1');

    expect(tree).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('cursor=abc'),
      expect.any(Object)
    );
  });

  it('should fetch blog posts successfully', async () => {
    prisma.integration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      accountId: 'cloud-123',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [{ id: 'blog-1', title: 'Blog 1', createdAt: '2023-01-01', version: { number: 1 } }]
      }),
    });

    const blogPosts = await confluenceService.getBlogPosts('space-1');

    expect(blogPosts).toHaveLength(1);
    expect(blogPosts[0].title).toBe('Blog 1');
  });

  describe('getPage and getBlogPost', () => {
    beforeEach(() => {
      prisma.integration.findUnique.mockResolvedValue({
        accessToken: 'token-123',
        accountId: 'cloud-123',
        accountName: 'https://site.atlassian.net'
      });
    });

    it('should fetch a page with labels and comments and index it', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ // getPage body
          ok: true,
          json: () => Promise.resolve({
            id: 'page-1',
            title: 'Page 1',
            spaceId: 'space-1',
            parentId: 'parent-1',
            version: { number: 1 },
            body: { storage: { value: '<p>Hello World</p>' } }
          }),
        })
        .mockResolvedValueOnce({ // getLabels
          ok: true,
          json: () => Promise.resolve({ results: [{ name: 'label-1' }] }),
        })
        .mockResolvedValueOnce({ // getComments (footer)
          ok: true,
          json: () => Promise.resolve({
            results: [{
              id: 'comment-1',
              authorId: 'user-1',
              createdAt: '2023-01-01',
              body: { storage: { value: '<p>Great page!</p>' } }
            }]
          }),
        })
        .mockResolvedValueOnce({ // getComments (inline)
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      const page = await confluenceService.getPage('page-1');

      expect(page.id).toBe('page-1');
      expect(page.labels).toContain('label-1');
      expect(page.comments).toHaveLength(1);
      expect(page.markdown).toContain('Hello World');
      expect(page.markdown).toContain('## Comments');
      expect(createIndex).toHaveBeenCalled();
      expect(indexDocument).toHaveBeenCalledWith('confluence-content', 'page-1', expect.objectContaining({
        title: 'Page 1',
        userId: 'user-123'
      }));
    });

    it('should fetch a blog post and index it', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ // getBlogPost body
          ok: true,
          json: () => Promise.resolve({
            id: 'blog-1',
            title: 'Blog 1',
            spaceId: 'space-1',
            version: { number: 1 },
            body: { storage: { value: '<p>Blog Post Content</p>' } }
          }),
        })
        .mockResolvedValueOnce({ // getLabels
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
        .mockResolvedValueOnce({ // getComments (footer)
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      const blogPost = await confluenceService.getBlogPost('blog-1');

      expect(blogPost.id).toBe('blog-1');
      expect(blogPost.type).toBe('blogpost');
      expect(blogPost.markdown).toContain('Blog Post Content');
      expect(indexDocument).toHaveBeenCalledWith('confluence-content', 'blog-1', expect.any(Object));
    });

    it('should resolve relative links', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ // getPage body
          ok: true,
          json: () => Promise.resolve({
            id: 'page-1',
            title: 'Page 1',
            spaceId: 'space-1',
            body: { storage: { value: '<p><a href="/wiki/spaces/SPACE/pages/123">Link</a></p>' } }
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) }) // labels
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) }) // footer
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) }); // inline

      const page = await confluenceService.getPage('page-1');

      expect(page.markdown).toContain('https://site.atlassian.net/wiki/spaces/SPACE/pages/123');
    });
  });
});
