import { Router } from 'express';
import * as slackController from '../controllers/slack.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/slack/auth:
 *   get:
 *     summary: GET /auth
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/auth', authMiddleware, slackController.initiateSlackAuth);
/**
 * @swagger
 * /api/slack/callback:
 *   get:
 *     summary: GET /callback
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/callback', slackController.slackCallback);
/**
 * @swagger
 * /api/slack/channels:
 *   get:
 *     summary: GET /channels
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/channels', authMiddleware, slackController.getChannels);
/**
 * @swagger
 * /api/slack/channels/{channelId}/messages:
 *   get:
 *     summary: GET /channels/:channelId/messages
 *     tags: [Slack]
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/channels/:channelId/messages', authMiddleware, slackController.getMessages);
/**
 * @swagger
 * /api/slack/channels/{channelId}/threads/{threadTs}:
 *   get:
 *     summary: GET /channels/:channelId/threads/:threadTs
 *     tags: [Slack]
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: threadTs
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/channels/:channelId/threads/:threadTs', authMiddleware, slackController.getThreadMessages);

export default router;
