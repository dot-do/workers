/**
 * payments.do - Stripe Connect Platform SDK
 *
 * @example
 * ```typescript
 * import { payments } from 'payments.do'
 *
 * // Create charge
 * await payments.charges.create({ amount: 2000, currency: 'usd', customer: 'cus_123' })
 *
 * // Record usage (for metered billing)
 * await payments.usage.record('cus_123', { quantity: 1000, model: 'claude-3-opus' })
 *
 * // Marketplace payout
 * await payments.transfers.create({ amount: 1000, destination: 'acct_seller' })
 * ```
 */

import { createClient, type ClientOptions } from '@dotdo/rpc-client'

// Types
export interface Customer {
  id: string
  email: string
  name?: string
  metadata?: Record<string, string>
}

export interface Charge {
  id: string
  amount: number
  currency: string
  customerId: string
  status: 'pending' | 'succeeded' | 'failed'
  createdAt: Date
}

export interface Subscription {
  id: string
  customerId: string
  priceId: string
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: Date
}

export interface UsageRecord {
  quantity: number
  timestamp?: Date
  model?: string
  action?: string
}

export interface Transfer {
  id: string
  amount: number
  currency: string
  destination: string
  status: 'pending' | 'paid' | 'failed'
}

export interface Invoice {
  id: string
  customerId: string
  amount: number
  status: 'draft' | 'open' | 'paid' | 'void'
  createdAt: Date
}

// Client interface
export interface PaymentsClient {
  customers: {
    create(customer: { email: string; name?: string; metadata?: Record<string, string> }): Promise<Customer>
    get(customerId: string): Promise<Customer>
    list(): Promise<Customer[]>
    delete(customerId: string): Promise<void>
  }

  charges: {
    create(charge: { amount: number; currency: string; customer: string }): Promise<Charge>
    get(chargeId: string): Promise<Charge>
    list(customerId?: string): Promise<Charge[]>
  }

  subscriptions: {
    create(sub: { customer: string; price: string }): Promise<Subscription>
    get(subId: string): Promise<Subscription>
    cancel(subId: string): Promise<void>
    list(customerId?: string): Promise<Subscription[]>
  }

  usage: {
    record(customerId: string, usage: UsageRecord): Promise<void>
    get(customerId: string, period?: { start: Date; end: Date }): Promise<{ total: number; records: UsageRecord[] }>
  }

  transfers: {
    create(transfer: { amount: number; destination: string; currency?: string }): Promise<Transfer>
    get(transferId: string): Promise<Transfer>
    list(destination?: string): Promise<Transfer[]>
  }

  invoices: {
    create(invoice: { customer: string; items: Array<{ description: string; amount: number }> }): Promise<Invoice>
    get(invoiceId: string): Promise<Invoice>
    list(customerId?: string): Promise<Invoice[]>
    finalize(invoiceId: string): Promise<Invoice>
    pay(invoiceId: string): Promise<Invoice>
  }
}

export function createPayments(options?: ClientOptions): PaymentsClient {
  return createClient<PaymentsClient>('https://payments.do', options)
}

export const payments: PaymentsClient = createPayments({
  apiKey: typeof process !== 'undefined' ? process.env?.PAYMENTS_API_KEY : undefined,
})

export type { ClientOptions } from '@dotdo/rpc-client'
