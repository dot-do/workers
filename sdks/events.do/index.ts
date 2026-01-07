/**
 * events.do - Event-Driven Architecture SDK
 *
 * @example
 * ```typescript
 * import { events } from 'events.do'
 *
 * // Publish event
 * await events.publish('user.created', { userId: 'user_123', email: 'alice@example.com' })
 *
 * // Subscribe to events
 * await events.subscribe('user.*', 'https://my-worker.workers.do/webhook')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Event {
  id: string
  type: string
  data: Record<string, unknown>
  source?: string
  timestamp: Date
}

export interface Subscription {
  id: string
  pattern: string
  target: string
  status: 'active' | 'paused'
  createdAt: Date
}

export interface EventStream {
  events: Event[]
  cursor?: string
  hasMore: boolean
}

// Client interface
export interface EventsClient {
  publish(type: string, data: Record<string, unknown>): Promise<Event>
  publishBatch(events: Array<{ type: string; data: Record<string, unknown> }>): Promise<Event[]>

  subscribe(pattern: string, target: string): Promise<Subscription>
  unsubscribe(subscriptionId: string): Promise<void>
  subscriptions(): Promise<Subscription[]>

  replay(options: { pattern?: string; from?: Date; to?: Date; limit?: number }): Promise<EventStream>
  stream(pattern: string, cursor?: string): Promise<EventStream>

  get(eventId: string): Promise<Event>
}

/**
 * Create a configured events client
 *
 * @example
 * ```typescript
 * import { Events } from 'events.do'
 * const events = Events({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Events(options?: ClientOptions): EventsClient {
  return createClient<EventsClient>('events', options)
}

/**
 * Default events client
 *
 * Authentication: Set DO_API_KEY or EVENTS_API_KEY in environment.
 * For Cloudflare Workers, use `import 'rpc.do/env'` to enable env-based config.
 */
export const events: EventsClient = Events()

// Named exports
export { Events, events }

// Default export = camelCase instance
export default events

export type { ClientOptions } from 'rpc.do'
