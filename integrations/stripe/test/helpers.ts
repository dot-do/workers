/**
 * Test helpers for payments.do (Stripe) worker tests
 *
 * Provides mock implementations for StripeDO testing.
 */

import { vi } from 'vitest'
import type Stripe from 'stripe'

// ============================================================================
// Mock Stripe Types
// ============================================================================

/**
 * Mock Stripe Charge
 */
export interface MockCharge {
  id: string
  object: 'charge'
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed'
  customer?: string | null
  description?: string | null
  metadata?: Record<string, string>
  created: number
  receipt_url?: string | null
  refunded: boolean
  amount_refunded: number
}

/**
 * Mock Stripe Subscription
 */
export interface MockSubscription {
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

/**
 * Mock Stripe Usage Record
 */
export interface MockUsageRecord {
  id: string
  object: 'usage_record'
  quantity: number
  subscription_item: string
  timestamp: number
  action: 'increment' | 'set'
}

/**
 * Mock Stripe Transfer
 */
export interface MockTransfer {
  id: string
  object: 'transfer'
  amount: number
  currency: string
  destination: string
  description?: string | null
  metadata?: Record<string, string>
  created: number
}

/**
 * Mock Stripe Customer
 */
export interface MockCustomer {
  id: string
  object: 'customer'
  email?: string | null
  name?: string | null
  metadata?: Record<string, string>
  created: number
}

/**
 * Mock Stripe Event (for webhooks)
 */
export interface MockStripeEvent {
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

// ============================================================================
// Mock Stripe SDK
// ============================================================================

export interface MockStripeSDK {
  charges: {
    create: (params: Stripe.ChargeCreateParams) => Promise<MockCharge>
    retrieve: (id: string) => Promise<MockCharge>
    list: (params?: Stripe.ChargeListParams) => Promise<{ data: MockCharge[] }>
  }
  customers: {
    create: (params: Stripe.CustomerCreateParams) => Promise<MockCustomer>
    retrieve: (id: string) => Promise<MockCustomer>
    list: (params?: Stripe.CustomerListParams) => Promise<{ data: MockCustomer[] }>
  }
  subscriptions: {
    create: (params: Stripe.SubscriptionCreateParams) => Promise<MockSubscription>
    retrieve: (id: string) => Promise<MockSubscription>
    update: (id: string, params: Stripe.SubscriptionUpdateParams) => Promise<MockSubscription>
    cancel: (id: string) => Promise<MockSubscription>
    list: (params?: Stripe.SubscriptionListParams) => Promise<{ data: MockSubscription[] }>
  }
  subscriptionItems: {
    createUsageRecord: (
      subscriptionItemId: string,
      params: Stripe.SubscriptionItemCreateUsageRecordParams
    ) => Promise<MockUsageRecord>
  }
  transfers: {
    create: (params: Stripe.TransferCreateParams) => Promise<MockTransfer>
    retrieve: (id: string) => Promise<MockTransfer>
    list: (params?: Stripe.TransferListParams) => Promise<{ data: MockTransfer[] }>
  }
  webhooks: {
    constructEvent: (
      payload: string | Buffer,
      signature: string,
      secret: string
    ) => MockStripeEvent
  }
}

/**
 * Create a mock Stripe SDK
 */
export function createMockStripe(): MockStripeSDK {
  const charges = new Map<string, MockCharge>()
  const customers = new Map<string, MockCustomer>()
  const subscriptions = new Map<string, MockSubscription>()
  const usageRecords: MockUsageRecord[] = []
  const transfers = new Map<string, MockTransfer>()

  return {
    charges: {
      create: vi.fn(async (params: Stripe.ChargeCreateParams): Promise<MockCharge> => {
        const id = `ch_${Math.random().toString(36).slice(2, 14)}`
        const charge: MockCharge = {
          id,
          object: 'charge',
          amount: params.amount as number,
          currency: params.currency as string,
          status: 'succeeded',
          customer: params.customer as string | undefined,
          description: params.description as string | undefined,
          metadata: params.metadata as Record<string, string> | undefined,
          created: Math.floor(Date.now() / 1000),
          refunded: false,
          amount_refunded: 0,
        }
        charges.set(id, charge)
        return charge
      }),
      retrieve: vi.fn(async (id: string): Promise<MockCharge> => {
        const charge = charges.get(id)
        if (!charge) {
          const error = new Error(`No such charge: ${id}`) as Error & { type: string; code: string }
          error.type = 'StripeInvalidRequestError'
          error.code = 'resource_missing'
          throw error
        }
        return charge
      }),
      list: vi.fn(async (): Promise<{ data: MockCharge[] }> => {
        return { data: Array.from(charges.values()) }
      }),
    },
    customers: {
      create: vi.fn(async (params: Stripe.CustomerCreateParams): Promise<MockCustomer> => {
        const id = `cus_${Math.random().toString(36).slice(2, 14)}`
        const customer: MockCustomer = {
          id,
          object: 'customer',
          email: params.email as string | undefined,
          name: params.name as string | undefined,
          metadata: params.metadata as Record<string, string> | undefined,
          created: Math.floor(Date.now() / 1000),
        }
        customers.set(id, customer)
        return customer
      }),
      retrieve: vi.fn(async (id: string): Promise<MockCustomer> => {
        const customer = customers.get(id)
        if (!customer) {
          const error = new Error(`No such customer: ${id}`) as Error & { type: string; code: string }
          error.type = 'StripeInvalidRequestError'
          error.code = 'resource_missing'
          throw error
        }
        return customer
      }),
      list: vi.fn(async (): Promise<{ data: MockCustomer[] }> => {
        return { data: Array.from(customers.values()) }
      }),
    },
    subscriptions: {
      create: vi.fn(async (params: Stripe.SubscriptionCreateParams): Promise<MockSubscription> => {
        const id = `sub_${Math.random().toString(36).slice(2, 14)}`
        const now = Math.floor(Date.now() / 1000)
        const subscription: MockSubscription = {
          id,
          object: 'subscription',
          customer: params.customer as string,
          status: 'active',
          current_period_start: now,
          current_period_end: now + 30 * 24 * 60 * 60, // 30 days
          items: {
            data: (params.items as Array<{ price: string }>)?.map((item, idx) => ({
              id: `si_${Math.random().toString(36).slice(2, 14)}`,
              price: { id: item.price, unit_amount: 1000 },
            })) ?? [],
          },
          cancel_at_period_end: false,
          metadata: params.metadata as Record<string, string> | undefined,
          created: now,
        }
        subscriptions.set(id, subscription)
        return subscription
      }),
      retrieve: vi.fn(async (id: string): Promise<MockSubscription> => {
        const subscription = subscriptions.get(id)
        if (!subscription) {
          const error = new Error(`No such subscription: ${id}`) as Error & { type: string; code: string }
          error.type = 'StripeInvalidRequestError'
          error.code = 'resource_missing'
          throw error
        }
        return subscription
      }),
      update: vi.fn(async (id: string, params: Stripe.SubscriptionUpdateParams): Promise<MockSubscription> => {
        const subscription = subscriptions.get(id)
        if (!subscription) {
          const error = new Error(`No such subscription: ${id}`) as Error & { type: string; code: string }
          error.type = 'StripeInvalidRequestError'
          error.code = 'resource_missing'
          throw error
        }
        const updated = {
          ...subscription,
          ...(params.cancel_at_period_end !== undefined && { cancel_at_period_end: params.cancel_at_period_end as boolean }),
          ...(params.metadata && { metadata: params.metadata as Record<string, string> }),
        }
        subscriptions.set(id, updated)
        return updated
      }),
      cancel: vi.fn(async (id: string): Promise<MockSubscription> => {
        const subscription = subscriptions.get(id)
        if (!subscription) {
          const error = new Error(`No such subscription: ${id}`) as Error & { type: string; code: string }
          error.type = 'StripeInvalidRequestError'
          error.code = 'resource_missing'
          throw error
        }
        const canceled: MockSubscription = {
          ...subscription,
          status: 'canceled',
          canceled_at: Math.floor(Date.now() / 1000),
        }
        subscriptions.set(id, canceled)
        return canceled
      }),
      list: vi.fn(async (params?: Stripe.SubscriptionListParams): Promise<{ data: MockSubscription[] }> => {
        let data = Array.from(subscriptions.values())
        if (params?.customer) {
          data = data.filter(s => s.customer === params.customer)
        }
        return { data }
      }),
    },
    subscriptionItems: {
      createUsageRecord: vi.fn(async (
        subscriptionItemId: string,
        params: Stripe.SubscriptionItemCreateUsageRecordParams
      ): Promise<MockUsageRecord> => {
        const record: MockUsageRecord = {
          id: `mbur_${Math.random().toString(36).slice(2, 14)}`,
          object: 'usage_record',
          quantity: params.quantity as number,
          subscription_item: subscriptionItemId,
          timestamp: params.timestamp ?? Math.floor(Date.now() / 1000),
          action: (params.action as 'increment' | 'set') ?? 'increment',
        }
        usageRecords.push(record)
        return record
      }),
    },
    transfers: {
      create: vi.fn(async (params: Stripe.TransferCreateParams): Promise<MockTransfer> => {
        const id = `tr_${Math.random().toString(36).slice(2, 14)}`
        const transfer: MockTransfer = {
          id,
          object: 'transfer',
          amount: params.amount as number,
          currency: params.currency as string,
          destination: params.destination as string,
          description: params.description as string | undefined,
          metadata: params.metadata as Record<string, string> | undefined,
          created: Math.floor(Date.now() / 1000),
        }
        transfers.set(id, transfer)
        return transfer
      }),
      retrieve: vi.fn(async (id: string): Promise<MockTransfer> => {
        const transfer = transfers.get(id)
        if (!transfer) {
          const error = new Error(`No such transfer: ${id}`) as Error & { type: string; code: string }
          error.type = 'StripeInvalidRequestError'
          error.code = 'resource_missing'
          throw error
        }
        return transfer
      }),
      list: vi.fn(async (): Promise<{ data: MockTransfer[] }> => {
        return { data: Array.from(transfers.values()) }
      }),
    },
    webhooks: {
      constructEvent: vi.fn((
        payload: string | Buffer,
        signature: string,
        secret: string
      ): MockStripeEvent => {
        // Validate signature format
        if (!signature.startsWith('t=') && !signature.includes(',v1=')) {
          const error = new Error('Invalid signature') as Error & { type: string }
          error.type = 'StripeSignatureVerificationError'
          throw error
        }

        // Parse the payload
        const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString())
        return parsedPayload as MockStripeEvent
      }),
    },
  }
}

// ============================================================================
// Mock DO Storage
// ============================================================================

/**
 * Mock DOStorage interface for StripeDO
 */
export interface MockDOStorage {
  get: <T>(keyOrKeys: string | string[]) => Promise<T | Map<string, T> | undefined>
  put: <T>(keyOrEntries: string | Record<string, T>, value?: T) => Promise<void>
  delete: (keyOrKeys: string | string[]) => Promise<boolean | number>
  deleteAll: () => Promise<void>
  list: <T>(options?: { prefix?: string; limit?: number }) => Promise<Map<string, T>>
  transaction: <T>(closure: (txn: MockDOStorage) => Promise<T>) => Promise<T>
}

/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(initialData?: Record<string, unknown>): MockDOStorage {
  const store = new Map<string, unknown>()

  if (initialData) {
    for (const [key, value] of Object.entries(initialData)) {
      store.set(key, value)
    }
  }

  const getImpl = async <T>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined> => {
    if (Array.isArray(keyOrKeys)) {
      const result = new Map<string, T>()
      for (const key of keyOrKeys) {
        const value = store.get(key) as T | undefined
        if (value !== undefined) result.set(key, value)
      }
      return result
    }
    return store.get(keyOrKeys) as T | undefined
  }

  const putImpl = async <T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> => {
    if (typeof keyOrEntries === 'string') {
      store.set(keyOrEntries, value)
    } else {
      for (const [k, v] of Object.entries(keyOrEntries)) {
        store.set(k, v)
      }
    }
  }

  const deleteImpl = async (keyOrKeys: string | string[]): Promise<boolean | number> => {
    if (Array.isArray(keyOrKeys)) {
      let count = 0
      for (const key of keyOrKeys) {
        if (store.delete(key)) count++
      }
      return count
    }
    return store.delete(keyOrKeys)
  }

  const deleteAllImpl = async (): Promise<void> => {
    store.clear()
  }

  const listImpl = async <T>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>> => {
    let entries = Array.from(store.entries())

    if (options?.prefix) {
      entries = entries.filter(([key]) => key.startsWith(options.prefix!))
    }

    entries.sort(([a], [b]) => a.localeCompare(b))

    if (options?.limit !== undefined) {
      entries = entries.slice(0, options.limit)
    }

    return new Map(entries) as Map<string, T>
  }

  const storage: MockDOStorage = {
    get: vi.fn(getImpl) as MockDOStorage['get'],
    put: vi.fn(putImpl) as MockDOStorage['put'],
    delete: vi.fn(deleteImpl),
    deleteAll: vi.fn(deleteAllImpl),
    list: vi.fn(listImpl) as MockDOStorage['list'],
    transaction: null as unknown as MockDOStorage['transaction'],
  }

  storage.transaction = vi.fn(async <T>(closure: (txn: MockDOStorage) => Promise<T>): Promise<T> => {
    return closure(storage)
  }) as MockDOStorage['transaction']

  return storage
}

// ============================================================================
// Mock DO State and Environment
// ============================================================================

/**
 * Mock DurableObjectId
 */
export interface MockDurableObjectId {
  name?: string
  toString(): string
  equals(other: MockDurableObjectId): boolean
}

/**
 * Create a mock DurableObjectId
 */
export function createMockId(name?: string): MockDurableObjectId {
  const idString = name ?? `mock-id-${Math.random().toString(36).slice(2, 10)}`
  return {
    name,
    toString: () => idString,
    equals: (other: MockDurableObjectId) => other.toString() === idString,
  }
}

/**
 * Mock DOState for StripeDO
 */
export interface MockDOState {
  id: MockDurableObjectId
  storage: MockDOStorage
  blockConcurrencyWhile: <T>(callback: () => Promise<T>) => Promise<T>
  acceptWebSocket: (ws: WebSocket, tags?: string[]) => void
  getWebSockets: (tag?: string) => WebSocket[]
  setWebSocketAutoResponse: (pair: unknown) => void
}

/**
 * Create a mock DOState
 */
export function createMockState(options?: {
  id?: MockDurableObjectId
  storage?: MockDOStorage
  initialData?: Record<string, unknown>
}): MockDOState {
  const id = options?.id ?? createMockId()
  const storage = options?.storage ?? createMockStorage(options?.initialData)

  return {
    id,
    storage,
    blockConcurrencyWhile: vi.fn(async (callback) => callback()),
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => []),
    setWebSocketAutoResponse: vi.fn(),
  }
}

