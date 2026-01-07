/**
 * StripeDO - Durable Object for payments.do
 *
 * Implements the Stripe Connect platform service with:
 * - Charge creation and retrieval
 * - Subscription management
 * - Usage recording for metered billing
 * - Transfer creation for marketplace payouts
 * - Webhook handling
 * - REST API and RPC endpoints
 * - HATEOAS discovery
 *
 * @module stripe
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChargeParams {
  amount: number
  currency: string
  customer?: string
  description?: string
  metadata?: Record<string, string>
}

export interface Charge {
  id: string
  object: 'charge'
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed'
  customer?: string | null
  description?: string | null
  metadata?: Record<string, string>
  created: number
  refunded: boolean
  amount_refunded: number
}

export interface SubscriptionParams {
  customer: string
  items: Array<{ price: string }>
  metadata?: Record<string, string>
}

export interface Subscription {
  id: string
  object: 'subscription'
  customer: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  current_period_start: number
  current_period_end: number
  items: {
    data: Array<{
      id: string
      price: { id: string; unit_amount: number | null }
    }>
  }
  cancel_at_period_end: boolean
  canceled_at?: number | null
  metadata?: Record<string, string>
  created: number
}

export interface UsageRecordParams {
  subscriptionItemId: string
  quantity: number
  timestamp?: number
  action?: 'increment' | 'set'
}

export interface UsageRecord {
  id: string
  object: 'usage_record'
  quantity: number
  subscription_item: string
  timestamp: number
  action: 'increment' | 'set'
}

export interface TransferParams {
  amount: number
  currency: string
  destination: string
  description?: string
  metadata?: Record<string, string>
}

export interface Transfer {
  id: string
  object: 'transfer'
  amount: number
  currency: string
  destination: string
  description?: string | null
  metadata?: Record<string, string>
  created: number
}

export interface WebhookEvent {
  id: string
  object: 'event'
  type: string
  data: {
    object: Record<string, unknown>
  }
  created: number
  livemode: boolean
  api_version: string
}

// Minimal storage interface for mock testing
interface DOStorage {
  get<T = unknown>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined>
  put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void>
  delete(keyOrKeys: string | string[]): Promise<boolean | number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
  transaction?<T>(closure: (txn: DOStorage) => Promise<T>): Promise<T>
}

interface DOState {
  id: { toString(): string; name?: string }
  storage: DOStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

interface StripeSDK {
  charges: {
    create(params: unknown): Promise<Charge>
    retrieve(id: string): Promise<Charge>
    list(params?: unknown): Promise<{ data: Charge[] }>
  }
  customers: {
    create(params: unknown): Promise<unknown>
    retrieve(id: string): Promise<unknown>
    list(params?: unknown): Promise<{ data: unknown[] }>
  }
  subscriptions: {
    create(params: unknown): Promise<Subscription>
    retrieve(id: string): Promise<Subscription>
    update(id: string, params: unknown): Promise<Subscription>
    cancel(id: string): Promise<Subscription>
    list(params?: unknown): Promise<{ data: Subscription[] }>
  }
  subscriptionItems: {
    createUsageRecord(id: string, params: unknown): Promise<UsageRecord>
  }
  transfers: {
    create(params: unknown): Promise<Transfer>
    retrieve(id: string): Promise<Transfer>
    list(params?: unknown): Promise<{ data: Transfer[] }>
  }
  webhooks: {
    constructEvent(payload: string | Buffer, signature: string, secret: string): WebhookEvent
  }
}

interface StripeEnv {
  STRIPE: StripeSDK
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
}

// ============================================================================
// Validation Helpers
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60000
const RATE_LIMIT_MAX_REQUESTS = 100
const MAX_RETRIES = 3
const RETRYABLE_ERROR_TYPES = ['StripeConnectionError', 'StripeAPIError']
const NON_RETRYABLE_ERROR_CODES = ['card_declined', 'insufficient_funds', 'expired_card']

function validateAmount(amount: number): void {
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid amount: amount must be a positive number')
  }
}

function validateCurrency(currency: string): void {
  if (!currency || typeof currency !== 'string') {
    throw new Error('Currency is required')
  }
}

function validateCustomer(customer: string): void {
  if (!customer || typeof customer !== 'string') {
    throw new Error('Customer is required')
  }
}

function validateId(id: string, name: string = 'id'): void {
  if (!id || typeof id !== 'string') {
    throw new Error(`${name} is required`)
  }
}

function validateItems(items: Array<{ price: string }>): void {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Items are required and must not be empty')
  }
}

function validateQuantity(quantity: number): void {
  if (typeof quantity !== 'number' || quantity <= 0) {
    throw new Error('Invalid quantity: quantity must be a positive number greater than zero')
  }
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  // Remove any potential secrets or internal paths
  return message
    .replace(/sk_\S+/gi, '[REDACTED]')
    .replace(/whsec_\S+/gi, '[REDACTED]')
    .replace(/SECRET_KEY=\S+/gi, '[REDACTED]')
    .replace(/API_KEY=\S+/gi, '[REDACTED]')
    .replace(/\/\S+\.ts:\d+/g, '[INTERNAL]')
    .slice(0, 200)
}

function isStripeError(error: unknown): error is Error & { type?: string; code?: string } {
  return error instanceof Error && ('type' in error || 'code' in error)
}

function isRetryableError(error: unknown): boolean {
  if (isStripeError(error)) {
    if (error.type && RETRYABLE_ERROR_TYPES.includes(error.type)) {
      return true
    }
    if (error.code && NON_RETRYABLE_ERROR_CODES.includes(error.code)) {
      return false
    }
  }
  return false
}

function isResourceMissingError(error: unknown): boolean {
  return isStripeError(error) && error.code === 'resource_missing'
}

// ============================================================================
// StripeDO Implementation
// ============================================================================

export class StripeDO {
  protected readonly ctx: DOState
  protected readonly env: StripeEnv

  // RPC method whitelist
  private readonly allowedMethods = new Set([
    'createCharge', 'getCharge', 'listCharges',
    'createSubscription', 'getSubscription', 'cancelSubscription', 'listSubscriptions',
    'recordUsage', 'recordUsageForCustomer',
    'createTransfer', 'getTransfer', 'listTransfers',
    'handleWebhook'
  ])

  // Rate limiting
  private requestCounts: Map<string, { count: number; resetAt: number }> = new Map()

  // Webhook handlers
  private webhookHandlers: Map<string, (event: WebhookEvent) => Promise<void>> = new Map()

  // Customer to subscription cache (for recordUsageForCustomer)
  private customerSubscriptions: Map<string, string> = new Map()

  constructor(ctx: DOState, env: StripeEnv) {
    this.ctx = ctx
    this.env = env
    this.registerDefaultWebhookHandlers()
  }

  // ============================================================================
  // Retry Helper
  // ============================================================================

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (!isRetryableError(error) || attempt === MAX_RETRIES) {
          throw error
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
      }
    }
    throw lastError
  }

  // ============================================================================
  // Charge Operations
  // ============================================================================

  async createCharge(params: ChargeParams): Promise<Charge> {
    validateAmount(params.amount)
    validateCurrency(params.currency)

    return this.withRetry(async () => {
      const charge = await this.env.STRIPE.charges.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customer,
        description: params.description,
        metadata: params.metadata,
      })

      // Store charge reference
      await this.ctx.storage.put(`charges:${charge.id}`, {
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        created: charge.created,
      })

      return charge
    })
  }

  async getCharge(chargeId: string): Promise<Charge | null> {
    validateId(chargeId, 'chargeId')

    try {
      return await this.env.STRIPE.charges.retrieve(chargeId)
    } catch (error) {
      if (isResourceMissingError(error)) {
        return null
      }
      throw error
    }
  }

  async listCharges(params?: { customer?: string; limit?: number }): Promise<Charge[]> {
    const result = await this.env.STRIPE.charges.list(params)
    return result.data
  }

  // ============================================================================
  // Subscription Operations
  // ============================================================================

  async createSubscription(params: SubscriptionParams): Promise<Subscription> {
    validateCustomer(params.customer)
    validateItems(params.items)

    return this.withRetry(async () => {
      const subscription = await this.env.STRIPE.subscriptions.create({
        customer: params.customer,
        items: params.items,
        metadata: params.metadata,
      })

      // Cache customer -> subscription mapping
      this.customerSubscriptions.set(params.customer, subscription.id)

      // Store subscription reference
      await this.ctx.storage.put(`subscriptions:${subscription.id}`, {
        id: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        created: subscription.created,
      })

      // Store subscription items for usage recording
      for (const item of subscription.items.data) {
        await this.ctx.storage.put(`subscription_items:${params.customer}:${item.id}`, {
          id: item.id,
          subscriptionId: subscription.id,
          priceId: item.price.id,
        })
      }

      return subscription
    })
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    validateId(subscriptionId, 'subscriptionId')

    try {
      return await this.env.STRIPE.subscriptions.retrieve(subscriptionId)
    } catch (error) {
      if (isResourceMissingError(error)) {
        return null
      }
      throw error
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    validateId(subscriptionId, 'subscriptionId')

    const subscription = await this.env.STRIPE.subscriptions.cancel(subscriptionId)

    // Update stored reference
    await this.ctx.storage.put(`subscriptions:${subscription.id}`, {
      id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
      canceled_at: subscription.canceled_at,
    })

    return subscription
  }

  async listSubscriptions(params?: { customer?: string; status?: string }): Promise<Subscription[]> {
    const result = await this.env.STRIPE.subscriptions.list(params)
    return result.data
  }

  // ============================================================================
  // Usage Recording Operations
  // ============================================================================

  async recordUsage(params: UsageRecordParams): Promise<UsageRecord> {
    validateId(params.subscriptionItemId, 'subscriptionItemId')
    validateQuantity(params.quantity)

    return this.withRetry(async () => {
      const usageRecord = await this.env.STRIPE.subscriptionItems.createUsageRecord(
        params.subscriptionItemId,
        {
          quantity: params.quantity,
          timestamp: params.timestamp,
          action: params.action ?? 'increment',
        }
      )

      // Store usage record
      await this.ctx.storage.put(`usage:${usageRecord.id}`, {
        id: usageRecord.id,
        quantity: usageRecord.quantity,
        subscription_item: usageRecord.subscription_item,
        timestamp: usageRecord.timestamp,
      })

      return usageRecord
    })
  }

  async recordUsageForCustomer(params: {
    customerId: string
    quantity: number
    timestamp?: number
  }): Promise<UsageRecord> {
    validateCustomer(params.customerId)
    validateQuantity(params.quantity)

    // Find subscription for customer
    const subscriptions = await this.listSubscriptions({ customer: params.customerId })
    if (subscriptions.length === 0) {
      throw new Error(`No subscription found for customer: ${params.customerId}`)
    }

    const subscription = subscriptions[0]
    const subscriptionItemId = subscription.items.data[0]?.id

    if (!subscriptionItemId) {
      throw new Error(`No subscription items found for customer: ${params.customerId}`)
    }

    return this.recordUsage({
      subscriptionItemId,
      quantity: params.quantity,
      timestamp: params.timestamp,
    })
  }

  // ============================================================================
  // Transfer Operations (Marketplace Payouts)
  // ============================================================================

  async createTransfer(params: TransferParams): Promise<Transfer> {
    validateAmount(params.amount)
    validateCurrency(params.currency)
    validateId(params.destination, 'destination')

    return this.withRetry(async () => {
      const transfer = await this.env.STRIPE.transfers.create({
        amount: params.amount,
        currency: params.currency,
        destination: params.destination,
        description: params.description,
        metadata: params.metadata,
      })

      // Store transfer reference
      await this.ctx.storage.put(`transfers:${transfer.id}`, {
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        destination: transfer.destination,
        created: transfer.created,
      })

      return transfer
    })
  }

  async getTransfer(transferId: string): Promise<Transfer | null> {
    validateId(transferId, 'transferId')

    try {
      return await this.env.STRIPE.transfers.retrieve(transferId)
    } catch (error) {
      if (isResourceMissingError(error)) {
        return null
      }
      throw error
    }
  }

  async listTransfers(params?: { destination?: string; limit?: number }): Promise<Transfer[]> {
    const result = await this.env.STRIPE.transfers.list(params)
    return result.data
  }

  // ============================================================================
  // Webhook Handling
  // ============================================================================

  async handleWebhook(request: Request): Promise<Response> {
    const signature = request.headers.get('Stripe-Signature')
    if (!signature) {
      return Response.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
    }

    let payload: string
    try {
      payload = await request.text()
    } catch {
      return Response.json({ error: 'Failed to read request body' }, { status: 400 })
    }

    let event: WebhookEvent
    try {
      event = this.env.STRIPE.webhooks.constructEvent(
        payload,
        signature,
        this.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid signature'
      return Response.json({ error: message }, { status: 400 })
    }

    // Store webhook event (for idempotency and logging)
    const eventKey = `webhook:${event.id}`
    const existingEvent = await this.ctx.storage.get(eventKey)
    if (!existingEvent) {
      await this.ctx.storage.put(eventKey, {
        id: event.id,
        type: event.type,
        created: event.created,
        processed_at: Date.now(),
      })
    }

    // Process the event
    const handler = this.webhookHandlers.get(event.type)
    if (handler) {
      try {
        await handler(event)
      } catch (error) {
        console.error(`Error processing webhook ${event.type}:`, error)
        // Still return 200 to acknowledge receipt
      }
    }

    return Response.json({ received: true })
  }

  registerWebhookHandler(eventType: string, handler: (event: WebhookEvent) => Promise<void>): void {
    this.webhookHandlers.set(eventType, handler)
  }

  getWebhookHandlers(): Record<string, (event: WebhookEvent) => Promise<void>> {
    const handlers: Record<string, (event: WebhookEvent) => Promise<void>> = {}
    for (const [key, value] of this.webhookHandlers) {
      handlers[key] = value
    }
    return handlers
  }

  private registerDefaultWebhookHandlers(): void {
    // Charge events
    this.webhookHandlers.set('charge.succeeded', async (event) => {
      const charge = event.data.object as { id: string; amount: number }
      await this.ctx.storage.put(`charges:${charge.id}`, { ...charge, webhook_processed: true })
    })

    // Subscription events
    this.webhookHandlers.set('customer.subscription.created', async (event) => {
      const subscription = event.data.object as { id: string; customer: string; status: string }
      await this.ctx.storage.put(`subscriptions:${subscription.id}`, { ...subscription, webhook_processed: true })
    })

    this.webhookHandlers.set('customer.subscription.deleted', async (event) => {
      const subscription = event.data.object as { id: string }
      await this.ctx.storage.put(`subscriptions:${subscription.id}`, { ...event.data.object, webhook_processed: true })
    })

    // Invoice events
    this.webhookHandlers.set('invoice.paid', async (event) => {
      const invoice = event.data.object as { id: string }
      await this.ctx.storage.put(`invoices:${invoice.id}`, { ...invoice, webhook_processed: true })
    })

    this.webhookHandlers.set('invoice.payment_failed', async (event) => {
      const invoice = event.data.object as { id: string }
      await this.ctx.storage.put(`invoices:${invoice.id}`, { ...invoice, webhook_processed: true })
    })

    // Transfer events
    this.webhookHandlers.set('transfer.created', async (event) => {
      const transfer = event.data.object as { id: string }
      await this.ctx.storage.put(`transfers:${transfer.id}`, { ...transfer, webhook_processed: true })
    })

    // Connect events
    this.webhookHandlers.set('account.updated', async (event) => {
      const account = event.data.object as { id: string }
      await this.ctx.storage.put(`accounts:${account.id}`, { ...account, webhook_processed: true })
    })

    this.webhookHandlers.set('payout.created', async (event) => {
      const payout = event.data.object as { id: string }
      await this.ctx.storage.put(`payouts:${payout.id}`, { ...payout, webhook_processed: true })
    })

    this.webhookHandlers.set('payout.failed', async (event) => {
      const payout = event.data.object as { id: string }
      await this.ctx.storage.put(`payouts:${payout.id}`, { ...payout, webhook_processed: true })
    })
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

    switch (method) {
      case 'createCharge':
        return this.createCharge(params[0] as ChargeParams)
      case 'getCharge':
        return this.getCharge(params[0] as string)
      case 'listCharges':
        return this.listCharges(params[0] as { customer?: string; limit?: number } | undefined)
      case 'createSubscription':
        return this.createSubscription(params[0] as SubscriptionParams)
      case 'getSubscription':
        return this.getSubscription(params[0] as string)
      case 'cancelSubscription':
        return this.cancelSubscription(params[0] as string)
      case 'listSubscriptions':
        return this.listSubscriptions(params[0] as { customer?: string; status?: string } | undefined)
      case 'recordUsage':
        return this.recordUsage(params[0] as UsageRecordParams)
      case 'recordUsageForCustomer':
        return this.recordUsageForCustomer(params[0] as { customerId: string; quantity: number; timestamp?: number })
      case 'createTransfer':
        return this.createTransfer(params[0] as TransferParams)
      case 'getTransfer':
        return this.getTransfer(params[0] as string)
      case 'listTransfers':
        return this.listTransfers(params[0] as { destination?: string; limit?: number } | undefined)
      default:
        throw new Error(`Method not implemented: ${method}`)
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

      // Route: POST /webhooks - Webhook handler
      if (path === '/webhooks') {
        if (request.method !== 'POST') {
          return Response.json({ error: 'Method not allowed' }, { status: 405 })
        }
        return this.handleWebhook(request)
      }

      // Route: POST /rpc - RPC endpoint
      if (path === '/rpc' && request.method === 'POST') {
        return this.handleRpc(request)
      }

      // Route: REST API /api/*
      if (path.startsWith('/api/')) {
        return this.handleRestApi(request, path)
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      const message = sanitizeError(error)
      const status = this.getErrorStatus(error)
      return Response.json({ error: message }, { status })
    }
  }

  // ============================================================================
  // HTTP Handlers
  // ============================================================================

  private async handleDiscovery(): Promise<Response> {
    return Response.json({
      api: 'payments.do',
      version: '1.0.0',
      links: {
        self: '/',
        rpc: '/rpc',
        webhooks: '/webhooks',
        charges: '/api/charges',
        subscriptions: '/api/subscriptions',
        usage: '/api/usage',
        transfers: '/api/transfers',
      },
      discover: {
        resources: [
          { name: 'charges', href: '/api/charges', methods: ['GET', 'POST'] },
          { name: 'subscriptions', href: '/api/subscriptions', methods: ['GET', 'POST', 'DELETE'] },
          { name: 'usage', href: '/api/usage', methods: ['POST'] },
          { name: 'transfers', href: '/api/transfers', methods: ['GET', 'POST'] },
        ],
        methods: [
          { name: 'createCharge', description: 'Create a new charge' },
          { name: 'getCharge', description: 'Get a charge by ID' },
          { name: 'listCharges', description: 'List charges' },
          { name: 'createSubscription', description: 'Create a subscription' },
          { name: 'cancelSubscription', description: 'Cancel a subscription' },
          { name: 'recordUsage', description: 'Record metered usage' },
          { name: 'createTransfer', description: 'Create a marketplace transfer' },
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
      const result = await this.invoke(method, params)
      return Response.json({ result })
    } catch (error) {
      const status = this.getErrorStatus(error)
      return Response.json({ error: sanitizeError(error) }, { status })
    }
  }

  private async handleRestApi(request: Request, path: string): Promise<Response> {
    const parts = path.replace('/api/', '').split('/').filter(Boolean)
    const resource = parts[0]
    const id = parts[1]

    try {
      switch (resource) {
        case 'charges':
          return this.handleChargesApi(request, id)
        case 'subscriptions':
          return this.handleSubscriptionsApi(request, id)
        case 'usage':
          return this.handleUsageApi(request)
        case 'transfers':
          return this.handleTransfersApi(request, id)
        default:
          return Response.json({ error: 'Resource not found' }, { status: 404 })
      }
    } catch (error) {
      const status = this.getErrorStatus(error)
      return Response.json({ error: sanitizeError(error) }, { status })
    }
  }

  private async handleChargesApi(request: Request, id?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (id) {
          const charge = await this.getCharge(id)
          if (!charge) {
            return Response.json({ error: 'Charge not found' }, { status: 404 })
          }
          return Response.json(charge)
        } else {
          const charges = await this.listCharges()
          return Response.json({ data: charges })
        }

      case 'POST':
        if (id) {
          return Response.json({ error: 'POST to collection, not item' }, { status: 400 })
        }
        try {
          const body = await request.json() as ChargeParams
          const charge = await this.createCharge(body)
          return Response.json(charge, { status: 201 })
        } catch (error) {
          if (error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid JSON' }, { status: 400 })
          }
          const status = this.getErrorStatus(error)
          return Response.json({ error: sanitizeError(error) }, { status })
        }

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  private async handleSubscriptionsApi(request: Request, id?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (id) {
          const subscription = await this.getSubscription(id)
          if (!subscription) {
            return Response.json({ error: 'Subscription not found' }, { status: 404 })
          }
          return Response.json(subscription)
        } else {
          const subscriptions = await this.listSubscriptions()
          return Response.json({ data: subscriptions })
        }

      case 'POST':
        if (id) {
          return Response.json({ error: 'POST to collection, not item' }, { status: 400 })
        }
        try {
          const body = await request.json() as SubscriptionParams
          const subscription = await this.createSubscription(body)
          return Response.json(subscription, { status: 201 })
        } catch (error) {
          if (error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid JSON' }, { status: 400 })
          }
          const status = this.getErrorStatus(error)
          return Response.json({ error: sanitizeError(error) }, { status })
        }

      case 'DELETE':
        if (!id) {
          return Response.json({ error: 'Subscription ID required' }, { status: 400 })
        }
        const canceled = await this.cancelSubscription(id)
        return Response.json(canceled)

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  private async handleUsageApi(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    try {
      const body = await request.json() as UsageRecordParams & { customerId?: string }

      if (body.customerId) {
        const usage = await this.recordUsageForCustomer({
          customerId: body.customerId,
          quantity: body.quantity,
          timestamp: body.timestamp,
        })
        return Response.json(usage, { status: 201 })
      }

      if (!body.subscriptionItemId) {
        return Response.json({ error: 'subscriptionItemId or customerId required' }, { status: 400 })
      }

      const usage = await this.recordUsage(body)
      return Response.json(usage, { status: 201 })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 })
      }
      const status = this.getErrorStatus(error)
      return Response.json({ error: sanitizeError(error) }, { status })
    }
  }

  private async handleTransfersApi(request: Request, id?: string): Promise<Response> {
    switch (request.method) {
      case 'GET':
        if (id) {
          const transfer = await this.getTransfer(id)
          if (!transfer) {
            return Response.json({ error: 'Transfer not found' }, { status: 404 })
          }
          return Response.json(transfer)
        } else {
          const transfers = await this.listTransfers()
          return Response.json({ data: transfers })
        }

      case 'POST':
        if (id) {
          return Response.json({ error: 'POST to collection, not item' }, { status: 400 })
        }
        try {
          const body = await request.json() as TransferParams
          const transfer = await this.createTransfer(body)
          return Response.json(transfer, { status: 201 })
        } catch (error) {
          if (error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid JSON' }, { status: 400 })
          }
          const status = this.getErrorStatus(error)
          return Response.json({ error: sanitizeError(error) }, { status })
        }

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

  private getErrorStatus(error: unknown): number {
    if (isStripeError(error)) {
      if (error.type === 'StripeCardError') return 400
      if (error.type === 'StripeInvalidRequestError') return 400
      if (error.type === 'StripeAuthenticationError') return 401
      if (error.type === 'StripeRateLimitError') return 429
      if (error.type === 'StripeAPIError') return 500
    }

    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('required') || message.includes('invalid')) return 400
    if (message.includes('not found')) return 404

    return 500
  }
}
