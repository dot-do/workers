/**
 * PaymentsDO - Durable Object for payments.do
 *
 * Stripe Connect Platform for billing, subscriptions, usage-based billing,
 * and marketplace payouts.
 *
 * API (env.STRIPE):
 * - charges.create({ amount, currency, customer })
 * - charges.get(chargeId)
 * - charges.list(customerId?)
 * - subscriptions.create({ customer, price })
 * - subscriptions.get(subId)
 * - subscriptions.cancel(subId)
 * - subscriptions.list(customerId?)
 * - usage.record(customerId, { quantity })
 * - usage.get(customerId, period?)
 * - transfers.create({ amount, destination }) - Marketplace payouts
 * - transfers.get(transferId)
 * - transfers.list(destination?)
 * - customers.create/get/list/delete
 * - invoices.create/get/list/finalize/pay
 *
 * @module @dotdo/workers-payments
 */

import Stripe from 'stripe'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChargeParams {
  amount: number
  currency: string
  customer: string
  description?: string
  metadata?: Record<string, string>
}

export interface Charge {
  id: string
  amount: number
  currency: string
  customerId: string
  status: 'pending' | 'succeeded' | 'failed'
  description?: string
  metadata?: Record<string, string>
  createdAt: Date
}

export interface SubscriptionParams {
  customer: string
  price: string
  metadata?: Record<string, string>
}

export interface Subscription {
  id: string
  customerId: string
  priceId: string
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'
  currentPeriodEnd: Date
  canceledAt?: Date
  metadata?: Record<string, string>
}

export interface UsageRecordParams {
  quantity: number
  timestamp?: Date
  model?: string
  action?: string
}

export interface UsageRecord {
  id: string
  customerId: string
  quantity: number
  timestamp: Date
  model?: string
  action?: string
}

export interface TransferParams {
  amount: number
  destination: string
  currency?: string
  description?: string
  metadata?: Record<string, string>
}

export interface Transfer {
  id: string
  amount: number
  currency: string
  destination: string
  status: 'pending' | 'paid' | 'failed' | 'canceled'
  description?: string
  metadata?: Record<string, string>
  createdAt: Date
}

export interface CustomerParams {
  email: string
  name?: string
  description?: string
  metadata?: Record<string, string>
}

export interface Customer {
  id: string
  email: string
  name?: string
  description?: string
  metadata?: Record<string, string>
  createdAt: Date
}

export interface InvoiceItem {
  description: string
  amount: number
  quantity?: number
}

export interface InvoiceParams {
  customer: string
  items: InvoiceItem[]
  description?: string
  metadata?: Record<string, string>
}

export interface Invoice {
  id: string
  customerId: string
  amount: number
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  items: InvoiceItem[]
  description?: string
  metadata?: Record<string, string>
  createdAt: Date
  paidAt?: Date
}

export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: unknown
  }
  created: number
}

// Internal storage types
interface StoredCustomer extends Customer {
  stripeId: string
}

interface StoredCharge extends Charge {
  stripeId: string
}

interface StoredSubscription extends Subscription {
  stripeId: string
}

interface StoredTransfer extends Transfer {
  stripeId: string
}

interface StoredInvoice extends Invoice {
  stripeId: string
}

// Minimal storage interface for mock testing
interface DOStorage {
  get<T = unknown>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined>
  put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void>
  delete(keyOrKeys: string | string[]): Promise<boolean | number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number; start?: string; startAfter?: string }): Promise<Map<string, T>>
  transaction?<T>(closure: (txn: DOStorage) => Promise<T>): Promise<T>
}

