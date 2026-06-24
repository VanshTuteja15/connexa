import { Response, Request } from 'express';
import Stripe from 'stripe';
import { query } from '../config/db';
import { withOrg } from '../middleware/tenantIsolation';
import { stripe, PLANS } from '../config/stripe';
import { AuthRequest } from '../types';

interface CheckoutBody {
  plan: 'starter' | 'pro';
}

export async function createCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured' });
      return;
    }

    const { organization_id } = withOrg(req);
    const { plan } = req.body as CheckoutBody;

    if (!plan || !PLANS[plan]) {
      res.status(400).json({ error: 'Invalid plan. Choose starter or pro.' });
      return;
    }

    const orgRows = await query<{
      id: string;
      name: string;
      stripe_customer_id: string | null;
      plan: string;
    }>('SELECT id, name, stripe_customer_id, plan FROM organizations WHERE id = $1', [
      organization_id,
    ]);

    if (orgRows.length === 0) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const org = orgRows[0];
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      const userRows = await query<{ email: string }>(
        'SELECT email FROM users WHERE organization_id = $1 AND role = $2 LIMIT 1',
        [organization_id, 'admin']
      );

      const customer = await stripe.customers.create({
        email: userRows[0]?.email,
        name: org.name,
        metadata: { organization_id: org.id },
      });

      customerId = customer.id;

      await query('UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2', [
        customerId,
        organization_id,
      ]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `CaseCore ${PLANS[plan].name} Plan`,
            },
            unit_amount: PLANS[plan].price,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/home?billing=success`,
      cancel_url: `${process.env.CLIENT_URL}/home?billing=cancelled`,
      metadata: {
        organization_id: org.id,
        plan,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

export async function webhook(req: Request, res: Response): Promise<void> {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).json({ error: 'Webhook signature or secret missing' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organization_id;
        const plan = session.metadata?.plan || 'starter';

        if (organizationId) {
          await query(
            `UPDATE organizations
             SET plan = $1, stripe_subscription_id = $2
             WHERE id = $3`,
            [plan, session.subscription, organizationId]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgRows = await query<{ id: string }>(
          'SELECT id FROM organizations WHERE stripe_subscription_id = $1',
          [subscription.id]
        );

        if (orgRows.length > 0) {
          const status = subscription.status;
          if (status === 'active') {
            const plan = subscription.metadata?.plan || 'starter';
            await query('UPDATE organizations SET plan = $1 WHERE id = $2', [
              plan,
              orgRows[0].id,
            ]);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await query(
          `UPDATE organizations
           SET plan = 'starter', stripe_subscription_id = NULL
           WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export async function getSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);

    const orgRows = await query<{
      plan: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
    }>(
      `SELECT plan, stripe_customer_id, stripe_subscription_id
       FROM organizations WHERE id = $1`,
      [organization_id]
    );

    if (orgRows.length === 0) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const org = orgRows[0];
    let subscriptionDetails: {
      status: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    } | null = null;

    if (stripe && org.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        subscriptionDetails = {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      } catch (stripeError) {
        const message = stripeError instanceof Error ? stripeError.message : 'Unknown error';
        console.error('Failed to retrieve subscription:', message);
      }
    }

    res.json({
      plan: org.plan,
      hasStripeCustomer: !!org.stripe_customer_id,
      subscription: subscriptionDetails,
      availablePlans: PLANS,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
}
