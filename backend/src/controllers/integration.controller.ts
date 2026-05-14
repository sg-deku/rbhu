import { Request, Response } from 'express';
import { getIntegrations, initiateOAuth, handleOAuthCallback } from '../services/integration.service';
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
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const getStatus = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const deleteIntegration = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const getResources = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const getConfig = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const updateConfig = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const listActivity = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};
