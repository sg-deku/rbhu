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

describe('JiraService - URL Generator', () => {
  let jiraService: JiraService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jiraService = new JiraService(userId);
    (global as any).fetch = jest.fn();
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
