import { Router } from 'express';
import express from 'express';
import * as billingController from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  billingController.webhook
);

router.use(authenticate);

router.post('/checkout', billingController.createCheckoutSession);
router.get('/subscription', billingController.getSubscription);

export default router;
