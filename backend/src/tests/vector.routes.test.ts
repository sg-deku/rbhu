import request from 'supertest';
import app from '../server';
import * as vectorStoreService from '../services/vector-store.service';
import jwt from 'jsonwebtoken';

jest.mock('../services/vector-store.service');

describe('Vector Store API', () => {
  const adminToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, process.env.JWT_SECRET || 'secret');
  const userToken = jwt.sign({ userId: 'user-1', role: 'user' }, process.env.JWT_SECRET || 'secret');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/vector/setup', () => {
    it('should allow admin to setup index', async () => {
      (vectorStoreService.ensureIndexExists as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/vector/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(vectorStoreService.ensureIndexExists).toHaveBeenCalled();
    });

    it('should deny access to non-admin user', async () => {
      const res = await request(app)
        .post('/api/vector/setup')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should deny access without token', async () => {
      await request(app)
        .post('/api/vector/setup')
        .expect(401);
    });
  });

  describe('DELETE /api/vector/delete', () => {
    it('should allow admin to delete index', async () => {
      (vectorStoreService.deleteIndex as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/vector/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(vectorStoreService.deleteIndex).toHaveBeenCalled();
    });
  });

  describe('POST /api/vector/reindex', () => {
    it('should allow admin to reindex', async () => {
      (vectorStoreService.reindex as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/vector/reindex')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(vectorStoreService.reindex).toHaveBeenCalled();
    });
  });
});
