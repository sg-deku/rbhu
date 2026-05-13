import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { exchangeAtlassianCode, getAtlassianSites } from '../config/atlassian.auth';

const prisma = new PrismaClient();

const CONFLUENCE_CLIENT_ID = process.env.CONFLUENCE_CLIENT_ID;
const CONFLUENCE_CLIENT_SECRET = process.env.CONFLUENCE_CLIENT_SECRET;
const CONFLUENCE_REDIRECT_URI = process.env.CONFLUENCE_REDIRECT_URI || 'http://localhost:5000/api/confluence/callback';

export const initiateConfluenceAuth = (req: any, res: Response) => {
  const scope = 'read:confluence-content.all offline_access';
  const state = req.userId;
  
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${CONFLUENCE_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(CONFLUENCE_REDIRECT_URI)}&state=${state}&response_type=code&prompt=consent`;
  
  res.redirect(authUrl);
};

export const confluenceCallback = async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).json({ success: false, message: 'Missing code or state' });
  }

  try {
    const tokens = await exchangeAtlassianCode(
      code as string,
      CONFLUENCE_CLIENT_ID!,
      CONFLUENCE_CLIENT_SECRET!,
      CONFLUENCE_REDIRECT_URI,
    );

    const sites = await getAtlassianSites(tokens.accessToken);

    if (sites.length === 0) {
      return res.status(400).json({ success: false, message: 'No accessible Atlassian sites found' });
    }

    // Store in session for transient state
    (req.session as any).confluenceOAuth = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sites,
    };

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/integrations/confluence/select-site`);
  } catch (error) {
    console.error('Confluence OAuth Callback Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getConfluenceSites = async (req: Request, res: Response) => {
  const session = (req.session as any).confluenceOAuth;

  if (!session || !session.sites) {
    return res.status(400).json({ success: false, message: 'No active Confluence OAuth session found' });
  }

  res.json({ success: true, data: session.sites });
};

export const selectConfluenceSite = async (req: any, res: Response) => {
  const { cloudId } = req.body;
  const session = (req.session as any).confluenceOAuth;

  if (!cloudId) {
    return res.status(400).json({ success: false, message: 'Missing cloudId' });
  }

  if (!session) {
    return res.status(400).json({ success: false, message: 'No active Confluence OAuth session found' });
  }

  const site = session.sites.find((s: any) => s.id === cloudId);
  if (!site) {
    return res.status(400).json({ success: false, message: 'Invalid cloudId' });
  }

  try {
    await prisma.atlassianIntegration.upsert({
      where: { userId_cloudId: { userId: req.userId, cloudId } },
      update: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        siteUrl: site.url,
        confluenceEnabled: true,
      },
      create: {
        userId: req.userId,
        cloudId,
        siteUrl: site.url,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        confluenceEnabled: true,
        jiraEnabled: false,
      },
    });

    // Clear session
    delete (req.session as any).confluenceOAuth;

    res.json({ success: true });
  } catch (error) {
    console.error('Select Confluence Site Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
