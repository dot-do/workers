/**
 * Analytics Manager for Cloudflare Analytics Engine
 */

import type { AnalyticsEvent } from './types'

/**
 * AnalyticsManager tracks flag evaluations
 */
export class AnalyticsManager {
  private analytics?: AnalyticsEngineDataset
  private enabled: boolean

  constructor(analytics?: AnalyticsEngineDataset, enabled: boolean = true) {
    this.analytics = analytics
    this.enabled = enabled
  }

  /**
   * Track analytics event
   */
  track(event: AnalyticsEvent): void {
    if (!this.enabled || !this.analytics) return

    try {
      // Write to Analytics Engine
      this.analytics.writeDataPoint({
        blobs: [
          event.flagKey,
          event.targetingKey || 'anonymous',
          event.variant || 'default',
          event.reason || 'UNKNOWN',
          event.error || '',
        ],
        doubles: [event.evaluationTimeMs, event.cacheHit ? 1 : 0],
        indexes: [event.flagKey],
      })
    } catch (error) {
      // Analytics errors should not break evaluation
      console.error('Analytics error:', error)
    }
  }

  /**
   * Track multiple events in batch
   */
  trackBatch(events: AnalyticsEvent[]): void {
    if (!this.enabled || !this.analytics) return

    try {
      for (const event of events) {
        this.track(event)
      }
    } catch (error) {
      console.error('Batch analytics error:', error)
    }
  }
}
