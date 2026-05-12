import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { JiraService } from '../services/jira.service';

const prisma = new PrismaClient();

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const JIRA_REDIRECT_URI = process.env.JIRA_REDIRECT_URI || 'http://localhost:5000/api/jira/callback';

export const initiateJiraAuth = (req: any, res: Response) => {
  const scope = 'read:jira-work read:jira-user offline_access';
  const state = req.userId; // Use userId as state to verify on callback
  
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${JIRA_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(JIRA_REDIRECT_URI)}&state=${state}&response_type=code&prompt=consent`;
  
  res.redirect(authUrl);
};

export const jiraCallback = async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).json({ success: false, message: 'Missing code or state' });
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        code,
        redirect_uri: JIRA_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenResponse.ok) {
      return res.status(tokenResponse.status).json({ success: false, message: 'Failed to exchange code', error: tokenData });
    }

    // Get Cloud ID
    const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const resources = await resourcesResponse.json() as any[];
    
    if (!resourcesResponse.ok || resources.length === 0) {
      return res.status(resourcesResponse.status).json({ success: false, message: 'Failed to get accessible resources' });
    }

    const cloudId = resources[0].id; // Assuming the first resource for simplicity

    // Save to database
    await prisma.jiraIntegration.upsert({
      where: { userId: userId as string },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        cloudId,
      },
      create: {
        userId: userId as string,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        cloudId,
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
