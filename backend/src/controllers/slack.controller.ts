import { Request, Response } from 'express';
import prisma from '../config/database';
import { WebClient } from '@slack/web-api';
import { SlackService } from '../services/slack.service';
import { encrypt } from '../utils/encryption';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

export const initiateSlackAuth = (req: any, res: Response) => {
  const scopes = 'channels:read,groups:read,channels:history,groups:history';
  const state = req.userId;
  
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}&state=${state}`;
  
  res.redirect(authUrl);
};

export const slackCallback = async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).json({ success: false, message: 'Missing code or state' });
  }

  try {
    const client = new WebClient();
    const result = await client.oauth.v2.access({
      client_id: SLACK_CLIENT_ID!,
      client_secret: SLACK_CLIENT_SECRET!,
      code: code as string,
      redirect_uri: SLACK_REDIRECT_URI,
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, message: 'Failed to exchange code', error: result.error });
    }

    await prisma.integration.upsert({
      where: { userId_provider: { userId: userId as string, provider: 'slack' } },
      update: {
        accessToken: encrypt(result.access_token!),
        accountId: result.team?.id,
        accountName: result.team?.name,
        status: 'connected',
      },
      create: {
        userId: userId as string,
        provider: 'slack',
        accessToken: encrypt(result.access_token!),
        accountId: result.team?.id,
        accountName: result.team?.name,
        status: 'connected',
      },
    });

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: userId as string, provider: 'slack' } }
    });

    await prisma.integrationActivity.create({
      data: {
        integrationId: integration!.id,
        userId: userId as string,
        provider: 'slack',
        eventType: 'connected',
        message: 'Connected to Slack',
      },
    });

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/integrations?status=success`);
  } catch (error) {
    console.error('Slack OAuth Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getChannels = async (req: any, res: Response) => {
  try {
    const slackService = new SlackService(req.userId);
    const channels = await slackService.getChannels();
    res.json({ success: true, data: channels });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessages = async (req: any, res: Response) => {
  try {
    const { channelId } = req.params;
    const { limit } = req.query;
    const slackService = new SlackService(req.userId);
    const messages = await slackService.getMessages(channelId, limit ? parseInt(limit as string) : undefined);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getThreadMessages = async (req: any, res: Response) => {
  try {
    const { channelId, threadTs } = req.params;
    const slackService = new SlackService(req.userId);
    const messages = await slackService.getThreadMessages(channelId, threadTs);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
