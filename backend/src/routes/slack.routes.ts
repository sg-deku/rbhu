import { Router } from 'express';
import * as slackController from '../controllers/slack.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth', authMiddleware, slackController.initiateSlackAuth);
router.get('/callback', slackController.slackCallback);
router.get('/channels', authMiddleware, slackController.getChannels);
router.get('/channels/:channelId/messages', authMiddleware, slackController.getMessages);
router.get('/channels/:channelId/threads/:threadTs', authMiddleware, slackController.getThreadMessages);

export default router;
