import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = Router();

// Google OAuth
/**
 * @swagger
 * /api/oauth/google:
 *   get:
 *     summary: GET /google
 *     tags: [Oauth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
/**
 * @swagger
 * /api/oauth/google/callback:
 *   get:
 *     summary: GET /google/callback
 *     tags: [Oauth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req: any, res) => {
    const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

// GitHub OAuth
/**
 * @swagger
 * /api/oauth/github:
 *   get:
 *     summary: GET /github
 *     tags: [Oauth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
/**
 * @swagger
 * /api/oauth/github/callback:
 *   get:
 *     summary: GET /github/callback
 *     tags: [Oauth]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get('/github/callback',
  passport.authenticate('github', { session: false }),
  (req: any, res) => {
    const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

export default router;
