/**
 * Revenue Event Collector
 * Track GMV, take rate, and creator earnings
 */

import type { AnalyticsEvent } from '../types'

export interface RevenueTransactionData {
  orderId: string
  serviceId: string
  amount: number
  currency?: string
  takeRate: number // percentage (e.g., 15 for 15%)
  creatorId: string
  userId?: string
}

/**
 * Track revenue transaction
 */
export function trackRevenueTransaction(data: RevenueTransactionData): AnalyticsEvent {
  const takeAmount = data.amount * (data.takeRate / 100)
  const creatorAmount = data.amount - takeAmount

  return {
    eventType: 'revenue_transaction',
    timestamp: Date.now(),
    serviceId: data.serviceId,
    orderId: data.orderId,
    revenueAmount: data.amount,
    currency: data.currency || 'USD',
    userId: data.userId,
    metadata: {
      takeAmount,
      creatorAmount,
      creatorId: data.creatorId,
      takeRate: data.takeRate,
    },
  }
}

/**
 * Calculate metrics from revenue events
 */
export function calculateRevenueMetrics(transactions: Array<{ amount: number; takeRate: number }>) {
  const gmv = transactions.reduce((sum, t) => sum + t.amount, 0)
  const platformRevenue = transactions.reduce((sum, t) => sum + t.amount * (t.takeRate / 100), 0)
  const creatorEarnings = gmv - platformRevenue
  const avgTakeRate = transactions.length > 0 ? platformRevenue / gmv * 100 : 0

  return {
    gmv,
    platformRevenue,
    creatorEarnings,
    avgTakeRate,
    transactionCount: transactions.length,
    avgOrderValue: gmv / transactions.length || 0,
  }
}

/**
 * Example usage in payment flow:
 *
 * // After successful payment
 * const event = trackRevenueTransaction({
 *   orderId: 'ord_123',
 *   serviceId: 'service-456',
 *   amount: 100.00,
 *   currency: 'USD',
 *   takeRate: 15, // 15% platform fee
 *   creatorId: 'creator-789',
 *   userId: user.id,
 * })
 * await env.ANALYTICS.track(event)
 *
 * // This tracks:
 * // - GMV: $100.00
 * // - Platform revenue: $15.00
 * // - Creator earnings: $85.00
 */
