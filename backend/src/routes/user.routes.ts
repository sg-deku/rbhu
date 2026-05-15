import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser, createUser } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: GET /
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), getAllUsers);
/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: POST /
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), createUser);
/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: GET /:id
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/:id', authMiddleware, getUserById);
/**
 * @swagger
 * /api/user/{id}:
 *   put:
 *     summary: PUT /:id
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.put('/:id', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), updateUser);
/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: DELETE /:id
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.delete('/:id', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), deleteUser);

export default router;
