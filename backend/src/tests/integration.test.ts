import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    integration: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

import app from '../server';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function makeToken(userId = 'user-1') {
  return jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Integration Routes', () => {
  describe('GET /api/integrations', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/integrations');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with valid JWT and empty data', async () => {
      const token = makeToken();
      const res = await request(app)
        .get('/api/integrations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Provider validation', () => {
    it('should return 400 for invalid provider', async () => {
      const token = makeToken();
      const res = await request(app)
        .get('/api/integrations/invalid/status')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid provider');
    });

    it('should accept valid providers and return 501 for stub', async () => {
      const token = makeToken();
      const res = await request(app)
        .get('/api/integrations/slack/status')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(501);
    });
  });
});
