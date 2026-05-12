import request from 'supertest';
import app from '../server';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
  },
  connectDB: jest.fn(),
}));

describe('Auth Routes', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Test1234!'
  };

  let authToken: string;

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...testUser
      });

      const res = await request(app).post('/api/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(testUser.password, 12);
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...testUser,
        password: hashedPassword
      });

      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    it('should fail with wrong password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...testUser,
        password: 'wrong-hashed-password'
      });

      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'wrongpassword'
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return profile with valid token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...testUser
      });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });
  });
});
