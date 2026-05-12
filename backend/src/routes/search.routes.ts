import { Router } from 'express';
import { getSuggestions, searchQuery, searchStream } from '../controllers/search.controller';

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

/**
 * @swagger
 * /api/search/query:
 *   post:
 *     summary: Submit a search query
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: Search results and answer
 */
router.post('/query', searchQuery);

/**
 * @swagger
 * /api/search/stream:
 *   get:
 *     summary: Stream search results using SSE
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: SSE stream
 */
router.get('/stream', searchStream);

export default router;
