process.env.GOOGLE_CLIENT_ID = 'dummy';
process.env.GOOGLE_CLIENT_SECRET = 'dummy';
process.env.GITHUB_CLIENT_ID = 'dummy';
process.env.GITHUB_CLIENT_SECRET = 'dummy';

import { handleJiraCallback } from '../config/oauth';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mPrisma = {
    jiraIntegration: {
      upsert: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as any;

describe('OAuth Config', () => {
  const userId = 'user-123';
  const code = 'auth-code-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('should handle JIRA callback successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'access-123', refresh_token: 'refresh-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'cloud-123' }]),
      });

    prisma.jiraIntegration.upsert.mockResolvedValue({ userId, cloudId: 'cloud-123' });

    const result = await handleJiraCallback(code, userId);

    expect(result.cloudId).toBe('cloud-123');
    expect(prisma.jiraIntegration.upsert).toHaveBeenCalledWith({
      where: { userId },
      update: {
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        cloudId: 'cloud-123',
      },
      create: {
        userId,
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        cloudId: 'cloud-123',
      },
    });
  });

  it('should throw error if token exchange fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    });

    await expect(handleJiraCallback(code, userId)).rejects.toThrow('Failed to exchange JIRA code');
  });
});
