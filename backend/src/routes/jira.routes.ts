import { Router } from 'express';
import { 
  initiateJiraAuth, 
  jiraCallback, 
  getProjects, 
  getIssues, 
  getComments 
} from '../controllers/jira.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/jira/auth:
 *   get:
 *     summary: GET /auth
 *     tags: [Jira]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/auth', authMiddleware, initiateJiraAuth);
/**
 * @swagger
 * /api/jira/callback:
 *   get:
 *     summary: GET /callback
 *     tags: [Jira]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/callback', jiraCallback);

/**
 * @swagger
 * /api/jira/projects:
 *   get:
 *     summary: GET /projects
 *     tags: [Jira]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/projects', authMiddleware, getProjects);
/**
 * @swagger
 * /api/jira/issues:
 *   get:
 *     summary: GET /issues
 *     tags: [Jira]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/issues', authMiddleware, getIssues);
/**
 * @swagger
 * /api/jira/issues/{issueIdOrKey}/comments:
 *   get:
 *     summary: GET /issues/:issueIdOrKey/comments
 *     tags: [Jira]
 *     parameters:
 *       - in: path
 *         name: issueIdOrKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/issues/:issueIdOrKey/comments', authMiddleware, getComments);

export default router;
