import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export function generateOAuthState(userId: string, provider: string): string {
  const nonce = randomBytes(16).toString('hex');
  return jwt.sign({ userId, provider, nonce }, process.env.JWT_SECRET || 'secret', { expiresIn: '10m' });
}

export function verifyOAuthState(state: string): { userId: string; provider: string } {
  const decoded = jwt.verify(state, process.env.JWT_SECRET || 'secret') as any;
  return { userId: decoded.userId, provider: decoded.provider };
}
