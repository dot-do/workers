/**
 * Test helpers for payments worker tests
 *
 * Provides mock implementations for PaymentsDO testing.
 */

import { vi } from 'vitest'

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
 * Mock DOStorage interface for payments worker
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

  // Implementation functions with proper behavior
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

  // Create storage object first without transaction to avoid circular reference
  const storage: MockDOStorage = {
    get: vi.fn(getImpl) as MockDOStorage['get'],
    put: vi.fn(putImpl) as MockDOStorage['put'],
    delete: vi.fn(deleteImpl),
    deleteAll: vi.fn(deleteAllImpl),
    list: vi.fn(listImpl) as MockDOStorage['list'],
    transaction: null as unknown as MockDOStorage['transaction'],
  }

  // Add transaction with access to storage
  storage.transaction = vi.fn(async <T>(closure: (txn: MockDOStorage) => Promise<T>): Promise<T> => {
    return closure(storage)
  }) as MockDOStorage['transaction']

  return storage
}

/**
 * Mock DOState for payments worker
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
 * Mock Stripe instance for testing
 */
export interface MockStripe {
  customers: {
    create: ReturnType<typeof vi.fn>
    retrieve: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
    del: ReturnType<typeof vi.fn>
  }
  paymentIntents: {
    create: ReturnType<typeof vi.fn>
    retrieve: ReturnType<typeof vi.fn>
  }
  subscriptions: {
    create: ReturnType<typeof vi.fn>
    retrieve: ReturnType<typeof vi.fn>
    cancel: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }
  transfers: {
    create: ReturnType<typeof vi.fn>
    retrieve: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }
  invoices: {
    create: ReturnType<typeof vi.fn>
    retrieve: ReturnType<typeof vi.fn>
    finalizeInvoice: ReturnType<typeof vi.fn>
    pay: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }
  invoiceItems: {
    create: ReturnType<typeof vi.fn>
  }
  webhooks: {
    constructEvent: ReturnType<typeof vi.fn>
  }
}

/**
 * Create a mock Stripe instance
 */
export function createMockStripe(): MockStripe {
  return {
    customers: {
      create: vi.fn(async (params: { email: string; name?: string }) => ({
        id: `cus_stripe_${Math.random().toString(36).slice(2, 10)}`,
        email: params.email,
        name: params.name,
        metadata: {},
        created: Math.floor(Date.now() / 1000),
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        email: 'test@example.com',
        name: 'Test User',
        metadata: {},
        created: Math.floor(Date.now() / 1000),
      })),
      list: vi.fn(async () => ({
        data: [],
        has_more: false,
      })),
      del: vi.fn(async () => ({ deleted: true })),
    },
    paymentIntents: {
      create: vi.fn(async (params: { amount: number; currency: string; customer: string }) => ({
        id: `pi_${Math.random().toString(36).slice(2, 10)}`,
        amount: params.amount,
        currency: params.currency,
        customer: params.customer,
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000),
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        amount: 2000,
        currency: 'usd',
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000),
      })),
    },
    subscriptions: {
      create: vi.fn(async (params: { customer: string; items: Array<{ price: string }> }) => ({
        id: `sub_${Math.random().toString(36).slice(2, 10)}`,
        customer: params.customer,
        items: { data: params.items.map((item, i) => ({ id: `si_${i}`, price: { id: item.price } })) },
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        created: Math.floor(Date.now() / 1000),
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        created: Math.floor(Date.now() / 1000),
      })),
      cancel: vi.fn(async (id: string) => ({
        id,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      })),
      list: vi.fn(async () => ({
        data: [],
        has_more: false,
      })),
    },
    transfers: {
      create: vi.fn(async (params: { amount: number; destination: string; currency?: string }) => ({
        id: `tr_${Math.random().toString(36).slice(2, 10)}`,
        amount: params.amount,
        currency: params.currency ?? 'usd',
        destination: params.destination,
        created: Math.floor(Date.now() / 1000),
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        amount: 8500,
        currency: 'usd',
        destination: 'acct_test',
        created: Math.floor(Date.now() / 1000),
      })),
      list: vi.fn(async () => ({
        data: [],
        has_more: false,
      })),
    },
    invoices: {
      create: vi.fn(async (params: { customer: string }) => ({
        id: `in_${Math.random().toString(36).slice(2, 10)}`,
        customer: params.customer,
        amount_due: 0,
        status: 'draft',
        created: Math.floor(Date.now() / 1000),
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        amount_due: 10000,
        status: 'draft',
        created: Math.floor(Date.now() / 1000),
      })),
      finalizeInvoice: vi.fn(async (id: string) => ({
        id,
        status: 'open',
      })),
      pay: vi.fn(async (id: string) => ({
        id,
        status: 'paid',
      })),
      list: vi.fn(async () => ({
        data: [],
        has_more: false,
      })),
    },
    invoiceItems: {
      create: vi.fn(async () => ({
        id: `ii_${Math.random().toString(36).slice(2, 10)}`,
      })),
    },
    webhooks: {
      constructEvent: vi.fn((payload: string, signature: string, secret: string) => {
        return JSON.parse(payload)
      }),
    },
  }
}

