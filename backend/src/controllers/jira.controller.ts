import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { JiraService } from '../services/jira.service';
import { exchangeAtlassianCode, getAtlassianSites } from '../config/atlassian.auth';

const prisma = new PrismaClient();

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const JIRA_REDIRECT_URI = process.env.JIRA_REDIRECT_URI || 'http://localhost:5000/api/jira/callback';

export const initiateJiraAuth = (req: any, res: Response) => {
  const scope = 'read:jira-work read:jira-user offline_access';
  const state = req.userId;
  
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${JIRA_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(JIRA_REDIRECT_URI)}&state=${state}&response_type=code&prompt=consent`;
  
  res.redirect(authUrl);
};

export const jiraCallback = async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).json({ success: false, message: 'Missing code or state' });
  }

  try {
    const tokens = await exchangeAtlassianCode(
      code as string,
      JIRA_CLIENT_ID!,
      JIRA_CLIENT_SECRET!,
      JIRA_REDIRECT_URI,
    );

    const sites = await getAtlassianSites(tokens.accessToken);

    if (sites.length === 0) {
      return res.status(400).json({ success: false, message: 'No accessible Atlassian sites found' });
    }

    const site = sites[0];

    await prisma.atlassianIntegration.upsert({
      where: { userId_cloudId: { userId: userId as string, cloudId: site.id } },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        siteUrl: site.url,
        jiraEnabled: true,
      },
      create: {
        userId: userId as string,
        cloudId: site.id,
        siteUrl: site.url,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        jiraEnabled: true,
        confluenceEnabled: false,
      },
    });

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/integrations?status=success`);
  } catch (error) {
    console.error('JIRA OAuth Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProjects = async (req: any, res: Response) => {
  try {
    const jiraService = new JiraService(req.userId);
    const projects = await jiraService.getProjects();
    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getIssues = async (req: any, res: Response) => {
  try {
    const { projectKey } = req.query;
    const jiraService = new JiraService(req.userId);
    const issues = await jiraService.getIssues(projectKey as string);
    res.json({ success: true, data: issues });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getComments = async (req: any, res: Response) => {
  try {
    const { issueIdOrKey } = req.params;
    const jiraService = new JiraService(req.userId);
    const comments = await jiraService.getComments(issueIdOrKey);
    res.json({ success: true, data: comments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
