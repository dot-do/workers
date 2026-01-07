/**
 * Event trigger definitions
 */

import type { TriggerConfig, EventTrigger, TaskHandle } from '../types'

/**
 * Define an event trigger
 *
 * @example
 * ```typescript
 * export const onGitHubPush = trigger({
 *   id: 'github-push',
 *   source: 'github',
 *   event: 'push',
 *   run: async (event) => {
 *     await runTests(event.repository, event.ref)
 *   }
 * })
 * ```
 */
export function trigger<TEvent, TResult>(
  config: TriggerConfig<TEvent, TResult>
): EventTrigger<TEvent, TResult> {
  // TODO: Register with EventDO

  return {
    id: config.id,
    event: config.event,

    async invoke(event: TEvent): Promise<TaskHandle<TResult>> {
      // TODO: Dispatch to RunDO
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