interface DOState {
  id: { toString(): string; name?: string }
  storage: DOStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

interface PaymentsEnv {
  PAYMENTS_DO?: unknown
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET?: string
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60000
const RATE_LIMIT_MAX_REQUESTS = 100

// ============================================================================
// Helper Functions
// ============================================================================

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/SECRET_KEY=\S+/gi, '[REDACTED]')
    .replace(/API_KEY=\S+/gi, '[REDACTED]')
    .replace(/sk_\w+/gi, '[REDACTED]')
    .replace(/pk_\w+/gi, '[REDACTED]')
    .slice(0, 200)
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`
}

// ============================================================================
// PaymentsDO Implementation
// ============================================================================

export class PaymentsDO {
  protected readonly ctx: DOState
  protected readonly env: PaymentsEnv
  private stripe: Stripe | null = null

  // RPC method whitelist
  private readonly allowedMethods = new Set([
    // Customer methods
    'customers.create', 'customers.get', 'customers.list', 'customers.delete',
    // Charge methods
    'charges.create', 'charges.get', 'charges.list',
    // Subscription methods
    'subscriptions.create', 'subscriptions.get', 'subscriptions.cancel', 'subscriptions.list',
    // Usage methods
    'usage.record', 'usage.get',
    // Transfer methods
    'transfers.create', 'transfers.get', 'transfers.list',
    // Invoice methods
    'invoices.create', 'invoices.get', 'invoices.list', 'invoices.finalize', 'invoices.pay',
    // Webhook handling
    'webhooks.handle',
  ])

  // Rate limiting
  private requestCounts: Map<string, { count: number; resetAt: number }> = new Map()

  constructor(ctx: DOState, env: PaymentsEnv) {
    this.ctx = ctx
    this.env = env
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      if (!this.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is required')
      }
      this.stripe = new Stripe(this.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
      })
    }
    return this.stripe
  }

  // ============================================================================
  // Customer Methods
  // ============================================================================

  /**
   * Namespace object for customer operations
   */
  readonly customers = {
    /**
     * Create a new customer
     */
    create: async (params: CustomerParams): Promise<Customer> => {
      if (!params.email || typeof params.email !== 'string') {
        throw new Error('Invalid email: email is required')
      }

      const stripe = this.getStripe()

      const stripeCustomer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        description: params.description,
        metadata: params.metadata,
      })

      const customer: StoredCustomer = {
        id: generateId('cus'),
        stripeId: stripeCustomer.id,
        email: params.email,
        name: params.name,
        description: params.description,
        metadata: params.metadata,
        createdAt: new Date(),
      }

      // Store by our ID and Stripe ID
      await this.ctx.storage.put(`customer:${customer.id}`, customer)
      await this.ctx.storage.put(`stripe_customer:${stripeCustomer.id}`, customer.id)

      return this.toCustomer(customer)
    },

    /**
     * Get a customer by ID
     */
    get: async (customerId: string): Promise<Customer | null> => {
      if (!customerId || typeof customerId !== 'string') {
        return null
      }

      const customer = await this.ctx.storage.get<StoredCustomer>(`customer:${customerId}`)
      return customer ? this.toCustomer(customer) : null
    },

    /**
     * List all customers
     */
    list: async (): Promise<Customer[]> => {
      const customers = await this.ctx.storage.list<StoredCustomer>({ prefix: 'customer:' })
      return Array.from(customers.values())
        .map(c => this.toCustomer(c))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },

    /**
     * Delete a customer
     */
    delete: async (customerId: string): Promise<void> => {
      if (!customerId || typeof customerId !== 'string') {
        throw new Error('Invalid customerId: customerId is required')
      }

      const customer = await this.ctx.storage.get<StoredCustomer>(`customer:${customerId}`)
      if (!customer) {
        throw new Error('Customer not found')
      }

      const stripe = this.getStripe()
      await stripe.customers.del(customer.stripeId)

      await this.ctx.storage.delete(`customer:${customerId}`)
      await this.ctx.storage.delete(`stripe_customer:${customer.stripeId}`)
    },
  }

  // ============================================================================
  // Charge Methods
  // ============================================================================

  readonly charges = {
    /**
     * Create a charge
     */
    create: async (params: ChargeParams): Promise<Charge> => {
      if (!params.amount || typeof params.amount !== 'number' || params.amount <= 0) {
        throw new Error('Invalid amount: amount must be a positive number')
      }
      if (!params.currency || typeof params.currency !== 'string') {
        throw new Error('Invalid currency: currency is required')
      }
      if (!params.customer || typeof params.customer !== 'string') {
        throw new Error('Invalid customer: customer is required')
      }

      const customer = await this.ctx.storage.get<StoredCustomer>(`customer:${params.customer}`)
      if (!customer) {
        throw new Error('Customer not found')
      }

      const stripe = this.getStripe()

      // Create a PaymentIntent (modern approach)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        customer: customer.stripeId,
        description: params.description,
        metadata: params.metadata,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      })

      const charge: StoredCharge = {
        id: generateId('ch'),
        stripeId: paymentIntent.id,
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        customerId: params.customer,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' :
                paymentIntent.status === 'requires_payment_method' ? 'failed' : 'pending',
        description: params.description,
        metadata: params.metadata,
        createdAt: new Date(),
      }

      await this.ctx.storage.put(`charge:${charge.id}`, charge)
      await this.ctx.storage.put(`stripe_charge:${paymentIntent.id}`, charge.id)

      return this.toCharge(charge)
    },

    /**
     * Get a charge by ID
     */
    get: async (chargeId: string): Promise<Charge | null> => {
      if (!chargeId || typeof chargeId !== 'string') {
        return null
      }

      const charge = await this.ctx.storage.get<StoredCharge>(`charge:${chargeId}`)
      return charge ? this.toCharge(charge) : null
    },

    /**
     * List charges, optionally filtered by customer
     */
    list: async (customerId?: string): Promise<Charge[]> => {
      const charges = await this.ctx.storage.list<StoredCharge>({ prefix: 'charge:' })
      let result = Array.from(charges.values())

      if (customerId) {
        result = result.filter(c => c.customerId === customerId)
      }

      return result
        .map(c => this.toCharge(c))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
  }

  // ============================================================================
  // Subscription Methods
  // ============================================================================

  readonly subscriptions = {
    /**
     * Create a subscription
     */
    create: async (params: SubscriptionParams): Promise<Subscription> => {
      if (!params.customer || typeof params.customer !== 'string') {
        throw new Error('Invalid customer: customer is required')
      }
      if (!params.price || typeof params.price !== 'string') {
        throw new Error('Invalid price: price is required')
      }

      const customer = await this.ctx.storage.get<StoredCustomer>(`customer:${params.customer}`)
      if (!customer) {
        throw new Error('Customer not found')
      }

      const stripe = this.getStripe()

      const stripeSub = await stripe.subscriptions.create({
        customer: customer.stripeId,
        items: [{ price: params.price }],
        metadata: params.metadata,
      })

      const subscription: StoredSubscription = {
        id: generateId('sub'),
        stripeId: stripeSub.id,
        customerId: params.customer,
        priceId: params.price,
        status: stripeSub.status as Subscription['status'],
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        metadata: params.metadata,
      }

      await this.ctx.storage.put(`subscription:${subscription.id}`, subscription)
      await this.ctx.storage.put(`stripe_subscription:${stripeSub.id}`, subscription.id)

      return this.toSubscription(subscription)
    },

    /**
     * Get a subscription by ID
     */
    get: async (subId: string): Promise<Subscription | null> => {
      if (!subId || typeof subId !== 'string') {
        return null
      }

      const subscription = await this.ctx.storage.get<StoredSubscription>(`subscription:${subId}`)
      return subscription ? this.toSubscription(subscription) : null
    },

    /**
     * Cancel a subscription
     */
    cancel: async (subId: string): Promise<void> => {
      if (!subId || typeof subId !== 'string') {
        throw new Error('Invalid subId: subscription ID is required')
      }

      const subscription = await this.ctx.storage.get<StoredSubscription>(`subscription:${subId}`)
      if (!subscription) {
        throw new Error('Subscription not found')
      }

      const stripe = this.getStripe()
      await stripe.subscriptions.cancel(subscription.stripeId)

      subscription.status = 'canceled'
      subscription.canceledAt = new Date()
      await this.ctx.storage.put(`subscription:${subId}`, subscription)
    },

    /**
     * List subscriptions, optionally filtered by customer
     */
    list: async (customerId?: string): Promise<Subscription[]> => {
      const subscriptions = await this.ctx.storage.list<StoredSubscription>({ prefix: 'subscription:' })
      let result = Array.from(subscriptions.values())

      if (customerId) {
        result = result.filter(s => s.customerId === customerId)
      }

      return result
        .map(s => this.toSubscription(s))
        .sort((a, b) => b.currentPeriodEnd.getTime() - a.currentPeriodEnd.getTime())
    },
  }

  // ============================================================================
  // Usage Methods (for metered billing)
  // ============================================================================

  readonly usage = {
    /**
     * Record usage for a customer
     */
    record: async (customerId: string, params: UsageRecordParams): Promise<void> => {
      if (!customerId || typeof customerId !== 'string') {
        throw new Error('Invalid customerId: customer ID is required')
      }
      if (!params.quantity || typeof params.quantity !== 'number' || params.quantity <= 0) {
        throw new Error('Invalid quantity: quantity must be a positive number')
      }

      const customer = await this.ctx.storage.get<StoredCustomer>(`customer:${customerId}`)
      if (!customer) {
        throw new Error('Customer not found')
      }

      const record: UsageRecord = {
        id: generateId('usage'),
        customerId,
        quantity: params.quantity,
        timestamp: params.timestamp ?? new Date(),
        model: params.model,
        action: params.action,
      }

      await this.ctx.storage.put(`usage:${customerId}:${record.id}`, record)
    },

    /**
     * Get usage for a customer, optionally within a date range
     */
    get: async (customerId: string, period?: { start: Date; end: Date }): Promise<{ total: number; records: UsageRecord[] }> => {
      if (!customerId || typeof customerId !== 'string') {
        return { total: 0, records: [] }
      }

      const usageRecords = await this.ctx.storage.list<UsageRecord>({ prefix: `usage:${customerId}:` })
      let records = Array.from(usageRecords.values())

      if (period) {
        const startTime = period.start.getTime()
        const endTime = period.end.getTime()
        records = records.filter(r => {
          const recordTime = new Date(r.timestamp).getTime()
          return recordTime >= startTime && recordTime <= endTime
        })
      }

      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      const total = records.reduce((sum, r) => sum + r.quantity, 0)

      return { total, records }
    },
  }

  // ============================================================================
  // Transfer Methods (for marketplace payouts)
  // ============================================================================

  readonly transfers = {
    /**
     * Create a transfer to a connected account
     */
    create: async (params: TransferParams): Promise<Transfer> => {
      if (!params.amount || typeof params.amount !== 'number' || params.amount <= 0) {
        throw new Error('Invalid amount: amount must be a positive number')
      }
      if (!params.destination || typeof params.destination !== 'string') {
        throw new Error('Invalid destination: destination account is required')
      }

      const stripe = this.getStripe()

      const stripeTransfer = await stripe.transfers.create({
        amount: params.amount,
        currency: params.currency?.toLowerCase() ?? 'usd',
        destination: params.destination,
        description: params.description,
        metadata: params.metadata,
      })

      const transfer: StoredTransfer = {
        id: generateId('tr'),
        stripeId: stripeTransfer.id,
        amount: params.amount,
        currency: params.currency?.toLowerCase() ?? 'usd',
        destination: params.destination,
        status: 'paid', // Stripe transfers are immediate
        description: params.description,
        metadata: params.metadata,
        createdAt: new Date(),
      }

      await this.ctx.storage.put(`transfer:${transfer.id}`, transfer)
      await this.ctx.storage.put(`stripe_transfer:${stripeTransfer.id}`, transfer.id)

      return this.toTransfer(transfer)
    },

    /**
     * Get a transfer by ID
     */
    get: async (transferId: string): Promise<Transfer | null> => {
      if (!transferId || typeof transferId !== 'string') {
        return null
      }

      const transfer = await this.ctx.storage.get<StoredTransfer>(`transfer:${transferId}`)
      return transfer ? this.toTransfer(transfer) : null
    },

    /**
     * List transfers, optionally filtered by destination
     */
    list: async (destination?: string): Promise<Transfer[]> => {
      const transfers = await this.ctx.storage.list<StoredTransfer>({ prefix: 'transfer:' })
      let result = Array.from(transfers.values())

      if (destination) {
        result = result.filter(t => t.destination === destination)
      }

      return result
        .map(t => this.toTransfer(t))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
  }

  // ============================================================================
  // Invoice Methods
  // ============================================================================

  readonly invoices = {
    /**
     * Create an invoice
     */
    create: async (params: InvoiceParams): Promise<Invoice> => {
      if (!params.customer || typeof params.customer !== 'string') {
        throw new Error('Invalid customer: customer is required')
      }
      if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
        throw new Error('Invalid items: at least one invoice item is required')
      }

      const customer = await this.ctx.storage.get<StoredCustomer>(`customer:${params.customer}`)
      if (!customer) {
        throw new Error('Customer not found')
      }

      const stripe = this.getStripe()

      // Create the invoice
      const stripeInvoice = await stripe.invoices.create({
        customer: customer.stripeId,
        description: params.description,
        metadata: params.metadata,
        auto_advance: false, // Keep as draft
      })

      // Add invoice items
      for (const item of params.items) {
        await stripe.invoiceItems.create({
          customer: customer.stripeId,
          invoice: stripeInvoice.id,
          description: item.description,
          amount: item.amount,
          currency: 'usd',
          quantity: item.quantity ?? 1,
        })
      }

      // Retrieve the updated invoice
      const updatedInvoice = await stripe.invoices.retrieve(stripeInvoice.id)

      const invoice: StoredInvoice = {
        id: generateId('in'),
        stripeId: stripeInvoice.id,
        customerId: params.customer,
        amount: updatedInvoice.amount_due ?? 0,
        status: 'draft',
        items: params.items,
        description: params.description,
        metadata: params.metadata,
        createdAt: new Date(),
      }

      await this.ctx.storage.put(`invoice:${invoice.id}`, invoice)
      await this.ctx.storage.put(`stripe_invoice:${stripeInvoice.id}`, invoice.id)

      return this.toInvoice(invoice)
    },

    /**
     * Get an invoice by ID
     */
    get: async (invoiceId: string): Promise<Invoice | null> => {
      if (!invoiceId || typeof invoiceId !== 'string') {
        return null
      }

      const invoice = await this.ctx.storage.get<StoredInvoice>(`invoice:${invoiceId}`)
      return invoice ? this.toInvoice(invoice) : null
    },

    /**
     * List invoices, optionally filtered by customer
     */
    list: async (customerId?: string): Promise<Invoice[]> => {
      const invoices = await this.ctx.storage.list<StoredInvoice>({ prefix: 'invoice:' })
      let result = Array.from(invoices.values())

      if (customerId) {
        result = result.filter(i => i.customerId === customerId)
      }

      return result
        .map(i => this.toInvoice(i))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },

    /**
     * Finalize an invoice (make it ready for payment)
     */
    finalize: async (invoiceId: string): Promise<Invoice> => {
      if (!invoiceId || typeof invoiceId !== 'string') {
        throw new Error('Invalid invoiceId: invoice ID is required')
      }

      const invoice = await this.ctx.storage.get<StoredInvoice>(`invoice:${invoiceId}`)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      if (invoice.status !== 'draft') {
        throw new Error('Invoice can only be finalized from draft status')
      }

      const stripe = this.getStripe()
      await stripe.invoices.finalizeInvoice(invoice.stripeId)

      invoice.status = 'open'
      await this.ctx.storage.put(`invoice:${invoiceId}`, invoice)

      return this.toInvoice(invoice)
    },

    /**
     * Pay an invoice
     */
    pay: async (invoiceId: string): Promise<Invoice> => {
      if (!invoiceId || typeof invoiceId !== 'string') {
        throw new Error('Invalid invoiceId: invoice ID is required')
      }

      const invoice = await this.ctx.storage.get<StoredInvoice>(`invoice:${invoiceId}`)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      if (invoice.status !== 'open') {
        throw new Error('Invoice must be open to pay')
      }

      const stripe = this.getStripe()
      await stripe.invoices.pay(invoice.stripeId)

      invoice.status = 'paid'
      invoice.paidAt = new Date()
      await this.ctx.storage.put(`invoice:${invoiceId}`, invoice)

      return this.toInvoice(invoice)
    },
  }

  // ============================================================================
  // Webhook Handling
  // ============================================================================

  readonly webhooks = {
    /**
     * Handle a Stripe webhook event
     */
    handle: async (payload: string, signature: string): Promise<{ received: boolean }> => {
      if (!this.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is required for webhook handling')
      }

      const stripe = this.getStripe()

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        this.env.STRIPE_WEBHOOK_SECRET
      )

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
          break
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
          break
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
          break
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break
      }

      return { received: true }
    },
  }

  // ============================================================================
  // Webhook Handlers
  // ============================================================================

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const chargeId = await this.ctx.storage.get<string>(`stripe_charge:${paymentIntent.id}`)
    if (chargeId) {
      const charge = await this.ctx.storage.get<StoredCharge>(`charge:${chargeId}`)
      if (charge) {
        charge.status = 'succeeded'
        await this.ctx.storage.put(`charge:${chargeId}`, charge)
      }
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const chargeId = await this.ctx.storage.get<string>(`stripe_charge:${paymentIntent.id}`)
    if (chargeId) {
      const charge = await this.ctx.storage.get<StoredCharge>(`charge:${chargeId}`)
      if (charge) {
        charge.status = 'failed'
        await this.ctx.storage.put(`charge:${chargeId}`, charge)
      }
    }
  }

  private async handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
    const subId = await this.ctx.storage.get<string>(`stripe_subscription:${stripeSub.id}`)
    if (subId) {
      const subscription = await this.ctx.storage.get<StoredSubscription>(`subscription:${subId}`)
      if (subscription) {
        subscription.status = stripeSub.status as Subscription['status']
        subscription.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000)
        if (stripeSub.canceled_at) {
          subscription.canceledAt = new Date(stripeSub.canceled_at * 1000)
        }
        await this.ctx.storage.put(`subscription:${subId}`, subscription)
      }
    }
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    const subId = await this.ctx.storage.get<string>(`stripe_subscription:${stripeSub.id}`)
    if (subId) {
      const subscription = await this.ctx.storage.get<StoredSubscription>(`subscription:${subId}`)
      if (subscription) {
        subscription.status = 'canceled'
        subscription.canceledAt = new Date()
        await this.ctx.storage.put(`subscription:${subId}`, subscription)
      }
    }
  }

  private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoiceId = await this.ctx.storage.get<string>(`stripe_invoice:${stripeInvoice.id}`)
    if (invoiceId) {
      const invoice = await this.ctx.storage.get<StoredInvoice>(`invoice:${invoiceId}`)
      if (invoice) {
        invoice.status = 'paid'
        invoice.paidAt = new Date()
        await this.ctx.storage.put(`invoice:${invoiceId}`, invoice)
      }
    }
  }

  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoiceId = await this.ctx.storage.get<string>(`stripe_invoice:${stripeInvoice.id}`)
    if (invoiceId) {
      const invoice = await this.ctx.storage.get<StoredInvoice>(`invoice:${invoiceId}`)
      if (invoice) {
        invoice.status = 'uncollectible'
        await this.ctx.storage.put(`invoice:${invoiceId}`, invoice)
      }
    }
  }

  // ============================================================================
  // Type Conversion Helpers
  // ============================================================================

  private toCustomer(stored: StoredCustomer): Customer {
    return {
      id: stored.id,
      email: stored.email,
      name: stored.name,
      description: stored.description,
      metadata: stored.metadata,
      createdAt: new Date(stored.createdAt),
    }
  }

  private toCharge(stored: StoredCharge): Charge {
    return {
      id: stored.id,
      amount: stored.amount,
      currency: stored.currency,
      customerId: stored.customerId,
      status: stored.status,
      description: stored.description,
      metadata: stored.metadata,
      createdAt: new Date(stored.createdAt),
    }
  }

  private toSubscription(stored: StoredSubscription): Subscription {
    return {
      id: stored.id,
      customerId: stored.customerId,
      priceId: stored.priceId,
      status: stored.status,
      currentPeriodEnd: new Date(stored.currentPeriodEnd),
      canceledAt: stored.canceledAt ? new Date(stored.canceledAt) : undefined,
      metadata: stored.metadata,
    }
  }

  private toTransfer(stored: StoredTransfer): Transfer {
    return {
      id: stored.id,
      amount: stored.amount,
      currency: stored.currency,
      destination: stored.destination,
      status: stored.status,
      description: stored.description,
      metadata: stored.metadata,
      createdAt: new Date(stored.createdAt),
    }
  }

  private toInvoice(stored: StoredInvoice): Invoice {
    return {
      id: stored.id,
      customerId: stored.customerId,
      amount: stored.amount,
      status: stored.status,
      items: stored.items,
      description: stored.description,
      metadata: stored.metadata,
      createdAt: new Date(stored.createdAt),
      paidAt: stored.paidAt ? new Date(stored.paidAt) : undefined,
    }
  }

  // ============================================================================
  // RPC Interface
  // ============================================================================

  hasMethod(name: string): boolean {
    return this.allowedMethods.has(name)
  }

  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }

    const [namespace, action] = method.split('.')

    switch (namespace) {
      case 'customers':
        return this.invokeCustomers(action, params)
      case 'charges':
        return this.invokeCharges(action, params)
      case 'subscriptions':
        return this.invokeSubscriptions(action, params)
      case 'usage':
        return this.invokeUsage(action, params)
      case 'transfers':
        return this.invokeTransfers(action, params)
      case 'invoices':
        return this.invokeInvoices(action, params)
      case 'webhooks':
        return this.invokeWebhooks(action, params)
      default:
        throw new Error(`Unknown namespace: ${namespace}`)
    }
  }

  private async invokeCustomers(action: string, params: unknown[]): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.customers.create(params[0] as CustomerParams)
      case 'get':
        return this.customers.get(params[0] as string)
      case 'list':
        return this.customers.list()
      case 'delete':
        return this.customers.delete(params[0] as string)
      default:
        throw new Error(`Unknown customer action: ${action}`)
    }
  }

  private async invokeCharges(action: string, params: unknown[]): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.charges.create(params[0] as ChargeParams)
      case 'get':
        return this.charges.get(params[0] as string)
      case 'list':
        return this.charges.list(params[0] as string | undefined)
      default:
        throw new Error(`Unknown charge action: ${action}`)
    }
  }

  private async invokeSubscriptions(action: string, params: unknown[]): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.subscriptions.create(params[0] as SubscriptionParams)
      case 'get':
        return this.subscriptions.get(params[0] as string)
      case 'cancel':
        return this.subscriptions.cancel(params[0] as string)
      case 'list':
        return this.subscriptions.list(params[0] as string | undefined)
      default:
        throw new Error(`Unknown subscription action: ${action}`)
    }
  }

  private async invokeUsage(action: string, params: unknown[]): Promise<unknown> {
    switch (action) {
      case 'record':
        return this.usage.record(params[0] as string, params[1] as UsageRecordParams)
      case 'get':
        return this.usage.get(params[0] as string, params[1] as { start: Date; end: Date } | undefined)
      default:
        throw new Error(`Unknown usage action: ${action}`)
    }
  }

  private async invokeTransfers(action: string, params: unknown[]): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.transfers.create(params[0] as TransferParams)
      case 'get':
        return this.transfers.get(params[0] as string)
      case 'list':
        return this.transfers.list(params[0] as string | undefined)
      default:
        throw new Error(`Unknown transfer action: ${action}`)
    }
  }

  private async invokeInvoices(action: string, params: unknown[]): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.invoices.create(params[0] as InvoiceParams)
      case 'get':
        return this.invoices.get(params[0] as string)
      case 'list':
        return this.invoices.list(params[0] as string | undefined)
      case 'finalize':
        return this.invoices.finalize(params[0] as string)
      case 'pay':
        return this.invoices.pay(params[0] as string)
      default:
        throw new Error(`Unknown invoice action: ${action}`)
    }
  }

  private async invokeWebhooks(action: string, params: unknown[]): Promise<unknown> {
    switch (action) {
      case 'handle':
        return this.webhooks.handle(params[0] as string, params[1] as string)
      default:
        throw new Error(`Unknown webhook action: ${action}`)
    }
  }

  // ============================================================================
  // HTTP Fetch Handler
  // ============================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Rate limiting
    const clientId = request.headers.get('cf-connecting-ip') ?? 'unknown'
    if (!this.checkRateLimit(clientId)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    try {
      // Route: GET / - HATEOAS discovery
      if (path === '/' && request.method === 'GET') {
        return this.handleDiscovery()
      }

      // Route: POST /rpc - RPC endpoint
      if (path === '/rpc' && request.method === 'POST') {
        return this.handleRpc(request)
      }

      // Route: POST /webhooks - Stripe webhook endpoint
      if (path === '/webhooks' && request.method === 'POST') {
        return this.handleWebhook(request)
      }

      // Route: REST API /api/*
      if (path.startsWith('/api/')) {
        return this.handleRestApi(request, url, path)
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      const message = sanitizeError(error)
      return Response.json({ error: message }, { status: 500 })
    }
  }

  // ============================================================================
  // HTTP Handlers
  // ============================================================================

  private handleDiscovery(): Response {
    return Response.json({
      api: 'payments.do',
      version: '1.0.0',
      links: {
        self: '/',
        rpc: '/rpc',
        webhooks: '/webhooks',
        customers: '/api/customers',
        charges: '/api/charges',
        subscriptions: '/api/subscriptions',
        usage: '/api/usage',
        transfers: '/api/transfers',
        invoices: '/api/invoices',
      },
      discover: {
        namespaces: ['customers', 'charges', 'subscriptions', 'usage', 'transfers', 'invoices', 'webhooks'],
        methods: [
          { name: 'customers.create', description: 'Create a new customer' },
          { name: 'customers.get', description: 'Get customer by ID' },
          { name: 'customers.list', description: 'List all customers' },
          { name: 'customers.delete', description: 'Delete a customer' },
          { name: 'charges.create', description: 'Create a charge' },
          { name: 'charges.get', description: 'Get charge by ID' },
          { name: 'charges.list', description: 'List charges' },
          { name: 'subscriptions.create', description: 'Create a subscription' },
          { name: 'subscriptions.get', description: 'Get subscription by ID' },
          { name: 'subscriptions.cancel', description: 'Cancel a subscription' },
          { name: 'subscriptions.list', description: 'List subscriptions' },
          { name: 'usage.record', description: 'Record usage for metered billing' },
          { name: 'usage.get', description: 'Get usage records' },
          { name: 'transfers.create', description: 'Create a marketplace transfer' },
          { name: 'transfers.get', description: 'Get transfer by ID' },
          { name: 'transfers.list', description: 'List transfers' },
          { name: 'invoices.create', description: 'Create an invoice' },
          { name: 'invoices.get', description: 'Get invoice by ID' },
          { name: 'invoices.list', description: 'List invoices' },
          { name: 'invoices.finalize', description: 'Finalize a draft invoice' },
          { name: 'invoices.pay', description: 'Pay an open invoice' },
          { name: 'webhooks.handle', description: 'Handle Stripe webhook events' },
        ],
      },
    })
  }

  private async handleRpc(request: Request): Promise<Response> {
    let body: { method: string; params: unknown[] }

    try {
      body = await request.json() as { method: string; params: unknown[] }
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { method, params } = body

    if (!this.hasMethod(method)) {
      return Response.json({ error: `Method not allowed: ${method}` }, { status: 400 })
    }

    try {
      const result = await this.invoke(method, params ?? [])
      return Response.json({ result })
    } catch (error) {
      return Response.json({ error: sanitizeError(error) }, { status: 400 })
    }
  }

  private async handleWebhook(request: Request): Promise<Response> {
    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return Response.json({ error: 'Missing Stripe signature' }, { status: 400 })
    }

    try {
      const payload = await request.text()
      const result = await this.webhooks.handle(payload, signature)
      return Response.json(result)
    } catch (error) {
      return Response.json({ error: sanitizeError(error) }, { status: 400 })
    }
  }

  private async handleRestApi(request: Request, url: URL, path: string): Promise<Response> {
    const pathParts = path.replace('/api/', '').split('/').filter(Boolean)
    const resource = pathParts[0]
    const resourceId = pathParts[1]
    const action = pathParts[2]

    try {
      switch (resource) {
        case 'customers':
          return this.handleCustomersRest(request, resourceId)
        case 'charges':
          return this.handleChargesRest(request, resourceId)
        case 'subscriptions':
          return this.handleSubscriptionsRest(request, resourceId, action)
        case 'usage':
          return this.handleUsageRest(request, resourceId)
        case 'transfers':
          return this.handleTransfersRest(request, resourceId)
        case 'invoices':
          return this.handleInvoicesRest(request, resourceId, action)
        default:
          return Response.json({ error: 'Unknown resource' }, { status: 404 })
      }
    } catch (error) {
      return Response.json({ error: sanitizeError(error) }, { status: 400 })
    }
  }

  private async handleCustomersRest(request: Request, customerId?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (customerId) {
          const customer = await this.customers.get(customerId)
          if (!customer) {
            return Response.json({ error: 'Customer not found' }, { status: 404 })
          }
          return Response.json(customer)
        }
        return Response.json(await this.customers.list())

      case 'POST':
        if (customerId) {
          return Response.json({ error: 'POST to /api/customers, not specific ID' }, { status: 400 })
        }
        const body = await request.json() as CustomerParams
        const customer = await this.customers.create(body)
        return Response.json(customer, { status: 201 })

      case 'DELETE':
        if (!customerId) {
          return Response.json({ error: 'Customer ID required' }, { status: 400 })
        }
        await this.customers.delete(customerId)
        return Response.json({ success: true })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  private async handleChargesRest(request: Request, chargeId?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (chargeId) {
          const charge = await this.charges.get(chargeId)
          if (!charge) {
            return Response.json({ error: 'Charge not found' }, { status: 404 })
          }
          return Response.json(charge)
        }
        return Response.json(await this.charges.list())

      case 'POST':
        if (chargeId) {
          return Response.json({ error: 'POST to /api/charges, not specific ID' }, { status: 400 })
        }
        const body = await request.json() as ChargeParams
        const charge = await this.charges.create(body)
        return Response.json(charge, { status: 201 })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  private async handleSubscriptionsRest(request: Request, subId?: string, action?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (subId) {
          const sub = await this.subscriptions.get(subId)
          if (!sub) {
            return Response.json({ error: 'Subscription not found' }, { status: 404 })
          }
          return Response.json(sub)
        }
        return Response.json(await this.subscriptions.list())

      case 'POST':
        if (subId && action === 'cancel') {
          await this.subscriptions.cancel(subId)
          return Response.json({ success: true })
        }
        if (subId) {
          return Response.json({ error: 'Unknown action' }, { status: 400 })
        }
        const body = await request.json() as SubscriptionParams
        const sub = await this.subscriptions.create(body)
        return Response.json(sub, { status: 201 })

      case 'DELETE':
        if (!subId) {
          return Response.json({ error: 'Subscription ID required' }, { status: 400 })
        }
        await this.subscriptions.cancel(subId)
        return Response.json({ success: true })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  private async handleUsageRest(request: Request, customerId?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (!customerId) {
          return Response.json({ error: 'Customer ID required' }, { status: 400 })
        }
        return Response.json(await this.usage.get(customerId))

      case 'POST':
        if (!customerId) {
          return Response.json({ error: 'Customer ID required' }, { status: 400 })
        }
        const body = await request.json() as UsageRecordParams
        await this.usage.record(customerId, body)
        return Response.json({ success: true }, { status: 201 })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  private async handleTransfersRest(request: Request, transferId?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (transferId) {
          const transfer = await this.transfers.get(transferId)
          if (!transfer) {
            return Response.json({ error: 'Transfer not found' }, { status: 404 })
          }
          return Response.json(transfer)
        }
        return Response.json(await this.transfers.list())

      case 'POST':
        if (transferId) {
          return Response.json({ error: 'POST to /api/transfers, not specific ID' }, { status: 400 })
        }
        const body = await request.json() as TransferParams
        const transfer = await this.transfers.create(body)
        return Response.json(transfer, { status: 201 })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  private async handleInvoicesRest(request: Request, invoiceId?: string, action?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (invoiceId) {
          const invoice = await this.invoices.get(invoiceId)
          if (!invoice) {
            return Response.json({ error: 'Invoice not found' }, { status: 404 })
          }
          return Response.json(invoice)
        }
        return Response.json(await this.invoices.list())

      case 'POST':
        if (invoiceId && action === 'finalize') {
          const invoice = await this.invoices.finalize(invoiceId)
          return Response.json(invoice)
        }
        if (invoiceId && action === 'pay') {
          const invoice = await this.invoices.pay(invoiceId)
          return Response.json(invoice)
        }
        if (invoiceId) {
          return Response.json({ error: 'Unknown action' }, { status: 400 })
        }
        const body = await request.json() as InvoiceParams
        const invoice = await this.invoices.create(body)
        return Response.json(invoice, { status: 201 })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private checkRateLimit(clientId: string): boolean {
    const now = Date.now()
    const record = this.requestCounts.get(clientId)

    if (!record || now > record.resetAt) {
      this.requestCounts.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
      return true
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false
    }

    record.count++
    return true
  }
}