/**
 * Mock environment bindings for StripeDO
 */
export interface MockStripeEnv {
  STRIPE: MockStripeSDK
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
}

/**
 * Create mock environment
 */
export function createMockEnv(stripe?: MockStripeSDK): MockStripeEnv {
  return {
    STRIPE: stripe ?? createMockStripe(),
    STRIPE_SECRET_KEY: 'sk_test_mock_key',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_mock_secret',
  }
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock webhook request
 */
export function createWebhookRequest(
  eventType: string,
  data: Record<string, unknown>,
  secret: string = 'whsec_test_mock_secret'
): Request {
  const event: MockStripeEvent = {
    id: `evt_${Math.random().toString(36).slice(2, 14)}`,
    object: 'event',
    type: eventType,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    api_version: '2024-12-18.acacia',
  }

  const payload = JSON.stringify(event)
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = `t=${timestamp},v1=mock_signature_for_testing`

  return new Request('https://payments.do/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: payload,
  })
}

/**
 * Create a Stripe error
 */
export function createStripeError(
  message: string,
  type: string = 'StripeInvalidRequestError',
  code?: string
): Error & { type: string; code?: string } {
  const error = new Error(message) as Error & { type: string; code?: string }
  error.type = type
  if (code) error.code = code
  return error
}
