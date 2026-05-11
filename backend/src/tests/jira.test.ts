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

describe('JiraService - Project Discovery', () => {
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

    const projects = await jiraService.getProjects();

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

  it('should throw error if integration not found', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue(null);

    await expect(jiraService.getProjects()).rejects.toThrow('JIRA integration not found');
  });
});
