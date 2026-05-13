import { Request, Response } from 'express';
import { getIntegrations } from '../services/integration.service';

export const listIntegrations = async (req: any, res: Response) => {
  try {
    const data = await getIntegrations(req.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const initiateConnect = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

export const handleCallback = async (req: any, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
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
