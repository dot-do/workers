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

export function Events(options?: ClientOptions): EventsClient {
  return createClient<EventsClient>('https://events.do', options)
}

export const events: EventsClient = Events({
  apiKey: typeof process !== 'undefined' ? process.env?.EVENTS_API_KEY : undefined,
})

export type { ClientOptions } from 'rpc.do'
