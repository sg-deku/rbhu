import { Router } from 'express';
import { register, login, logout, getProfile, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRegister, validateLogin } from '../validators/auth.validator';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 */
router.post('/register', validateRegister, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 */
router.post('/login', validateLogin, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: POST /logout
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/logout', authMiddleware, logout);
/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: GET /profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/profile', authMiddleware, getProfile);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: POST /forgot-password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: POST /reset-password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/reset-password', resetPassword);

export default router;
