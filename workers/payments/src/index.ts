/**
 * @dotdo/workers-payments - Payments Worker (payments.do)
 *
 * Stripe Connect Platform for billing, subscriptions, usage-based billing,
 * and marketplace payouts.
 *
 * API (env.STRIPE):
 * - charges.create({ amount, currency, customer })
 * - subscriptions.create({ customer, price })
 * - usage.record(customerId, { quantity })
 * - transfers.create({ amount, destination }) - Marketplace payouts
 * - customers.create/get/list
 * - invoices.create/get/list
 *
 * @module @dotdo/workers-payments
 */

export { PaymentsDO } from './payments.js'
export type {
  ChargeParams,
  Charge,
  SubscriptionParams,
  Subscription,
  UsageRecordParams,
  UsageRecord,
  TransferParams,
  Transfer,
  CustomerParams,
  Customer,
  InvoiceParams,
  Invoice,
  InvoiceItem,
  WebhookEvent,
} from './payments.js'
