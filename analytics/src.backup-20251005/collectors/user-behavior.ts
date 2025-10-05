/**
 * User Behavior Event Collector
 * Track sessions, retention, and churn
 */

import type { AnalyticsEvent } from '../types'

export interface UserSessionData {
  userId: string
  sessionId: string
  duration?: number
  cohort?: string
}

export interface UserActionData {
  userId: string
  sessionId: string
  action: string
  category?: string
  metadata?: Record<string, any>
}

/**
 * Track user session
 */
export function trackUserSession(data: UserSessionData): AnalyticsEvent {
  return {
    eventType: 'user_session',
    timestamp: Date.now(),
    userId: data.userId,
    sessionId: data.sessionId,
    cohort: data.cohort,
    metadata: {
      duration: data.duration,
    },
  }
}

/**
 * Track user action
 */
export function trackUserAction(data: UserActionData): AnalyticsEvent {
  return {
    eventType: 'user_action',
    timestamp: Date.now(),
    userId: data.userId,
    sessionId: data.sessionId,
    category: data.category,
    metadata: {
      action: data.action,
      ...data.metadata,
    },
  }
}

/**
 * Calculate retention cohorts
 */
export function calculateRetention(userSessions: Map<string, number[]>): { day1: number; day7: number; day30: number } {
  const cohorts = { day1: 0, day7: 0, day30: 0 }
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  for (const [userId, timestamps] of userSessions.entries()) {
    if (timestamps.length === 0) continue

    const firstSession = Math.min(...timestamps)
    const daysSinceFirst = (now - firstSession) / DAY_MS

    // Check if user returned within timeframes
    const returnedDay1 = timestamps.some((t) => t - firstSession >= DAY_MS && t - firstSession < 2 * DAY_MS)
    const returnedDay7 = timestamps.some((t) => t - firstSession >= 7 * DAY_MS && t - firstSession < 8 * DAY_MS)
    const returnedDay30 = timestamps.some((t) => t - firstSession >= 30 * DAY_MS && t - firstSession < 31 * DAY_MS)

    if (daysSinceFirst >= 1 && returnedDay1) cohorts.day1++
    if (daysSinceFirst >= 7 && returnedDay7) cohorts.day7++
    if (daysSinceFirst >= 30 && returnedDay30) cohorts.day30++
  }

  const totalUsers = userSessions.size
  return {
    day1: totalUsers > 0 ? (cohorts.day1 / totalUsers) * 100 : 0,
    day7: totalUsers > 0 ? (cohorts.day7 / totalUsers) * 100 : 0,
    day30: totalUsers > 0 ? (cohorts.day30 / totalUsers) * 100 : 0,
  }
}

/**
 * Example usage:
 *
 * // Track session start
 * const sessionEvent = trackUserSession({
 *   userId: user.id,
 *   sessionId: generateSessionId(),
 *   cohort: '2025-10', // Month of user signup
 * })
 * await env.ANALYTICS.track(sessionEvent)
 *
 * // Track session end (with duration)
 * const sessionEndEvent = trackUserSession({
 *   userId: user.id,
 *   sessionId: session.id,
 *   duration: Date.now() - session.startTime,
 * })
 * await env.ANALYTICS.track(sessionEndEvent)
 *
 * // Track specific user action
 * const actionEvent = trackUserAction({
 *   userId: user.id,
 *   sessionId: session.id,
 *   action: 'service_favorited',
 *   category: 'engagement',
 *   metadata: { serviceId: 'service-123' },
 * })
 * await env.ANALYTICS.track(actionEvent)
 */
