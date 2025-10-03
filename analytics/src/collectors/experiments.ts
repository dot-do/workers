/**
 * Experiment Event Collector
 * Track A/B test views and conversions
 */

import type { AnalyticsEvent } from '../types'

export interface ExperimentViewData {
  experimentId: string
  variantIndex: number
  sessionId: string
  userId?: string
}

export interface ExperimentConversionData {
  experimentId: string
  variantIndex: number
  sessionId: string
  userId?: string
}

/**
 * Track experiment view
 */
export function trackExperimentView(data: ExperimentViewData): AnalyticsEvent {
  return {
    eventType: 'experiment_view',
    timestamp: Date.now(),
    experimentId: data.experimentId,
    variantIndex: data.variantIndex,
    sessionId: data.sessionId,
    userId: data.userId,
  }
}

/**
 * Track experiment conversion
 */
export function trackExperimentConversion(data: ExperimentConversionData): AnalyticsEvent {
  return {
    eventType: 'experiment_conversion',
    timestamp: Date.now(),
    experimentId: data.experimentId,
    variantIndex: data.variantIndex,
    conversion: true,
    sessionId: data.sessionId,
    userId: data.userId,
  }
}

/**
 * Calculate statistical confidence (simplified chi-square)
 */
export function calculateConfidence(variants: Array<{ views: number; conversions: number }>): number {
  if (variants.length < 2) return 0

  const [control, ...treatments] = variants

  // Need minimum sample size
  if (control.views < 100) return 0

  const controlRate = control.views > 0 ? control.conversions / control.views : 0
  const maxTreatmentRate = Math.max(...treatments.map((v) => (v.views > 0 ? v.conversions / v.views : 0)))

  const lift = controlRate > 0 ? (maxTreatmentRate - controlRate) / controlRate : 0
  if (lift < 0.05) return 0 // Less than 5% improvement

  // Simplified confidence score
  const sampleFactor = Math.min(control.views / 1000, 1)
  const liftFactor = Math.min(lift, 0.5) / 0.5

  return Math.round(sampleFactor * liftFactor * 100)
}

/**
 * Example usage in experiment system:
 *
 * // On variant assignment
 * const viewEvent = trackExperimentView({
 *   experimentId: 'pricing-test',
 *   variantIndex: 1, // Variant B
 *   sessionId: session.id,
 * })
 * await env.ANALYTICS.track(viewEvent)
 *
 * // On goal completion (e.g., purchase)
 * const conversionEvent = trackExperimentConversion({
 *   experimentId: 'pricing-test',
 *   variantIndex: 1,
 *   sessionId: session.id,
 *   userId: user.id,
 * })
 * await env.ANALYTICS.track(conversionEvent)
 */
