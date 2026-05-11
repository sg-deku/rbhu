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

describe('JiraService - Comment Threading', () => {
  let jiraService: JiraService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jiraService = new JiraService(userId);
    (global as any).fetch = jest.fn();
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
});
