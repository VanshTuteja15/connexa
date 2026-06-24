import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Billing features will not work.');
}

export const stripe: Stripe | null = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

export interface PlanConfig {
  name: string;
  price: number;
  priceId: string;
}

export const PLANS: Record<'starter' | 'pro', PlanConfig> = {
  starter: {
    name: 'Starter',
    price: 29900,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
  },
  pro: {
    name: 'Pro',
    price: 59900,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
  },
};
