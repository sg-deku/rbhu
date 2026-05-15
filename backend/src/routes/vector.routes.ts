import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as vectorController from '../controllers/vector.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Strict rate limiting for index management operations.
 * RB-36: Set up basic security and rate limiting for the ES endpoint.
 */
const managementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: 'Too many management requests, please try again later.'
});

// All vector management routes require authentication and admin role
/**
 * @swagger
 * /api/vector/setup:
 *   post:
 *     summary: POST /setup
 *     tags: [Vector]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/setup', authMiddleware, adminMiddleware, managementLimiter, vectorController.setupIndex);
/**
 * @swagger
 * /api/vector/delete:
 *   delete:
 *     summary: DELETE /delete
 *     tags: [Vector]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.delete('/delete', authMiddleware, adminMiddleware, managementLimiter, vectorController.removeIndex);
/**
 * @swagger
 * /api/vector/reindex:
 *   post:
 *     summary: POST /reindex
 *     tags: [Vector]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/reindex', authMiddleware, adminMiddleware, managementLimiter, vectorController.rebuildIndex);

export default router;
