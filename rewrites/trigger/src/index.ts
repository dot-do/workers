/**
 * trigger.do - Trigger.dev on Cloudflare
 *
 * Background jobs with great DX, unlimited execution time, and AI-native integration.
 */

export { task, schedules, trigger } from './core'
export type {
  TaskConfig,
  TaskHandle,
  TaskResult,
  RetryPolicy,
  ScheduleConfig,
  TriggerConfig
} from './types'
