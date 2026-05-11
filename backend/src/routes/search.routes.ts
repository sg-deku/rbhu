import { Router } from 'express';
import { getSuggestions } from '../controllers/search.controller';

const router = Router();

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: List of suggestions
 */
router.get('/suggestions', getSuggestions);

export default router;
