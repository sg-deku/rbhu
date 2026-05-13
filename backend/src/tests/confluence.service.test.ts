import { ConfluenceService } from '../services/confluence.service';
import { PrismaClient } from '@prisma/client';
import { refreshAtlassianToken } from '../config/atlassian.auth';

jest.mock('@prisma/client', () => {
  const mPrisma = {
    atlassianIntegration: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../config/atlassian.auth', () => ({
  refreshAtlassianToken: jest.fn(),
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
    prisma.atlassianIntegration.findFirst.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
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
    prisma.atlassianIntegration.findFirst
      .mockResolvedValueOnce({
        id: 'int-1',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        cloudId: 'cloud-123',
      })
      .mockResolvedValueOnce({
        id: 'int-1',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        cloudId: 'cloud-123',
      })
      .mockResolvedValueOnce({
        id: 'int-1',
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        cloudId: 'cloud-123',
      });

    (refreshAtlassianToken as jest.Mock).mockResolvedValue({
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
    });

    prisma.atlassianIntegration.update.mockResolvedValue({});

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

    expect(prisma.atlassianIntegration.update).toHaveBeenCalledWith({
      where: { id: 'int-1' },
      data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
    });
  });

  it('should retry on 429 rate limit', async () => {
    prisma.atlassianIntegration.findFirst.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
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
    prisma.atlassianIntegration.findFirst.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
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
    prisma.atlassianIntegration.findFirst.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
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
    prisma.atlassianIntegration.findFirst.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
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
});
