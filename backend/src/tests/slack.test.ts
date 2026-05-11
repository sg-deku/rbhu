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

  it('should sync channel history with pagination', async () => {
    prisma.slackIntegration.findUnique.mockResolvedValue({
      accessToken: 'slack-token-123',
    });

    mockHistory
      .mockResolvedValueOnce({
        ok: true,
        messages: [{ ts: '1', text: 'm1' }],
        response_metadata: { next_cursor: 'c1' },
      })
      .mockResolvedValueOnce({
        ok: true,
        messages: [{ ts: '2', text: 'm2' }],
      });

    const messages = await slackService.syncChannelHistory('C123');

    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe('m1');
    expect(messages[1].text).toBe('m2');
    expect(mockHistory).toHaveBeenCalledTimes(2);
  });

  it('should resolve threads for messages with replies', async () => {
    prisma.slackIntegration.findUnique.mockResolvedValue({
      accessToken: 'slack-token-123',
    });

    const messages = [
      { ts: '1', text: 'parent', thread_ts: '1', reply_count: 1 },
      { ts: '2', text: 'no thread' },
    ];

    mockReplies.mockResolvedValue({
      ok: true,
      messages: [{ ts: '1', text: 'parent' }, { ts: '1.1', text: 'reply' }],
    });

    const result = await slackService.resolveThreads('C123', messages);

    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].text).toBe('reply');
    expect(result[1].replies).toBeUndefined();
    expect(mockReplies).toHaveBeenCalledWith(expect.objectContaining({ ts: '1' }));
  });

  it('should sanitize slack messages correctly', () => {
    const text = 'Hello <@U123>! Check <#C123|general> and <!here>.';
    const sanitized = slackService.sanitizeMessage(text);

    expect(sanitized).toBe('Hello @U123! Check #general and @here.');
  });

  it('should throw error if integration not found', async () => {
    prisma.slackIntegration.findUnique.mockResolvedValue(null);

    await expect(slackService.getChannels()).rejects.toThrow('Slack integration not found for user');
  });
});
