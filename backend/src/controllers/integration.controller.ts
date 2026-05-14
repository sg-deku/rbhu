import { Request, Response } from 'express';
import {
  getIntegrations,
  initiateOAuth,
  handleOAuthCallback,
  syncIntegration,
  getIntegrationStatus,
  disconnectIntegration,
  getResources as getResourcesService,
  getConfig as getConfigService,
  updateConfig as updateConfigService,
  getActivity as getActivityService,
} from '../services/integration.service';
import { verifyOAuthState } from '../utils/oauth-state';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

export const listIntegrations = async (req: any, res: Response) => {
  try {
    const data = await getIntegrations(req.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const initiateConnect = async (req: any, res: Response) => {
  try {
    const provider = req.params.provider as 'jira' | 'slack' | 'confluence';
    const result = await initiateOAuth(req.userId, provider);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleCallback = async (req: any, res: Response) => {
  const { code, state, error, error_description } = req.query as Record<string, string>;
  const provider = req.params.provider as string;

  if (error) {
    let resolvedProvider = provider;
    if (state) {
      try {
        const decoded = verifyOAuthState(state);
        resolvedProvider = decoded.provider;
      } catch {
        resolvedProvider = provider;
      }
    }
    const reason = encodeURIComponent(error_description || error || 'access_denied');
    return res.redirect(`${CLIENT_URL}/settings/integrations?error=${resolvedProvider}&reason=${reason}`);
  }

  try {
    const { provider: resolvedProvider } = await handleOAuthCallback(code, state);
    return res.redirect(`${CLIENT_URL}/settings/integrations?connected=${resolvedProvider}`);
  } catch {
    return res.redirect(`${CLIENT_URL}/settings/integrations?error=unknown&reason=callback_failed`);
  }
};

export const syncNow = async (req: any, res: Response) => {
  try {
    const provider = req.params.provider as 'jira' | 'slack' | 'confluence';
    const result = await syncIntegration(req.userId, provider);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStatus = async (req: any, res: Response) => {
  try {
    const provider = req.params.provider as 'jira' | 'slack' | 'confluence';
    const result = await getIntegrationStatus(req.userId, provider);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteIntegration = async (req: any, res: Response) => {
  try {
    const provider = req.params.provider as 'jira' | 'slack' | 'confluence';
    await disconnectIntegration(req.userId, provider);
    res.json({ success: true, message: 'Integration disconnected' });
  } catch (error: any) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getResources = async (req: any, res: Response) => {
  try {
    const provider = req.params.provider as 'jira' | 'slack' | 'confluence';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await getResourcesService(req.userId, provider, page, limit);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error: any) {
    if (error.code === 'REAUTH_REQUIRED') {
      return res.status(401).json({ success: false, code: 'REAUTH_REQUIRED', message: 'Reauthorization required' });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConfig = async (req: any, res: Response) => {
  try {
    const provider = req.params.provider as 'jira' | 'slack' | 'confluence';
    const result = await getConfigService(req.userId, provider);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateConfig = async (req: any, res: Response) => {
  try {
    const provider = req.params.provider as 'jira' | 'slack' | 'confluence';
    const { selectedResourceIds } = req.body;
    const result = await updateConfigService(req.userId, provider, selectedResourceIds);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listActivity = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getActivityService(req.userId, page, limit);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
