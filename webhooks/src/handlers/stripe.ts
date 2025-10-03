import type { Env, StripeEvent, StripePaymentIntent, StripeSubscription, StripeInvoice } from '../types'

/**
 * Handle Stripe webhook events
 *
 * Supported events:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */
export async function handleStripeWebhook(event: StripeEvent, env: Env): Promise<any> {
  console.log(`[STRIPE] Processing event: ${event.type}`)

  switch (event.type) {
    case 'payment_intent.succeeded':
      return handlePaymentIntentSucceeded(event.data.object as StripePaymentIntent, env)

    case 'payment_intent.payment_failed':
      return handlePaymentIntentFailed(event.data.object as StripePaymentIntent, env)

    case 'customer.subscription.created':
      return handleSubscriptionCreated(event.data.object as StripeSubscription, env)

    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as StripeSubscription, env)

    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as StripeSubscription, env)

    case 'invoice.payment_succeeded':
      return handleInvoicePaymentSucceeded(event.data.object as StripeInvoice, env)

    case 'invoice.payment_failed':
      return handleInvoicePaymentFailed(event.data.object as StripeInvoice, env)

    default:
      console.log(`[STRIPE] Unhandled event type: ${event.type}`)
      return { acknowledged: true, event_type: event.type }
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: StripePaymentIntent, env: Env): Promise<any> {
  console.log(`[STRIPE] Payment succeeded: ${paymentIntent.id}`)

  // Update payment status in database
  await env.DB.query({
    sql: `UPDATE payments SET status = 'succeeded', updated_at = NOW() WHERE stripe_payment_intent_id = ?`,
    params: [paymentIntent.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'payment.succeeded',
    payload: {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
      metadata: paymentIntent.metadata,
    },
  })

  return { processed: true, payment_intent: paymentIntent.id }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: StripePaymentIntent, env: Env): Promise<any> {
  console.log(`[STRIPE] Payment failed: ${paymentIntent.id}`)

  // Update payment status in database
  await env.DB.query({
    sql: `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE stripe_payment_intent_id = ?`,
    params: [paymentIntent.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'payment.failed',
    payload: {
      paymentIntentId: paymentIntent.id,
      customerId: paymentIntent.customer,
      metadata: paymentIntent.metadata,
    },
  })

  return { processed: true, payment_intent: paymentIntent.id }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: StripeSubscription, env: Env): Promise<any> {
  console.log(`[STRIPE] Subscription created: ${subscription.id}`)

  // Create subscription in database
  await env.DB.query({
    sql: `INSERT INTO subscriptions (stripe_subscription_id, stripe_customer_id, status, created_at, updated_at)
          VALUES (?, ?, ?, NOW(), NOW())
          ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = ?, updated_at = NOW()`,
    params: [subscription.id, subscription.customer, subscription.status, subscription.status],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'subscription.created',
    payload: {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata,
    },
  })

  return { processed: true, subscription: subscription.id }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: StripeSubscription, env: Env): Promise<any> {
  console.log(`[STRIPE] Subscription updated: ${subscription.id}`)

  // Update subscription in database
  await env.DB.query({
    sql: `UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE stripe_subscription_id = ?`,
    params: [subscription.status, subscription.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'subscription.updated',
    payload: {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata,
    },
  })

  return { processed: true, subscription: subscription.id }
}

/**
 * Handle subscription deleted (canceled)
 */
async function handleSubscriptionDeleted(subscription: StripeSubscription, env: Env): Promise<any> {
  console.log(`[STRIPE] Subscription deleted: ${subscription.id}`)

  // Update subscription in database
  await env.DB.query({
    sql: `UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE stripe_subscription_id = ?`,
    params: [subscription.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'subscription.deleted',
    payload: {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      metadata: subscription.metadata,
    },
  })

  return { processed: true, subscription: subscription.id }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: StripeInvoice, env: Env): Promise<any> {
  console.log(`[STRIPE] Invoice payment succeeded: ${invoice.id}`)

  // Update invoice in database
  await env.DB.query({
    sql: `UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE stripe_invoice_id = ?`,
    params: [invoice.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'invoice.paid',
    payload: {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId: invoice.subscription,
      amountPaid: invoice.amount_due,
      currency: invoice.currency,
    },
  })

  return { processed: true, invoice: invoice.id }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: StripeInvoice, env: Env): Promise<any> {
  console.log(`[STRIPE] Invoice payment failed: ${invoice.id}`)

  // Update invoice in database
  await env.DB.query({
    sql: `UPDATE invoices SET status = 'failed', updated_at = NOW() WHERE stripe_invoice_id = ?`,
    params: [invoice.id],
  })

  // Queue notification
  await env.QUEUE.enqueue({
    type: 'invoice.failed',
    payload: {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId: invoice.subscription,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
    },
  })

  return { processed: true, invoice: invoice.id }
}
