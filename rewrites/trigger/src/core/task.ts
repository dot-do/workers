/**
 * Task definition and registration
 */

import type { TaskConfig, Task, TaskHandle, TaskResult, TaskContext } from '../types'

/**
 * Define a background task
 *
 * @example
 * ```typescript
 * export const processVideo = task({
 *   id: 'process-video',
 *   retry: { maxAttempts: 3, backoff: 'exponential' },
 *   run: async (payload: { videoId: string }) => {
 *     const video = await downloadVideo(payload.videoId)
 *     return { url: video.url }
 *   }
 * })
 * ```
 */
export function task<TPayload, TResult>(
  config: TaskConfig<TPayload, TResult>
): Task<TPayload, TResult> {
  // TODO: Implement task registration with TaskDO

  return {
    id: config.id,

    async triggerAndWait(payload: TPayload): Promise<TaskResult<TResult>> {
      const handle = await this.trigger(payload)
      const data = await handle.result()
      return {
        runId: handle.id,
        data,
        durationMs: 0, // TODO: Calculate from handle
        retryCount: 0
      }
    },

    async trigger(payload: TPayload): Promise<TaskHandle<TResult>> {
      // TODO: Dispatch to RunDO via Queue
      const runId = crypto.randomUUID()

      return {
        id: runId,

        async status() {
          // TODO: Query RunDO for status
          return { state: 'pending' }
        },

        async result(): Promise<TResult> {
          // TODO: Wait for RunDO completion
          throw new Error('Not implemented')
        },

        async *logs() {
          // TODO: Stream logs via WebSocket
        },

        async cancel() {
          // TODO: Send cancel to RunDO
        }
      }
    }
  }
}
