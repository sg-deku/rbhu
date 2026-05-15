import { Router } from 'express';
import { createPaymentIntent, stripeWebhook } from '../controllers/payment.controller';

const router = Router();
/**
 * @swagger
 * /api/payment/create-intent:
 *   post:
 *     summary: POST /create-intent
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/create-intent', createPaymentIntent);
/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: POST /webhook
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/webhook', stripeWebhook);

export default router;
