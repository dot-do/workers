/**
 * Marketplace Activity Event Collector
 * Track searches, views, and conversions
 */

import type { AnalyticsEvent } from '../types'

export interface MarketplaceSearchData {
  searchQuery: string
  category?: string
  userId?: string
  sessionId: string
}

export interface MarketplaceViewData {
  serviceId: string
  category: string
  userId?: string
  sessionId: string
}

export interface MarketplaceConversionData {
  serviceId: string
  category: string
  orderId: string
  userId?: string
  sessionId: string
}

/**
 * Track marketplace search
 */
export function trackMarketplaceSearch(data: MarketplaceSearchData): AnalyticsEvent {
  return {
    eventType: 'marketplace_search',
    timestamp: Date.now(),
    searchQuery: data.searchQuery,
    category: data.category,
    userId: data.userId,
    sessionId: data.sessionId,
  }
}

/**
 * Track service page view
 */
export function trackMarketplaceView(data: MarketplaceViewData): AnalyticsEvent {
  return {
    eventType: 'marketplace_view',
    timestamp: Date.now(),
    serviceId: data.serviceId,
    category: data.category,
    userId: data.userId,
    sessionId: data.sessionId,
  }
}

/**
 * Track purchase conversion
 */
export function trackMarketplaceConversion(data: MarketplaceConversionData): AnalyticsEvent {
  return {
    eventType: 'marketplace_conversion',
    timestamp: Date.now(),
    serviceId: data.serviceId,
    category: data.category,
    conversion: true,
    metadata: { orderId: data.orderId },
    userId: data.userId,
    sessionId: data.sessionId,
  }
}

/**
 * Example usage in marketplace:
 *
 * // Search event
 * const searchEvent = trackMarketplaceSearch({
 *   searchQuery: 'image generation',
 *   category: 'ai-ml',
 *   sessionId: session.id,
 * })
 * await env.ANALYTICS.track(searchEvent)
 *
 * // View event
 * const viewEvent = trackMarketplaceView({
 *   serviceId: 'service-123',
 *   category: 'ai-ml',
 *   sessionId: session.id,
 * })
 * await env.ANALYTICS.track(viewEvent)
 *
 * // Conversion event
 * const conversionEvent = trackMarketplaceConversion({
 *   serviceId: 'service-123',
 *   category: 'ai-ml',
 *   orderId: 'order-456',
 *   userId: user.id,
 *   sessionId: session.id,
 * })
 * await env.ANALYTICS.track(conversionEvent)
 */
