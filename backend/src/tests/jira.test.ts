import { JiraService } from '../services/jira.service';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mPrisma = {
    jiraIntegration: {
      findUnique: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as any;

describe('JiraService - Rate Limiting', () => {
  let jiraService: JiraService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jiraService = new JiraService(userId);
    (global as any).fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should retry on 429 rate limit', async () => {
    prisma.jiraIntegration.findUnique.mockResolvedValue({
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
        json: () => Promise.resolve([{ id: 'proj-1' }]),
      });

    const promise = jiraService.getProjects();
    
    // Fast-forward time for backoff
    await jest.advanceTimersByTimeAsync(1000);

    const projects = await promise;

    expect(projects).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
