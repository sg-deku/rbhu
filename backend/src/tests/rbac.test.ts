import request from 'supertest';
import app from '../server';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
  connectDB: jest.fn(),
}));

const mockPrisma = prisma as any;

describe('RBAC Management API', () => {
  const adminToken = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, process.env.JWT_SECRET || 'secret');
  const userToken = jwt.sign({ userId: 'user-1', role: 'USER' }, process.env.JWT_SECRET || 'secret');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should allow ADMIN to get all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', name: 'User 1', email: 'u1@test.com', role: 'USER' },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should deny non-ADMIN users', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should allow role updates', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        role: 'MODERATOR'
      });

      const res = await request(app)
        .put('/api/users/user-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MODERATOR' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('MODERATOR');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should allow ADMIN to delete a user', async () => {
      mockPrisma.user.delete.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/users/user-2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } });
    });

    it('should deny non-ADMIN to delete a user', async () => {
      await request(app)
        .delete('/api/users/user-2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
