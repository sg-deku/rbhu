import Stripe from 'stripe';
import { Request, Response } from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }
  switch (event.type) {
    case 'payment_intent.succeeded': console.log('Payment succeeded:', event.data.object); break;
    case 'payment_intent.payment_failed': console.log('Payment failed:', event.data.object); break;
  }
  res.json({ received: true });
};
