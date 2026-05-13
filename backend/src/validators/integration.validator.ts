import { Request, Response, NextFunction } from 'express';

const VALID_PROVIDERS = ['jira', 'slack', 'confluence'];

export const validateProvider = (req: Request, res: Response, next: NextFunction) => {
  const { provider } = req.params;
  if (!VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ success: false, message: 'Invalid provider' });
  }
  next();
};
