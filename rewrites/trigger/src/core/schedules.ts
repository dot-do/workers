/**
 * Scheduled task definitions
 */

import type { ScheduleConfig, ScheduledTask, TaskHandle } from '../types'

/**
 * Schedule utilities for cron-based tasks
 */
export const schedules = {
  /**
   * Define a scheduled task
   *
   * @example
   * ```typescript
   * export const dailyCleanup = schedules.task({
   *   id: 'daily-cleanup',
   *   cron: '0 3 * * *', // 3am daily
   *   run: async () => {
   *     await cleanupOldFiles()
   *   }
   * })
   * ```
   */
  task<TResult>(config: ScheduleConfig<TResult>): ScheduledTask<TResult> {
    // TODO: Register with SchedulerDO

    return {
      id: config.id,
      cron: config.cron,

      async trigger(): Promise<TaskHandle<TResult>> {
        // TODO: Manually trigger the scheduled task
        const runId = crypto.randomUUID()

        return {
          id: runId,

          async status() {
            return { state: 'pending' }
          },

          async result(): Promise<TResult> {
            throw new Error('Not implemented')
          },

          async *logs() {},

          async cancel() {}
        }
      }
    }
  }
}
