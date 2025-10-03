/**
 * Schedule Service Utilities
 */

import { CronExpressionParser } from 'cron-parser'

/**
 * Parse cron expression and get next execution time
 */
export function getNextRun(cronExpression: string): Date {
  try {
    // Handle named schedules
    const schedule = normalizeSchedule(cronExpression)
    const interval = CronExpressionParser.parse(schedule)
    return interval.next().toDate()
  } catch (error) {
    throw new Error(`Invalid cron expression: ${cronExpression}`)
  }
}

/**
 * Normalize schedule expressions to standard cron format
 */
export function normalizeSchedule(schedule: string): string {
  // Named schedules
  const namedSchedules: Record<string, string> = {
    '@hourly': '0 * * * *',
    '@daily': '0 0 * * *',
    '@weekly': '0 0 * * 0',
    '@monthly': '0 0 1 * *',
    '@yearly': '0 0 1 1 *',
    '@annually': '0 0 1 1 *',
  }

  if (namedSchedules[schedule]) {
    return namedSchedules[schedule]
  }

  // Custom intervals (e.g., "every 5 minutes")
  const intervalMatch = schedule.match(/^every (\d+) (minute|hour|day|week)s?$/i)
  if (intervalMatch) {
    const [, amount, unit] = intervalMatch
    const num = parseInt(amount)

    switch (unit.toLowerCase()) {
      case 'minute':
        return `*/${num} * * * *`
      case 'hour':
        return `0 */${num} * * *`
      case 'day':
        return `0 0 */${num} * *`
      case 'week':
        return `0 0 * * ${num % 7}`
      default:
        throw new Error(`Invalid interval unit: ${unit}`)
    }
  }

  // Already a valid cron expression
  return schedule
}

/**
 * Check if a task should run based on its schedule
 */
export function shouldRun(cronExpression: string, lastRun?: string): boolean {
  try {
    const schedule = normalizeSchedule(cronExpression)
    const interval = CronExpressionParser.parse(schedule)
    const nextRun = interval.next().toDate()

    if (!lastRun) {
      return true // Never run before
    }

    const lastRunDate = new Date(lastRun)
    const now = new Date()

    // Task should run if next scheduled time is in the past
    return nextRun <= now && lastRunDate < nextRun
  } catch (error) {
    console.error(`Error checking schedule: ${error}`)
    return false
  }
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(taskName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `exec_${taskName}_${timestamp}_${random}`
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`
  return `${(ms / 3600000).toFixed(2)}h`
}

/**
 * Validate cron expression
 */
export function isValidCron(expression: string): boolean {
  try {
    const schedule = normalizeSchedule(expression)
    CronExpressionParser.parse(schedule)
    return true
  } catch {
    return false
  }
}
