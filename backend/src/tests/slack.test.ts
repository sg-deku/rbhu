import { SlackService } from '../services/slack.service';
import { PrismaClient } from '@prisma/client';
import { WebClient } from '@slack/web-api';

const mockList = jest.fn();
const mockHistory = jest.fn();
const mockReplies = jest.fn();

jest.mock('@prisma/client', () => {
  const mPrisma = {
    slackIntegration: {
      findUnique: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('@slack/web-api', () => {
  return {
    WebClient: jest.fn().mockImplementation(() => ({
      conversations: {
        list: mockList,
        history: mockHistory,
        replies: mockReplies,
      },
    })),
  };
});

const prisma = new PrismaClient() as any;

describe('SlackService', () => {
  let slackService: SlackService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    slackService = new SlackService(userId);
  });

  it('should get channels successfully', async () => {
    prisma.slackIntegration.findUnique.mockResolvedValue({
      accessToken: 'slack-token-123',
    });

    mockList.mockResolvedValue({
      ok: true,
      channels: [{ id: 'C123', name: 'general' }],
    });

    const channels = await slackService.getChannels();

    expect(channels).toHaveLength(1);
    expect(channels[0].name).toBe('general');
    expect(WebClient).toHaveBeenCalledWith('slack-token-123');
  });

  it('should get messages successfully', async () => {
    prisma.slackIntegration.findUnique.mockResolvedValue({
      accessToken: 'slack-token-123',
    });

    mockHistory.mockResolvedValue({
      ok: true,
      messages: [{ ts: '123.456', text: 'hello' }],
    });

    const messages = await slackService.getMessages('C123');

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe('hello');
  });

  it('should get thread messages successfully', async () => {
    prisma.slackIntegration.findUnique.mockResolvedValue({
      accessToken: 'slack-token-123',
    });

    mockReplies.mockResolvedValue({
      ok: true,
      messages: [{ ts: '123.456', text: 'hello' }, { ts: '123.457', text: 'reply' }],
    });

    const messages = await slackService.getThreadMessages('C123', '123.456');

    expect(messages).toHaveLength(2);
    expect(messages[1].text).toBe('reply');
  });

  it('should throw error if integration not found', async () => {
    prisma.slackIntegration.findUnique.mockResolvedValue(null);

    await expect(slackService.getChannels()).rejects.toThrow('Slack integration not found for user');
  });
});
