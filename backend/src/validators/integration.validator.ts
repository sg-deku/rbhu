import { Request, Response, NextFunction } from 'express';

const VALID_PROVIDERS = ['jira', 'slack', 'confluence'];

export const validateProvider = (req: Request, res: Response, next: NextFunction) => {
  const { provider } = req.params;
  if (!VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ success: false, message: 'Invalid provider' });
  }
  next();
};

export const validateConfigBody = (req: Request, res: Response, next: NextFunction) => {
  const { selectedResourceIds } = req.body;
  if (!Array.isArray(selectedResourceIds)) {
    return res.status(400).json({ success: false, message: 'selectedResourceIds must be an array' });
  }
  next();
};
