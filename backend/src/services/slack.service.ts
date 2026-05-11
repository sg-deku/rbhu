import { WebClient } from '@slack/web-api';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SlackService {
  private userId: string;
  private client: WebClient | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getClient() {
    if (this.client) return this.client;

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: this.userId },
    });

    if (!integration) {
      throw new Error('Slack integration not found for user');
    }

    this.client = new WebClient(integration.accessToken);
    return this.client;
  }

  async getChannels() {
    const client = await this.getClient();
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
    });
    return result.channels || [];
  }

  async getMessages(channelId: string, limit = 100) {
    const client = await this.getClient();
    const result = await client.conversations.history({
      channel: channelId,
      limit,
    });
    return result.messages || [];
  }

  async getThreadMessages(channelId: string, threadTs: string) {
    const client = await this.getClient();
    const result = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
    });
    return result.messages || [];
  }
}
