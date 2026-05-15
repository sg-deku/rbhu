import { Router } from 'express';
import { 
  initiateConfluenceAuth, 
  confluenceCallback, 
  getConfluenceSites, 
  selectConfluenceSite,
  getSpaces,
  getPageTree,
  getBlogPosts,
  getPage,
  getBlogPost
} from '../controllers/confluence.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/confluence/auth:
 *   get:
 *     summary: GET /auth
 *     tags: [Confluence]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/auth', authMiddleware, initiateConfluenceAuth);
/**
 * @swagger
 * /api/confluence/callback:
 *   get:
 *     summary: GET /callback
 *     tags: [Confluence]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/callback', confluenceCallback);
/**
 * @swagger
 * /api/confluence/sites:
 *   get:
 *     summary: GET /sites
 *     tags: [Confluence]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/sites', authMiddleware, getConfluenceSites);
/**
 * @swagger
 * /api/confluence/select-site:
 *   post:
 *     summary: POST /select-site
 *     tags: [Confluence]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/select-site', authMiddleware, selectConfluenceSite);
/**
 * @swagger
 * /api/confluence/spaces:
 *   get:
 *     summary: GET /spaces
 *     tags: [Confluence]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/spaces', authMiddleware, getSpaces);
/**
 * @swagger
 * /api/confluence/spaces/{spaceId}/pages:
 *   get:
 *     summary: GET /spaces/:spaceId/pages
 *     tags: [Confluence]
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/spaces/:spaceId/pages', authMiddleware, getPageTree);
/**
 * @swagger
 * /api/confluence/spaces/{spaceId}/blogposts:
 *   get:
 *     summary: GET /spaces/:spaceId/blogposts
 *     tags: [Confluence]
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/spaces/:spaceId/blogposts', authMiddleware, getBlogPosts);
/**
 * @swagger
 * /api/confluence/pages/{pageId}:
 *   get:
 *     summary: GET /pages/:pageId
 *     tags: [Confluence]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/pages/:pageId', authMiddleware, getPage);
/**
 * @swagger
 * /api/confluence/blogposts/{blogpostId}:
 *   get:
 *     summary: GET /blogposts/:blogpostId
 *     tags: [Confluence]
 *     parameters:
 *       - in: path
 *         name: blogpostId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/blogposts/:blogpostId', authMiddleware, getBlogPost);

export default router;
