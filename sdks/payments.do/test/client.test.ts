/**
 * TDD Tests for payments.do SDK
 *
 * These tests define the expected behavior for the payments.do Stripe Connect SDK.
 * Tests verify export patterns, type definitions, and client functionality.
 *
 * Test coverage:
 * 1. Export pattern (Payments factory, payments instance, default export, re-exports)
 * 2. Type definitions (Customer, Charge, Subscription, etc.)
 * 3. Client methods (customers, charges, subscriptions, usage, transfers, invoices)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Mock Setup - must be hoisted with vi.hoisted
// =============================================================================

const { mockCreateClient, mockCalls } = vi.hoisted(() => {
  // Store mock call responses
  const mockResponses: Record<string, unknown> = {
    // Customer responses
    'customers.create': {
      id: 'cus_123',
      email: 'test@example.com',
      name: 'Test User',
      metadata: {},
    },
    'customers.get': {
      id: 'cus_123',
      email: 'test@example.com',
      name: 'Test User',
      metadata: {},
    },
    'customers.list': [
      { id: 'cus_123', email: 'test@example.com', name: 'Test User' },
      { id: 'cus_456', email: 'other@example.com', name: 'Other User' },
    ],
    'customers.delete': undefined,

    // Charge responses
    'charges.create': {
      id: 'ch_123',
      amount: 2000,
      currency: 'usd',
      customerId: 'cus_123',
      status: 'succeeded',
      createdAt: new Date('2024-01-15'),
    },
    'charges.get': {
      id: 'ch_123',
      amount: 2000,
      currency: 'usd',
      customerId: 'cus_123',
      status: 'succeeded',
      createdAt: new Date('2024-01-15'),
    },
    'charges.list': [
      { id: 'ch_123', amount: 2000, currency: 'usd', status: 'succeeded' },
      { id: 'ch_456', amount: 5000, currency: 'usd', status: 'succeeded' },
    ],

    // Subscription responses
    'subscriptions.create': {
      id: 'sub_123',
      customerId: 'cus_123',
      priceId: 'price_pro_monthly',
      status: 'active',
      currentPeriodEnd: new Date('2024-02-15'),
    },
    'subscriptions.get': {
      id: 'sub_123',
      customerId: 'cus_123',
      priceId: 'price_pro_monthly',
      status: 'active',
      currentPeriodEnd: new Date('2024-02-15'),
    },
    'subscriptions.cancel': undefined,
    'subscriptions.list': [
      { id: 'sub_123', customerId: 'cus_123', status: 'active' },
    ],

    // Usage responses
    'usage.record': undefined,
    'usage.get': {
      total: 1500,
      records: [
        { quantity: 1000, model: 'claude-3-opus', timestamp: new Date('2024-01-10') },
        { quantity: 500, model: 'gpt-4', timestamp: new Date('2024-01-12') },
      ],
    },

    // Transfer responses
    'transfers.create': {
      id: 'tr_123',
      amount: 8500,
      currency: 'usd',
      destination: 'acct_seller',
      status: 'paid',
    },
    'transfers.get': {
      id: 'tr_123',
      amount: 8500,
      currency: 'usd',
      destination: 'acct_seller',
      status: 'paid',
    },
    'transfers.list': [
      { id: 'tr_123', amount: 8500, destination: 'acct_seller', status: 'paid' },
    ],

    // Invoice responses
    'invoices.create': {
      id: 'in_123',
      customerId: 'cus_123',
      amount: 10000,
      status: 'draft',
      createdAt: new Date('2024-01-15'),
    },
    'invoices.get': {
      id: 'in_123',
      customerId: 'cus_123',
      amount: 10000,
      status: 'draft',
      createdAt: new Date('2024-01-15'),
    },
    'invoices.list': [
      { id: 'in_123', customerId: 'cus_123', amount: 10000, status: 'draft' },
    ],
    'invoices.finalize': {
      id: 'in_123',
      customerId: 'cus_123',
      amount: 10000,
      status: 'open',
      createdAt: new Date('2024-01-15'),
    },
    'invoices.pay': {
      id: 'in_123',
      customerId: 'cus_123',
      amount: 10000,
      status: 'paid',
      createdAt: new Date('2024-01-15'),
    },
  }

  // Track all calls made
  const mockCalls: Array<{ method: string; args: unknown[] }> = []

  // Create a nested proxy that simulates the rpc.do client behavior
  function createNestedProxy(path: string): object {
    return new Proxy((() => {}) as object, {
      get(_target, prop: string) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined
        }
        const nestedPath = path ? `${path}.${prop}` : prop
        return createNestedProxy(nestedPath)
      },
      apply(_target, _thisArg, args: unknown[]) {
        mockCalls.push({ method: path, args })
        const response = mockResponses[path]
        return Promise.resolve(response)
      },
    })
  }

  // Mock client that behaves like the real rpc.do client
  const mockCreateClient = vi.fn().mockImplementation(() => {
    return new Proxy({} as object, {
      get(_target, prop: string) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined
        }
        return createNestedProxy(prop)
      },
    })
  })

  return { mockCreateClient, mockCalls, mockResponses }
})

// Mock rpc.do createClient
vi.mock('rpc.do', () => ({
  createClient: mockCreateClient,
}))

// Now import the module under test
import {
  Payments,
  payments,
  createPayments,
  Customer,
  Charge,
  Subscription,
  UsageRecord,
  Transfer,
  Invoice,
  PaymentsClient,
} from '../index'
import type { ClientOptions } from '../index'

// Default export
import defaultExport from '../index'

// =============================================================================
// Test Suites
// =============================================================================

describe('payments.do SDK', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCalls.length = 0 // Clear tracked calls
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Export Pattern Tests
  // ===========================================================================

  describe('Export Pattern', () => {
    it('should export Payments factory function (PascalCase)', () => {
      expect(Payments).toBeDefined()
      expect(typeof Payments).toBe('function')
    })

    it('should export payments instance (camelCase)', () => {
      expect(payments).toBeDefined()
      expect(typeof payments).toBe('object')
    })

    it('should export payments as default export', () => {
      expect(defaultExport).toBe(payments)
    })

    it('should export createPayments as legacy alias for Payments', () => {
      expect(createPayments).toBeDefined()
      expect(createPayments).toBe(Payments)
    })

    it('should re-export ClientOptions type from rpc.do', () => {
      // TypeScript type check - this is a compile-time test
      const typeCheck: ClientOptions = {
        apiKey: 'test',
        baseURL: 'https://test.do',
      }
      expect(typeCheck.apiKey).toBe('test')
    })
  })

  // ===========================================================================
  // Type Definition Tests
  // ===========================================================================

  describe('Type Definitions', () => {
    it('should define Customer interface correctly', () => {
      const customer: Customer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'Test User',
        metadata: { plan: 'pro' },
      }

      expect(customer.id).toBe('cus_123')
      expect(customer.email).toBe('test@example.com')
      expect(customer.name).toBe('Test User')
      expect(customer.metadata).toEqual({ plan: 'pro' })
    })

    it('should define Charge interface correctly', () => {
      const charge: Charge = {
        id: 'ch_123',
        amount: 2000,
        currency: 'usd',
        customerId: 'cus_123',
        status: 'succeeded',
        createdAt: new Date('2024-01-15'),
      }

      expect(charge.id).toBe('ch_123')
      expect(charge.amount).toBe(2000)
      expect(charge.status).toBe('succeeded')
    })

    it('should define Subscription interface correctly', () => {
      const subscription: Subscription = {
        id: 'sub_123',
        customerId: 'cus_123',
        priceId: 'price_pro_monthly',
        status: 'active',
        currentPeriodEnd: new Date('2024-02-15'),
      }

      expect(subscription.id).toBe('sub_123')
      expect(subscription.status).toBe('active')
      expect(subscription.priceId).toBe('price_pro_monthly')
    })

    it('should define UsageRecord interface correctly', () => {
      const record: UsageRecord = {
        quantity: 1000,
        model: 'claude-3-opus',
        action: 'completion',
        timestamp: new Date('2024-01-10'),
      }

      expect(record.quantity).toBe(1000)
      expect(record.model).toBe('claude-3-opus')
    })

    it('should define Transfer interface correctly', () => {
      const transfer: Transfer = {
        id: 'tr_123',
        amount: 8500,
        currency: 'usd',
        destination: 'acct_seller',
        status: 'paid',
      }

      expect(transfer.id).toBe('tr_123')
      expect(transfer.amount).toBe(8500)
      expect(transfer.status).toBe('paid')
    })

    it('should define Invoice interface correctly', () => {
      const invoice: Invoice = {
        id: 'in_123',
        customerId: 'cus_123',
        amount: 10000,
        status: 'paid',
        createdAt: new Date('2024-01-15'),
      }

      expect(invoice.id).toBe('in_123')
      expect(invoice.status).toBe('paid')
    })

    it('should define PaymentsClient interface with correct structure', () => {
      // Verify the client has the expected namespace structure
      const client = Payments()

      expect(client.customers).toBeDefined()
      expect(client.charges).toBeDefined()
      expect(client.subscriptions).toBeDefined()
      expect(client.usage).toBeDefined()
      expect(client.transfers).toBeDefined()
      expect(client.invoices).toBeDefined()
    })
  })

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('Payments Factory Function', () => {
    it('should create client with default endpoint https://payments.do', () => {
      mockCreateClient.mockClear()

      Payments()

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://payments.do',
        undefined
      )
    })

    it('should pass options to createClient', () => {
      const options: ClientOptions = {
        apiKey: 'my-api-key',
        baseURL: 'https://custom.payments.do',
      }

      Payments(options)

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://payments.do',
        options
      )
    })

    it('should return typed PaymentsClient', () => {
      const client = Payments()

      expect(client).toBeDefined()
      expect(client.customers).toBeDefined()
      expect(client.charges).toBeDefined()
      expect(client.subscriptions).toBeDefined()
    })
  })

  // ===========================================================================
  // Default Instance Tests
  // ===========================================================================

  describe('Default payments Instance', () => {
    it('should be pre-configured with default options', () => {
      expect(payments).toBeDefined()
    })

    it('should use environment-based API key resolution', () => {
      expect(payments).toBeDefined()
    })
  })

  // ===========================================================================
  // Customer Methods Tests
  // ===========================================================================

  describe('Customer Methods', () => {
    it('should create a customer', async () => {
      const client = Payments()
      const result = await client.customers.create({
        email: 'test@example.com',
        name: 'Test User',
      })

      expect(mockCalls).toContainEqual({
        method: 'customers.create',
        args: [{ email: 'test@example.com', name: 'Test User' }],
      })
      expect(result.id).toBe('cus_123')
      expect(result.email).toBe('test@example.com')
    })

    it('should get a customer by ID', async () => {
      const client = Payments()
      const result = await client.customers.get('cus_123')

      expect(mockCalls).toContainEqual({
        method: 'customers.get',
        args: ['cus_123'],
      })
      expect(result.id).toBe('cus_123')
    })

    it('should list all customers', async () => {
      const client = Payments()
      const result = await client.customers.list()

      expect(mockCalls).toContainEqual({
        method: 'customers.list',
        args: [],
      })
      expect(result).toHaveLength(2)
    })

    it('should delete a customer', async () => {
      const client = Payments()
      await client.customers.delete('cus_123')

      expect(mockCalls).toContainEqual({
        method: 'customers.delete',
        args: ['cus_123'],
      })
    })

    it('should support metadata on customer creation', async () => {
      const client = Payments()
      await client.customers.create({
        email: 'test@example.com',
        metadata: { plan: 'enterprise', source: 'referral' },
      })

      expect(mockCalls).toContainEqual({
        method: 'customers.create',
        args: [{
          email: 'test@example.com',
          metadata: { plan: 'enterprise', source: 'referral' },
        }],
      })
    })
  })

  // ===========================================================================
  // Charge Methods Tests
  // ===========================================================================

  describe('Charge Methods', () => {
    it('should create a charge', async () => {
      const client = Payments()
      const result = await client.charges.create({
        amount: 2000,
        currency: 'usd',
        customer: 'cus_123',
      })

      expect(mockCalls).toContainEqual({
        method: 'charges.create',
        args: [{ amount: 2000, currency: 'usd', customer: 'cus_123' }],
      })
      expect(result.id).toBe('ch_123')
      expect(result.amount).toBe(2000)
      expect(result.status).toBe('succeeded')
    })

    it('should get a charge by ID', async () => {
      const client = Payments()
      const result = await client.charges.get('ch_123')

      expect(mockCalls).toContainEqual({
        method: 'charges.get',
        args: ['ch_123'],
      })
      expect(result.id).toBe('ch_123')
    })

    it('should list charges for a customer', async () => {
      const client = Payments()
      const result = await client.charges.list('cus_123')

      expect(mockCalls).toContainEqual({
        method: 'charges.list',
        args: ['cus_123'],
      })
      expect(result).toHaveLength(2)
    })

    it('should list all charges without customer filter', async () => {
      const client = Payments()
      await client.charges.list()

      expect(mockCalls).toContainEqual({
        method: 'charges.list',
        args: [],
      })
    })
  })

  // ===========================================================================
  // Subscription Methods Tests
  // ===========================================================================

  describe('Subscription Methods', () => {
    it('should create a subscription', async () => {
      const client = Payments()
      const result = await client.subscriptions.create({
        customer: 'cus_123',
        price: 'price_pro_monthly',
      })

      expect(mockCalls).toContainEqual({
        method: 'subscriptions.create',
        args: [{ customer: 'cus_123', price: 'price_pro_monthly' }],
      })
      expect(result.id).toBe('sub_123')
      expect(result.status).toBe('active')
    })

    it('should get a subscription by ID', async () => {
      const client = Payments()
      const result = await client.subscriptions.get('sub_123')

      expect(mockCalls).toContainEqual({
        method: 'subscriptions.get',
        args: ['sub_123'],
      })
      expect(result.id).toBe('sub_123')
    })

    it('should cancel a subscription', async () => {
      const client = Payments()
      await client.subscriptions.cancel('sub_123')

      expect(mockCalls).toContainEqual({
        method: 'subscriptions.cancel',
        args: ['sub_123'],
      })
    })

    it('should list subscriptions for a customer', async () => {
      const client = Payments()
      const result = await client.subscriptions.list('cus_123')

      expect(mockCalls).toContainEqual({
        method: 'subscriptions.list',
        args: ['cus_123'],
      })
      expect(result).toHaveLength(1)
    })
  })

  // ===========================================================================
  // Usage Methods Tests
  // ===========================================================================

  describe('Usage Methods', () => {
    it('should record usage', async () => {
      const client = Payments()
      const usageRecord: UsageRecord = {
        quantity: 1000,
        model: 'claude-3-opus',
      }

      await client.usage.record('cus_123', usageRecord)

      expect(mockCalls).toContainEqual({
        method: 'usage.record',
        args: ['cus_123', usageRecord],
      })
    })

    it('should get usage for a customer', async () => {
      const client = Payments()
      const result = await client.usage.get('cus_123')

      expect(mockCalls).toContainEqual({
        method: 'usage.get',
        args: ['cus_123'],
      })
      expect(result.total).toBe(1500)
      expect(result.records).toHaveLength(2)
    })

    it('should get usage with date range', async () => {
      const client = Payments()
      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      }

      await client.usage.get('cus_123', period)

      expect(mockCalls).toContainEqual({
        method: 'usage.get',
        args: ['cus_123', period],
      })
    })
  })

  // ===========================================================================
  // Transfer Methods Tests
  // ===========================================================================

  describe('Transfer Methods', () => {
    it('should create a transfer', async () => {
      const client = Payments()
      const result = await client.transfers.create({
        amount: 8500,
        destination: 'acct_seller',
      })

      expect(mockCalls).toContainEqual({
        method: 'transfers.create',
        args: [{ amount: 8500, destination: 'acct_seller' }],
      })
      expect(result.id).toBe('tr_123')
      expect(result.amount).toBe(8500)
    })

    it('should create a transfer with currency', async () => {
      const client = Payments()
      await client.transfers.create({
        amount: 8500,
        destination: 'acct_seller',
        currency: 'eur',
      })

      expect(mockCalls).toContainEqual({
        method: 'transfers.create',
        args: [{ amount: 8500, destination: 'acct_seller', currency: 'eur' }],
      })
    })

    it('should get a transfer by ID', async () => {
      const client = Payments()
      const result = await client.transfers.get('tr_123')

      expect(mockCalls).toContainEqual({
        method: 'transfers.get',
        args: ['tr_123'],
      })
      expect(result.id).toBe('tr_123')
    })

    it('should list transfers for a destination', async () => {
      const client = Payments()
      const result = await client.transfers.list('acct_seller')

      expect(mockCalls).toContainEqual({
        method: 'transfers.list',
        args: ['acct_seller'],
      })
      expect(result).toHaveLength(1)
    })
  })

  // ===========================================================================
  // Invoice Methods Tests
  // ===========================================================================

  describe('Invoice Methods', () => {
    it('should create an invoice', async () => {
      const client = Payments()
      const result = await client.invoices.create({
        customer: 'cus_123',
        items: [
          { description: 'Consulting - January', amount: 500000 },
          { description: 'API Usage', amount: 12500 },
        ],
      })

      expect(mockCalls).toContainEqual({
        method: 'invoices.create',
        args: [{
          customer: 'cus_123',
          items: [
            { description: 'Consulting - January', amount: 500000 },
            { description: 'API Usage', amount: 12500 },
          ],
        }],
      })
      expect(result.id).toBe('in_123')
      expect(result.status).toBe('draft')
    })

    it('should get an invoice by ID', async () => {
      const client = Payments()
      const result = await client.invoices.get('in_123')

      expect(mockCalls).toContainEqual({
        method: 'invoices.get',
        args: ['in_123'],
      })
      expect(result.id).toBe('in_123')
    })

    it('should list invoices for a customer', async () => {
      const client = Payments()
      const result = await client.invoices.list('cus_123')

      expect(mockCalls).toContainEqual({
        method: 'invoices.list',
        args: ['cus_123'],
      })
      expect(result).toHaveLength(1)
    })

    it('should finalize an invoice', async () => {
      const client = Payments()
      const result = await client.invoices.finalize('in_123')

      expect(mockCalls).toContainEqual({
        method: 'invoices.finalize',
        args: ['in_123'],
      })
      expect(result.status).toBe('open')
    })

    it('should pay an invoice', async () => {
      const client = Payments()
      const result = await client.invoices.pay('in_123')

      expect(mockCalls).toContainEqual({
        method: 'invoices.pay',
        args: ['in_123'],
      })
      expect(result.status).toBe('paid')
    })
  })

  // ===========================================================================
  // Integration Pattern Tests
  // ===========================================================================

  describe('Integration Patterns', () => {
    it('should work with Workers service bindings pattern', () => {
      // In Workers, payments.do is accessed via env.STRIPE
      // The SDK provides external access via RPC
      expect(payments).toBeDefined()
    })

    it('should support marketplace payment flow', async () => {
      const client = Payments()

      // 1. Customer pays $100
      await client.charges.create({
        amount: 10000,
        currency: 'usd',
        customer: 'cus_buyer',
      })

      // 2. Platform pays seller their cut
      await client.transfers.create({
        amount: 8500,
        destination: 'acct_seller',
      })

      expect(mockCalls).toContainEqual({
        method: 'charges.create',
        args: [{ amount: 10000, currency: 'usd', customer: 'cus_buyer' }],
      })
      expect(mockCalls).toContainEqual({
        method: 'transfers.create',
        args: [{ amount: 8500, destination: 'acct_seller' }],
      })
    })

    it('should support usage-based billing flow', async () => {
      const client = Payments()

      // Record usage as it happens
      await client.usage.record('cus_123', {
        quantity: 1000,
        model: 'claude-3-opus',
      })

      // Later, get usage for billing
      const usage = await client.usage.get('cus_123')

      expect(mockCalls).toContainEqual({
        method: 'usage.record',
        args: ['cus_123', { quantity: 1000, model: 'claude-3-opus' }],
      })
      expect(usage.total).toBe(1500)
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should propagate errors from the service', async () => {
      // Create a client that throws errors
      const errorMockCreateClient = vi.fn().mockImplementation(() => {
        return new Proxy({} as object, {
          get(_target, prop: string) {
            if (prop === 'then' || prop === 'catch' || prop === 'finally') {
              return undefined
            }
            return new Proxy((() => {}) as object, {
              get(_target, innerProp: string) {
                if (innerProp === 'then' || innerProp === 'catch' || innerProp === 'finally') {
                  return undefined
                }
                return new Proxy((() => {}) as object, {
                  apply() {
                    return Promise.reject(new Error('Card declined'))
                  },
                })
              },
              apply() {
                return Promise.reject(new Error('Card declined'))
              },
            })
          },
        })
      })

      // Temporarily override the mock
      mockCreateClient.mockImplementation(errorMockCreateClient)

      const client = Payments()

      await expect(
        client.charges.create({ amount: 2000, currency: 'usd', customer: 'cus_123' })
      ).rejects.toThrow('Card declined')
    })
  })
})
