import request from 'supertest';
import app from '../server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { exchangeAtlassianCode, getAtlassianSites } from '../config/atlassian.auth';
import { ConfluenceService } from '../services/confluence.service';

jest.mock('@prisma/client', () => {
  const mPrisma = {
    integration: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    integrationActivity: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../config/atlassian.auth', () => ({
  exchangeAtlassianCode: jest.fn(),
  getAtlassianSites: jest.fn(),
}));

jest.mock('../services/confluence.service');

const prisma = new PrismaClient() as any;

describe('Confluence Controller', () => {
  const userId = 'user-123';
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'secret');
  const agent = request.agent(app);

  beforeAll(() => {
    process.env.CONFLUENCE_CLIENT_ID = 'conf-id';
    process.env.CONFLUENCE_CLIENT_SECRET = 'conf-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-123', role: 'USER' });
  });

  describe('GET /api/confluence/auth', () => {
    it('should redirect to Atlassian authorize URL', async () => {
      const res = await agent
        .get('/api/confluence/auth')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('auth.atlassian.com/authorize');
      expect(res.header.location).toContain('scope=read%3Aconfluence-content.all');
      expect(res.header.location).toContain(`state=${userId}`);
    });
  });

  describe('Confluence OAuth Flow', () => {
    const mockTokens = { accessToken: 'access-123', refreshToken: 'refresh-123' };
    const mockSites = [
      { id: 'site-1', name: 'Site 1', url: 'https://site1.atlassian.net' },
      { id: 'site-2', name: 'Site 2', url: 'https://site2.atlassian.net' }
    ];

    it('should handle callback, store in session, and select site', async () => {
      (exchangeAtlassianCode as jest.Mock).mockResolvedValue(mockTokens);
      (getAtlassianSites as jest.Mock).mockResolvedValue(mockSites);

      // 1. Callback
      const callbackRes = await agent
        .get('/api/confluence/callback')
        .query({ code: 'code-123', state: userId });

      expect(callbackRes.status).toBe(302);
      expect(callbackRes.header.location).toContain('/integrations/confluence/select-site');

      // 2. Get Sites (requires auth token)
      const sitesRes = await agent
        .get('/api/confluence/sites')
        .set('Authorization', `Bearer ${token}`);

      expect(sitesRes.status).toBe(200);
      expect(sitesRes.body.success).toBe(true);
      expect(sitesRes.body.data).toEqual(mockSites);

      // 3. Select Site
      prisma.integration.upsert.mockResolvedValue({});

      prisma.integration.findUnique.mockResolvedValue({ id: 'int-123' });

      const selectRes = await agent
        .post('/api/confluence/select-site')
        .set('Authorization', `Bearer ${token}`)
        .send({ cloudId: 'site-1' });

      expect(selectRes.status).toBe(200);
      expect(selectRes.body.success).toBe(true);
      expect(prisma.integration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_provider: { userId, provider: 'confluence' } },
          create: expect.objectContaining({
            accountId: 'site-1',
          }),
        })
      );

      // 4. Session should be cleared
      const secondSitesRes = await agent
        .get('/api/confluence/sites')
        .set('Authorization', `Bearer ${token}`);
      
      expect(secondSitesRes.status).toBe(400);
    });

    it('should return 400 if no session for get-sites', async () => {
      const res = await request(app)
        .get('/api/confluence/sites')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No active Confluence OAuth session');
    });

    it('should return 400 if invalid cloudId for select-site', async () => {
      (exchangeAtlassianCode as jest.Mock).mockResolvedValue(mockTokens);
      (getAtlassianSites as jest.Mock).mockResolvedValue(mockSites);

      const agentWithSession = request.agent(app);
      await agentWithSession
        .get('/api/confluence/callback')
        .query({ code: 'code-123', state: userId });

      const res = await agentWithSession
        .post('/api/confluence/select-site')
        .set('Authorization', `Bearer ${token}`)
        .send({ cloudId: 'wrong-site' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid cloudId');
    });
  });

  describe('Space and Content Fetching', () => {
    beforeEach(() => {
      (ConfluenceService as jest.Mock).mockImplementation(() => ({
        getSpaces: jest.fn().mockResolvedValue([{ id: 'space-1', name: 'Space 1' }]),
        getPageTree: jest.fn().mockResolvedValue([{ id: 'page-1', title: 'Page 1' }]),
        getBlogPosts: jest.fn().mockResolvedValue([{ id: 'blog-1', title: 'Blog 1' }]),
        getPage: jest.fn().mockResolvedValue({ id: 'page-1', title: 'Page 1', markdown: '# Hello' }),
        getBlogPost: jest.fn().mockResolvedValue({ id: 'blog-1', title: 'Blog 1', markdown: '# Blog' }),
      }));
    });

    it('should get spaces', async () => {
      const res = await request(app)
        .get('/api/confluence/spaces')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('space-1');
    });

    it('should get page tree', async () => {
      const res = await request(app)
        .get('/api/confluence/spaces/space-1/pages')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('page-1');
    });

    it('should get blog posts', async () => {
      const res = await request(app)
        .get('/api/confluence/spaces/space-1/blogposts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('blog-1');
    });

    it('should get a page by id', async () => {
      const res = await request(app)
        .get('/api/confluence/pages/page-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('page-1');
      expect(res.body.data.markdown).toBe('# Hello');
    });

    it('should get a blog post by id', async () => {
      const res = await request(app)
        .get('/api/confluence/blogposts/blog-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('blog-1');
      expect(res.body.data.markdown).toBe('# Blog');
    });

    it('should handle service errors', async () => {
      (ConfluenceService as jest.Mock).mockImplementation(() => ({
        getSpaces: jest.fn().mockRejectedValue(new Error('API Failure')),
      }));

      const res = await request(app)
        .get('/api/confluence/spaces')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('API Failure');
    });
  });
});
