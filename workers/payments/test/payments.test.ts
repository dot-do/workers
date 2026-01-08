/**
 * Unit tests for PaymentsDO
 *
 * Tests the Stripe Connect Platform implementation for payments.do
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockStripe,
  createStoredCustomer,
  createStoredCharge,
  createStoredSubscription,
  createStoredTransfer,
  createStoredInvoice,
  type MockStripe,
} from './helpers.js'

// Mock Stripe SDK
const mockStripe = createMockStripe()
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => mockStripe),
  }
})

// Import after mocking
import { PaymentsDO } from '../src/payments.js'

describe('PaymentsDO', () => {
  let payments: PaymentsDO
  let mockState: ReturnType<typeof createMockState>
  let mockEnv: ReturnType<typeof createMockEnv>

  beforeEach(() => {
    vi.clearAllMocks()
    mockState = createMockState()
    mockEnv = createMockEnv()
    payments = new PaymentsDO(mockState as any, mockEnv)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Customer Tests
  // ===========================================================================

  describe('customers', () => {
    describe('create', () => {
      it('should create a customer with email', async () => {
        const result = await payments.customers.create({
          email: 'test@example.com',
        })

        expect(result).toBeDefined()
        expect(result.id).toMatch(/^cus_/)
        expect(result.email).toBe('test@example.com')
        expect(result.createdAt).toBeInstanceOf(Date)
        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: undefined,
          description: undefined,
          metadata: undefined,
        })
      })

      it('should create a customer with name and metadata', async () => {
        const result = await payments.customers.create({
          email: 'test@example.com',
          name: 'Test User',
          metadata: { plan: 'pro' },
        })

        expect(result.name).toBe('Test User')
        expect(result.metadata).toEqual({ plan: 'pro' })
      })

      it('should throw on missing email', async () => {
        await expect(
          payments.customers.create({ email: '' })
        ).rejects.toThrow('Invalid email')
      })
    })

    describe('get', () => {
      it('should return null for non-existent customer', async () => {
        const result = await payments.customers.get('cus_nonexistent')
        expect(result).toBeNull()
      })

      it('should return customer if exists', async () => {
        const stored = createStoredCustomer({ id: 'cus_123', email: 'stored@example.com' })
        await mockState.storage.put(`customer:cus_123`, stored)

        const result = await payments.customers.get('cus_123')
        expect(result).not.toBeNull()
        expect(result!.id).toBe('cus_123')
        expect(result!.email).toBe('stored@example.com')
      })
    })

    describe('list', () => {
      it('should return empty array when no customers', async () => {
        const result = await payments.customers.list()
        expect(result).toEqual([])
      })

      it('should return all customers sorted by createdAt', async () => {
        const customer1 = createStoredCustomer({
          id: 'cus_1',
          email: 'a@example.com',
          createdAt: new Date('2024-01-01'),
        })
        const customer2 = createStoredCustomer({
          id: 'cus_2',
          email: 'b@example.com',
          createdAt: new Date('2024-01-02'),
        })

        await mockState.storage.put(`customer:cus_1`, customer1)
        await mockState.storage.put(`customer:cus_2`, customer2)

        const result = await payments.customers.list()
        expect(result).toHaveLength(2)
        // Most recent first
        expect(result[0].id).toBe('cus_2')
        expect(result[1].id).toBe('cus_1')
      })
    })

    describe('delete', () => {
      it('should throw on non-existent customer', async () => {
        await expect(
          payments.customers.delete('cus_nonexistent')
        ).rejects.toThrow('Customer not found')
      })

      it('should delete existing customer', async () => {
        const stored = createStoredCustomer({ id: 'cus_123', stripeId: 'cus_stripe_123' })
        await mockState.storage.put(`customer:cus_123`, stored)
        await mockState.storage.put(`stripe_customer:cus_stripe_123`, 'cus_123')

        await payments.customers.delete('cus_123')

        expect(mockStripe.customers.del).toHaveBeenCalledWith('cus_stripe_123')
        expect(await mockState.storage.get('customer:cus_123')).toBeUndefined()
      })
    })
  })

  // ===========================================================================
  // Charge Tests
  // ===========================================================================

  describe('charges', () => {
    describe('create', () => {
      it('should create a charge for existing customer', async () => {
        const stored = createStoredCustomer({ id: 'cus_123', stripeId: 'cus_stripe_123' })
        await mockState.storage.put(`customer:cus_123`, stored)

        const result = await payments.charges.create({
          amount: 2000,
          currency: 'usd',
          customer: 'cus_123',
        })

        expect(result).toBeDefined()
        expect(result.id).toMatch(/^ch_/)
        expect(result.amount).toBe(2000)
        expect(result.currency).toBe('usd')
        expect(result.customerId).toBe('cus_123')
        expect(result.status).toBe('succeeded')
        expect(mockStripe.paymentIntents.create).toHaveBeenCalled()
      })

      it('should throw for non-existent customer', async () => {
        await expect(
          payments.charges.create({
            amount: 2000,
            currency: 'usd',
            customer: 'cus_nonexistent',
          })
        ).rejects.toThrow('Customer not found')
      })

      it('should throw for invalid amount', async () => {
        await expect(
          payments.charges.create({
            amount: 0,
            currency: 'usd',
            customer: 'cus_123',
          })
        ).rejects.toThrow('Invalid amount')
      })
    })

    describe('get', () => {
      it('should return null for non-existent charge', async () => {
        const result = await payments.charges.get('ch_nonexistent')
        expect(result).toBeNull()
      })

      it('should return charge if exists', async () => {
        const stored = createStoredCharge({ id: 'ch_123', amount: 5000 })
        await mockState.storage.put(`charge:ch_123`, stored)

        const result = await payments.charges.get('ch_123')
        expect(result).not.toBeNull()
        expect(result!.id).toBe('ch_123')
        expect(result!.amount).toBe(5000)
      })
    })

    describe('list', () => {
      it('should return all charges', async () => {
        const charge1 = createStoredCharge({ id: 'ch_1', customerId: 'cus_1' })
        const charge2 = createStoredCharge({ id: 'ch_2', customerId: 'cus_2' })

        await mockState.storage.put(`charge:ch_1`, charge1)
        await mockState.storage.put(`charge:ch_2`, charge2)

        const result = await payments.charges.list()
        expect(result).toHaveLength(2)
      })

      it('should filter by customer', async () => {
        const charge1 = createStoredCharge({ id: 'ch_1', customerId: 'cus_1' })
        const charge2 = createStoredCharge({ id: 'ch_2', customerId: 'cus_2' })

        await mockState.storage.put(`charge:ch_1`, charge1)
        await mockState.storage.put(`charge:ch_2`, charge2)

        const result = await payments.charges.list('cus_1')
        expect(result).toHaveLength(1)
        expect(result[0].customerId).toBe('cus_1')
      })
    })
  })

  // ===========================================================================
  // Subscription Tests
  // ===========================================================================

  describe('subscriptions', () => {
    describe('create', () => {
      it('should create a subscription for existing customer', async () => {
        const stored = createStoredCustomer({ id: 'cus_123', stripeId: 'cus_stripe_123' })
        await mockState.storage.put(`customer:cus_123`, stored)

        const result = await payments.subscriptions.create({
          customer: 'cus_123',
          price: 'price_pro_monthly',
        })

        expect(result).toBeDefined()
        expect(result.id).toMatch(/^sub_/)
        expect(result.customerId).toBe('cus_123')
        expect(result.priceId).toBe('price_pro_monthly')
        expect(result.status).toBe('active')
        expect(mockStripe.subscriptions.create).toHaveBeenCalled()
      })

      it('should throw for non-existent customer', async () => {
        await expect(
          payments.subscriptions.create({
            customer: 'cus_nonexistent',
            price: 'price_pro_monthly',
          })
        ).rejects.toThrow('Customer not found')
      })
    })

    describe('cancel', () => {
      it('should cancel an existing subscription', async () => {
        const stored = createStoredSubscription({ id: 'sub_123', stripeId: 'sub_stripe_123' })
        await mockState.storage.put(`subscription:sub_123`, stored)

        await payments.subscriptions.cancel('sub_123')

        expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_stripe_123')
        const updated = await mockState.storage.get<any>('subscription:sub_123')
        expect(updated.status).toBe('canceled')
      })

      it('should throw for non-existent subscription', async () => {
        await expect(
          payments.subscriptions.cancel('sub_nonexistent')
        ).rejects.toThrow('Subscription not found')
      })
    })

    describe('list', () => {
      it('should filter by customer', async () => {
        const sub1 = createStoredSubscription({ id: 'sub_1', customerId: 'cus_1' })
        const sub2 = createStoredSubscription({ id: 'sub_2', customerId: 'cus_2' })

        await mockState.storage.put(`subscription:sub_1`, sub1)
        await mockState.storage.put(`subscription:sub_2`, sub2)

        const result = await payments.subscriptions.list('cus_1')
        expect(result).toHaveLength(1)
        expect(result[0].customerId).toBe('cus_1')
      })
    })
  })

  // ===========================================================================
  // Usage Tests
  // ===========================================================================

  describe('usage', () => {
    describe('record', () => {
      it('should record usage for existing customer', async () => {
        const stored = createStoredCustomer({ id: 'cus_123' })
        await mockState.storage.put(`customer:cus_123`, stored)

        await payments.usage.record('cus_123', {
          quantity: 1000,
          model: 'claude-3-opus',
        })

        const usageRecords = await mockState.storage.list<any>({ prefix: 'usage:cus_123:' })
        expect(usageRecords.size).toBe(1)

        const [record] = usageRecords.values()
        expect(record.quantity).toBe(1000)
        expect(record.model).toBe('claude-3-opus')
      })

      it('should throw for non-existent customer', async () => {
        await expect(
          payments.usage.record('cus_nonexistent', { quantity: 1000 })
        ).rejects.toThrow('Customer not found')
      })
    })

    describe('get', () => {
      it('should return usage records and total', async () => {
        const stored = createStoredCustomer({ id: 'cus_123' })
        await mockState.storage.put(`customer:cus_123`, stored)

        await mockState.storage.put('usage:cus_123:usage_1', {
          id: 'usage_1',
          customerId: 'cus_123',
          quantity: 1000,
          timestamp: new Date(),
          model: 'claude-3-opus',
        })
        await mockState.storage.put('usage:cus_123:usage_2', {
          id: 'usage_2',
          customerId: 'cus_123',
          quantity: 500,
          timestamp: new Date(),
          model: 'gpt-4',
        })

        const result = await payments.usage.get('cus_123')
        expect(result.total).toBe(1500)
        expect(result.records).toHaveLength(2)
      })

      it('should filter by date range', async () => {
        const jan1 = new Date('2024-01-01')
        const jan15 = new Date('2024-01-15')
        const feb1 = new Date('2024-02-01')

        await mockState.storage.put('usage:cus_123:usage_1', {
          id: 'usage_1',
          customerId: 'cus_123',
          quantity: 1000,
          timestamp: jan1,
        })
        await mockState.storage.put('usage:cus_123:usage_2', {
          id: 'usage_2',
          customerId: 'cus_123',
          quantity: 500,
          timestamp: feb1,
        })

        const result = await payments.usage.get('cus_123', {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        })
        expect(result.total).toBe(1000)
        expect(result.records).toHaveLength(1)
      })
    })
  })

  // ===========================================================================
  // Transfer Tests
  // ===========================================================================

  describe('transfers', () => {
    describe('create', () => {
      it('should create a transfer', async () => {
        const result = await payments.transfers.create({
          amount: 8500,
          destination: 'acct_seller',
        })

        expect(result).toBeDefined()
        expect(result.id).toMatch(/^tr_/)
        expect(result.amount).toBe(8500)
        expect(result.destination).toBe('acct_seller')
        expect(result.currency).toBe('usd')
        expect(mockStripe.transfers.create).toHaveBeenCalled()
      })

      it('should create a transfer with custom currency', async () => {
        const result = await payments.transfers.create({
          amount: 8500,
          destination: 'acct_seller',
          currency: 'eur',
        })

        expect(result.currency).toBe('eur')
      })

      it('should throw for invalid amount', async () => {
        await expect(
          payments.transfers.create({
            amount: 0,
            destination: 'acct_seller',
          })
        ).rejects.toThrow('Invalid amount')
      })
    })

    describe('list', () => {
      it('should filter by destination', async () => {
        const tr1 = createStoredTransfer({ id: 'tr_1', destination: 'acct_1' })
        const tr2 = createStoredTransfer({ id: 'tr_2', destination: 'acct_2' })

        await mockState.storage.put(`transfer:tr_1`, tr1)
        await mockState.storage.put(`transfer:tr_2`, tr2)

        const result = await payments.transfers.list('acct_1')
        expect(result).toHaveLength(1)
        expect(result[0].destination).toBe('acct_1')
      })
    })
  })

  // ===========================================================================
  // Invoice Tests
  // ===========================================================================

  describe('invoices', () => {
    describe('create', () => {
      it('should create an invoice for existing customer', async () => {
        const stored = createStoredCustomer({ id: 'cus_123', stripeId: 'cus_stripe_123' })
        await mockState.storage.put(`customer:cus_123`, stored)

        const result = await payments.invoices.create({
          customer: 'cus_123',
          items: [
            { description: 'API Usage', amount: 10000 },
          ],
        })

        expect(result).toBeDefined()
        expect(result.id).toMatch(/^in_/)
        expect(result.customerId).toBe('cus_123')
        expect(result.status).toBe('draft')
        expect(mockStripe.invoices.create).toHaveBeenCalled()
        expect(mockStripe.invoiceItems.create).toHaveBeenCalled()
      })

      it('should throw for non-existent customer', async () => {
        await expect(
          payments.invoices.create({
            customer: 'cus_nonexistent',
            items: [{ description: 'Test', amount: 1000 }],
          })
        ).rejects.toThrow('Customer not found')
      })

      it('should throw for empty items', async () => {
        await expect(
          payments.invoices.create({
            customer: 'cus_123',
            items: [],
          })
        ).rejects.toThrow('Invalid items')
      })
    })

    describe('finalize', () => {
      it('should finalize a draft invoice', async () => {
        const stored = createStoredInvoice({ id: 'in_123', status: 'draft', stripeId: 'in_stripe_123' })
        await mockState.storage.put(`invoice:in_123`, stored)

        const result = await payments.invoices.finalize('in_123')

        expect(result.status).toBe('open')
        expect(mockStripe.invoices.finalizeInvoice).toHaveBeenCalledWith('in_stripe_123')
      })

      it('should throw for non-draft invoice', async () => {
        const stored = createStoredInvoice({ id: 'in_123', status: 'open', stripeId: 'in_stripe_123' })
        await mockState.storage.put(`invoice:in_123`, stored)

        await expect(
          payments.invoices.finalize('in_123')
        ).rejects.toThrow('Invoice can only be finalized from draft status')
      })
    })

    describe('pay', () => {
      it('should pay an open invoice', async () => {
        const stored = createStoredInvoice({ id: 'in_123', status: 'open', stripeId: 'in_stripe_123' })
        await mockState.storage.put(`invoice:in_123`, stored)

        const result = await payments.invoices.pay('in_123')

        expect(result.status).toBe('paid')
        expect(result.paidAt).toBeInstanceOf(Date)
        expect(mockStripe.invoices.pay).toHaveBeenCalledWith('in_stripe_123')
      })

      it('should throw for non-open invoice', async () => {
        const stored = createStoredInvoice({ id: 'in_123', status: 'draft', stripeId: 'in_stripe_123' })
        await mockState.storage.put(`invoice:in_123`, stored)

        await expect(
          payments.invoices.pay('in_123')
        ).rejects.toThrow('Invoice must be open to pay')
      })
    })
  })

  // ===========================================================================
  // RPC Interface Tests
  // ===========================================================================

  describe('RPC interface', () => {
    describe('hasMethod', () => {
      it('should return true for allowed methods', () => {
        expect(payments.hasMethod('customers.create')).toBe(true)
        expect(payments.hasMethod('charges.create')).toBe(true)
        expect(payments.hasMethod('subscriptions.create')).toBe(true)
        expect(payments.hasMethod('usage.record')).toBe(true)
        expect(payments.hasMethod('transfers.create')).toBe(true)
        expect(payments.hasMethod('invoices.create')).toBe(true)
      })

      it('should return false for disallowed methods', () => {
        expect(payments.hasMethod('__proto__')).toBe(false)
        expect(payments.hasMethod('constructor')).toBe(false)
        expect(payments.hasMethod('unknown.method')).toBe(false)
      })
    })

    describe('invoke', () => {
      it('should invoke customer methods', async () => {
        const result = await payments.invoke('customers.create', [{ email: 'test@example.com' }])
        expect(result).toBeDefined()
        expect((result as any).email).toBe('test@example.com')
      })

      it('should throw for disallowed methods', async () => {
        await expect(
          payments.invoke('unknown.method', [])
        ).rejects.toThrow('Method not allowed')
      })
    })
  })

  // ===========================================================================
  // HTTP Handler Tests
  // ===========================================================================

  describe('HTTP fetch handler', () => {
    describe('GET /', () => {
      it('should return API discovery', async () => {
        const request = new Request('https://payments.do/')
        const response = await payments.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as any
        expect(body.api).toBe('payments.do')
        expect(body.links).toBeDefined()
        expect(body.discover).toBeDefined()
      })
    })

    describe('POST /rpc', () => {
      it('should handle valid RPC request', async () => {
        const stored = createStoredCustomer({ id: 'cus_123', email: 'test@example.com' })
        await mockState.storage.put(`customer:cus_123`, stored)

        const request = new Request('https://payments.do/rpc', {
          method: 'POST',
          body: JSON.stringify({
            method: 'customers.get',
            params: ['cus_123'],
          }),
        })

        const response = await payments.fetch(request)
        expect(response.status).toBe(200)

        const body = await response.json() as any
        expect(body.result).toBeDefined()
        expect(body.result.id).toBe('cus_123')
      })

      it('should return 400 for invalid method', async () => {
        const request = new Request('https://payments.do/rpc', {
          method: 'POST',
          body: JSON.stringify({
            method: 'invalid.method',
            params: [],
          }),
        })

        const response = await payments.fetch(request)
        expect(response.status).toBe(400)
      })
    })

    describe('REST API /api/customers', () => {
      it('should list customers on GET /api/customers', async () => {
        const request = new Request('https://payments.do/api/customers')
        const response = await payments.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as any
        expect(Array.isArray(body)).toBe(true)
      })

      it('should create customer on POST /api/customers', async () => {
        const request = new Request('https://payments.do/api/customers', {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })

        const response = await payments.fetch(request)
        expect(response.status).toBe(201)

        const body = await response.json() as any
        expect(body.id).toMatch(/^cus_/)
        expect(body.email).toBe('test@example.com')
      })

      it('should get customer on GET /api/customers/:id', async () => {
        const stored = createStoredCustomer({ id: 'cus_123', email: 'test@example.com' })
        await mockState.storage.put(`customer:cus_123`, stored)

        const request = new Request('https://payments.do/api/customers/cus_123')
        const response = await payments.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as any
        expect(body.id).toBe('cus_123')
      })

      it('should return 404 for non-existent customer', async () => {
        const request = new Request('https://payments.do/api/customers/cus_nonexistent')
        const response = await payments.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('rate limiting', () => {
      it('should rate limit excessive requests', async () => {
        // Make 101 requests (exceeds 100 limit)
        for (let i = 0; i < 100; i++) {
          await payments.fetch(new Request('https://payments.do/'))
        }

        const response = await payments.fetch(new Request('https://payments.do/'))
        expect(response.status).toBe(429)
      })
    })
  })

  // ===========================================================================
  // Integration Pattern Tests
  // ===========================================================================

  describe('integration patterns', () => {
    it('should support marketplace payment flow', async () => {
      // 1. Create buyer
      const buyer = await payments.customers.create({ email: 'buyer@example.com' })

      // 2. Create charge
      const charge = await payments.charges.create({
        amount: 10000,
        currency: 'usd',
        customer: buyer.id,
      })
      expect(charge.status).toBe('succeeded')

      // 3. Create transfer to seller
      const transfer = await payments.transfers.create({
        amount: 8500,
        destination: 'acct_seller',
      })
      expect(transfer.status).toBe('paid')
    })

    it('should support usage-based billing flow', async () => {
      // 1. Create customer
      const customer = await payments.customers.create({ email: 'user@example.com' })

      // 2. Record usage over time
      await payments.usage.record(customer.id, { quantity: 1000, model: 'claude-3-opus' })
      await payments.usage.record(customer.id, { quantity: 500, model: 'gpt-4' })

      // 3. Get usage totals
      const usage = await payments.usage.get(customer.id)
      expect(usage.total).toBe(1500)
      expect(usage.records).toHaveLength(2)
    })

    it('should support subscription billing flow', async () => {
      // 1. Create customer
      const customer = await payments.customers.create({ email: 'subscriber@example.com' })

      // 2. Create subscription
      const subscription = await payments.subscriptions.create({
        customer: customer.id,
        price: 'price_pro_monthly',
      })
      expect(subscription.status).toBe('active')

      // 3. Cancel subscription
      await payments.subscriptions.cancel(subscription.id)
      const updated = await payments.subscriptions.get(subscription.id)
      expect(updated?.status).toBe('canceled')
    })

    it('should support invoice billing flow', async () => {
      // 1. Create customer
      const customer = await payments.customers.create({ email: 'invoiced@example.com' })

      // 2. Create invoice
      const invoice = await payments.invoices.create({
        customer: customer.id,
        items: [
          { description: 'Consulting - January', amount: 500000 },
          { description: 'API Usage', amount: 12500 },
        ],
      })
      expect(invoice.status).toBe('draft')

      // 3. Finalize invoice
      const finalized = await payments.invoices.finalize(invoice.id)
      expect(finalized.status).toBe('open')

      // 4. Pay invoice
      const paid = await payments.invoices.pay(invoice.id)
      expect(paid.status).toBe('paid')
      expect(paid.paidAt).toBeDefined()
    })
  })
})
