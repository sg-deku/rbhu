import { JiraService } from '../services/jira.service';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mPrisma = {
    jiraIntegration: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as any;

describe('JiraService', () => {
  let jiraService: JiraService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jiraService = new JiraService(userId);
    (global as any).fetch = jest.fn();
  });

  it('should fetch projects successfully', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 'proj-1', key: 'PROJ', name: 'Project 1' }]),
    });

    const projects = await jiraService.getProjects() as any[];

    expect(projects).toHaveLength(1);
    expect(projects[0].key).toBe('PROJ');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.atlassian.com/ex/jira/cloud-123/rest/api/3/project',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      })
    );
  });

  it('should handle token refresh on 401', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      cloudId: 'cloud-123',
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-token', refresh_token: 'new-refresh' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'proj-1' }]),
      });

    const projects = await jiraService.getProjects() as any[];

    expect(projects).toHaveLength(1);
    expect(prisma.jiraIntegration.update).toHaveBeenCalledWith({
      where: { userId },
      data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
    });
  });

  it('should throw error if integration not found', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue(null);

    await expect(jiraService.getProjects()).rejects.toThrow('JIRA integration not found');
  });
});