/**
 * Mock environment bindings for payments worker
 */
export interface MockPaymentsEnv {
  PAYMENTS_DO: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET?: string
}

/**
 * Create mock environment
 */
export function createMockEnv(options?: { stripeKey?: string; webhookSecret?: string }): MockPaymentsEnv {
  return {
    PAYMENTS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    STRIPE_SECRET_KEY: options?.stripeKey ?? 'sk_test_mock_key',
    STRIPE_WEBHOOK_SECRET: options?.webhookSecret,
  }
}

/**
 * Helper to create a valid stored customer for testing
 */
export function createStoredCustomer(overrides?: Partial<{
  id: string
  stripeId: string
  email: string
  name: string
  createdAt: Date
}>): {
  id: string
  stripeId: string
  email: string
  name?: string
  createdAt: Date
} {
  return {
    id: overrides?.id ?? `cus_${Math.random().toString(36).slice(2, 10)}`,
    stripeId: overrides?.stripeId ?? `cus_stripe_${Math.random().toString(36).slice(2, 10)}`,
    email: overrides?.email ?? 'test@example.com',
    name: overrides?.name,
    createdAt: overrides?.createdAt ?? new Date(),
  }
}

/**
 * Helper to create a valid stored charge for testing
 */
export function createStoredCharge(overrides?: Partial<{
  id: string
  stripeId: string
  amount: number
  currency: string
  customerId: string
  status: 'pending' | 'succeeded' | 'failed'
  createdAt: Date
}>): {
  id: string
  stripeId: string
  amount: number
  currency: string
  customerId: string
  status: 'pending' | 'succeeded' | 'failed'
  createdAt: Date
} {
  return {
    id: overrides?.id ?? `ch_${Math.random().toString(36).slice(2, 10)}`,
    stripeId: overrides?.stripeId ?? `pi_${Math.random().toString(36).slice(2, 10)}`,
    amount: overrides?.amount ?? 2000,
    currency: overrides?.currency ?? 'usd',
    customerId: overrides?.customerId ?? `cus_${Math.random().toString(36).slice(2, 10)}`,
    status: overrides?.status ?? 'succeeded',
    createdAt: overrides?.createdAt ?? new Date(),
  }
}

/**
 * Helper to create a valid stored subscription for testing
 */
export function createStoredSubscription(overrides?: Partial<{
  id: string
  stripeId: string
  customerId: string
  priceId: string
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: Date
}>): {
  id: string
  stripeId: string
  customerId: string
  priceId: string
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: Date
} {
  return {
    id: overrides?.id ?? `sub_${Math.random().toString(36).slice(2, 10)}`,
    stripeId: overrides?.stripeId ?? `sub_stripe_${Math.random().toString(36).slice(2, 10)}`,
    customerId: overrides?.customerId ?? `cus_${Math.random().toString(36).slice(2, 10)}`,
    priceId: overrides?.priceId ?? 'price_pro_monthly',
    status: overrides?.status ?? 'active',
    currentPeriodEnd: overrides?.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }
}

/**
 * Helper to create a valid stored transfer for testing
 */
export function createStoredTransfer(overrides?: Partial<{
  id: string
  stripeId: string
  amount: number
  currency: string
  destination: string
  status: 'pending' | 'paid' | 'failed'
  createdAt: Date
}>): {
  id: string
  stripeId: string
  amount: number
  currency: string
  destination: string
  status: 'pending' | 'paid' | 'failed'
  createdAt: Date
} {
  return {
    id: overrides?.id ?? `tr_${Math.random().toString(36).slice(2, 10)}`,
    stripeId: overrides?.stripeId ?? `tr_stripe_${Math.random().toString(36).slice(2, 10)}`,
    amount: overrides?.amount ?? 8500,
    currency: overrides?.currency ?? 'usd',
    destination: overrides?.destination ?? 'acct_seller',
    status: overrides?.status ?? 'paid',
    createdAt: overrides?.createdAt ?? new Date(),
  }
}

/**
 * Helper to create a valid stored invoice for testing
 */
export function createStoredInvoice(overrides?: Partial<{
  id: string
  stripeId: string
  customerId: string
  amount: number
  status: 'draft' | 'open' | 'paid' | 'void'
  items: Array<{ description: string; amount: number }>
  createdAt: Date
}>): {
  id: string
  stripeId: string
  customerId: string
  amount: number
  status: 'draft' | 'open' | 'paid' | 'void'
  items: Array<{ description: string; amount: number }>
  createdAt: Date
} {
  return {
    id: overrides?.id ?? `in_${Math.random().toString(36).slice(2, 10)}`,
    stripeId: overrides?.stripeId ?? `in_stripe_${Math.random().toString(36).slice(2, 10)}`,
    customerId: overrides?.customerId ?? `cus_${Math.random().toString(36).slice(2, 10)}`,
    amount: overrides?.amount ?? 10000,
    status: overrides?.status ?? 'draft',
    items: overrides?.items ?? [{ description: 'Test item', amount: 10000 }],
    createdAt: overrides?.createdAt ?? new Date(),
  }
}
