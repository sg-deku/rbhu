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

  it('should fetch issues with default pagination', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ issues: [{ key: 'RB-1' }] }),
    });

    const data = await jiraService.getIssues();

    expect(data.issues).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('startAt=0&maxResults=50'),
      expect.any(Object)
    );
  });

  it('should fetch issues for a specific project with custom pagination', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ issues: [] }),
    });

    await jiraService.getIssues('PROJ', 10, 20);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('project%20%3D%20%22PROJ%22'),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('startAt=10&maxResults=20'),
      expect.any(Object)
    );
  });

  it('should fetch comments and sort chronologically when threaded is true', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
    });

    const mockComments = [
      { id: '2', created: '2023-01-02T10:00:00.000Z', body: 'Second' },
      { id: '1', created: '2023-01-01T10:00:00.000Z', body: 'First' },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: mockComments }),
    });

    const data = await jiraService.getComments('RB-1', true);

    expect(data[0].id).toBe('1');
    expect(data[1].id).toBe('2');
  });

  it('should return raw response when threaded is false', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: [] }),
    });

    const data = await jiraService.getComments('RB-1', false);

    expect(data).toHaveProperty('comments');
  });

  it('should generate issue URL successfully', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-123',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'cloud-123', url: 'https://mysite.atlassian.net' }
      ]),
    });

    const url = await jiraService.generateIssueUrl('RB-1');

    expect(url).toBe('https://mysite.atlassian.net/browse/RB-1');
  });

  it('should throw error if cloud resource not found', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
      accessToken: 'token-123',
      cloudId: 'cloud-999',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 'cloud-123' }]),
    });

    await expect(jiraService.generateIssueUrl('RB-1')).rejects.toThrow('JIRA resource not found');
  });
});
