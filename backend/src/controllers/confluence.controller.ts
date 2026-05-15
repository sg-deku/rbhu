import { Request, Response } from 'express';
import prisma from '../config/database';
import { exchangeAtlassianCode, getAtlassianSites } from '../config/atlassian.auth';
import { ConfluenceService } from '../services/confluence.service';
import { encrypt } from '../utils/encryption';

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
    await prisma.integration.upsert({
      where: { userId_provider: { userId: req.userId, provider: 'confluence' } },
      update: {
        accessToken: encrypt(session.accessToken),
        refreshToken: session.refreshToken ? encrypt(session.refreshToken) : undefined,
        accountId: cloudId,
        accountName: site.url, // siteUrl
        status: 'connected',
      },
      create: {
        userId: req.userId,
        provider: 'confluence',
        accessToken: encrypt(session.accessToken),
        refreshToken: session.refreshToken ? encrypt(session.refreshToken) : undefined,
        accountId: cloudId,
        accountName: site.url, // siteUrl
        status: 'connected',
      },
    });

    await prisma.integrationActivity.create({
      data: {
        integrationId: (await prisma.integration.findUnique({
          where: { userId_provider: { userId: req.userId, provider: 'confluence' } }
        }))!.id,
        userId: req.userId,
        provider: 'confluence',
        eventType: 'connected',
        message: 'Connected to Confluence',
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

export const getSpaces = async (req: any, res: Response) => {
  try {
    const confluenceService = new ConfluenceService(req.userId);
    const spaces = await confluenceService.getSpaces();
    res.json({ success: true, data: spaces });
  } catch (error: any) {
    console.error('Get Spaces Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPageTree = async (req: any, res: Response) => {
  const { spaceId } = req.params;
  try {
    const confluenceService = new ConfluenceService(req.userId);
    const tree = await confluenceService.getPageTree(spaceId);
    res.json({ success: true, data: tree });
  } catch (error: any) {
    console.error('Get Page Tree Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBlogPosts = async (req: any, res: Response) => {
  const { spaceId } = req.params;
  try {
    const confluenceService = new ConfluenceService(req.userId);
    const blogPosts = await confluenceService.getBlogPosts(spaceId);
    res.json({ success: true, data: blogPosts });
  } catch (error: any) {
    console.error('Get Blog Posts Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPage = async (req: any, res: Response) => {
  const { pageId } = req.params;
  try {
    const confluenceService = new ConfluenceService(req.userId);
    const content = await confluenceService.getPage(pageId);
    res.json({ success: true, data: content });
  } catch (error: any) {
    console.error('Get Page Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBlogPost = async (req: any, res: Response) => {
  const { blogpostId } = req.params;
  try {
    const confluenceService = new ConfluenceService(req.userId);
    const content = await confluenceService.getBlogPost(blogpostId);
    res.json({ success: true, data: content });
  } catch (error: any) {
    console.error('Get Blog Post Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
