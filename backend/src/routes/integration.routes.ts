import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateProvider, validateConfigBody } from '../validators/integration.validator';
import {
  listIntegrations,
  initiateConnect,
  handleCallback,
  syncNow,
  getStatus,
  deleteIntegration,
  getResources,
  getConfig,
  updateConfig,
  listActivity,
  listSyncLogs,
} from '../controllers/integration.controller';

const router = Router();

/**
 * @swagger
 * /api/integration:
 *   get:
 *     summary: GET /
 *     tags: [Integration]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/', authMiddleware, listIntegrations);
/**
 * @swagger
 * /api/integration/activity:
 *   get:
 *     summary: GET /activity
 *     tags: [Integration]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/activity', authMiddleware, listActivity);
/**
 * @swagger
 * /api/integration/{provider}/connect:
 *   post:
 *     summary: POST /:provider/connect
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/:provider/connect', authMiddleware, validateProvider, initiateConnect);
/**
 * @swagger
 * /api/integration/{provider}/callback:
 *   get:
 *     summary: GET /:provider/callback
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/:provider/callback', validateProvider, handleCallback);
/**
 * @swagger
 * /api/integration/{provider}/status:
 *   get:
 *     summary: GET /:provider/status
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/:provider/status', authMiddleware, validateProvider, getStatus);
/**
 * @swagger
 * /api/integration/{provider}/sync:
 *   post:
 *     summary: POST /:provider/sync
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/:provider/sync', authMiddleware, validateProvider, syncNow);
/**
 * @swagger
 * /api/integration/{provider}:
 *   delete:
 *     summary: DELETE /:provider
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.delete('/:provider', authMiddleware, validateProvider, deleteIntegration);
/**
 * @swagger
 * /api/integration/{provider}/resources:
 *   get:
 *     summary: GET /:provider/resources
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/:provider/resources', authMiddleware, validateProvider, getResources);
/**
 * @swagger
 * /api/integration/{provider}/config:
 *   get:
 *     summary: GET /:provider/config
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/:provider/config', authMiddleware, validateProvider, getConfig);
/**
 * @swagger
 * /api/integration/{provider}/config:
 *   put:
 *     summary: PUT /:provider/config
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.put('/:provider/config', authMiddleware, validateProvider, validateConfigBody, updateConfig);
/**
 * @swagger
 * /api/integration/{provider}/logs:
 *   get:
 *     summary: GET /:provider/logs
 *     tags: [Integration]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/:provider/logs', authMiddleware, validateProvider, listSyncLogs);

export default router;
