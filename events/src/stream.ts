/**
 * EventStream Durable Object
 *
 * Manages real-time event streaming via Server-Sent Events (SSE)
 * - Maintains active subscriber connections
 * - Broadcasts events to all matching subscribers
 * - Handles subscriber filtering
 */

import { DurableObject } from 'cloudflare:workers'
import type { Event, EventFilter } from './index'

interface Subscription {
  id: string
  filters?: EventFilter
  stream: ReadableStreamDefaultController
}

export class EventStream extends DurableObject {
  private subscriptions: Map<string, Subscription> = new Map()

  /**
   * Broadcast an event to all matching subscribers
   */
  async broadcast(event: Event): Promise<void> {
    const encoder = new TextEncoder()
    const eventData = `data: ${JSON.stringify({ type: 'event', event })}\n\n`
    const encoded = encoder.encode(eventData)

    // Send to all matching subscribers
    for (const [id, subscription] of this.subscriptions) {
      try {
        if (this.matchesFilters(event, subscription.filters)) {
          subscription.stream.enqueue(encoded)
        }
      } catch (error) {
        console.error(`Failed to send event to subscriber ${id}:`, error)
        // Remove failed subscription
        this.subscriptions.delete(id)
      }
    }
  }

  /**
   * Subscribe to events with optional filters
   * Returns an SSE stream
   */
  async subscribe(filters?: EventFilter): Promise<Response> {
    const subscriptionId = crypto.randomUUID()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start: (controller) => {
        // Store subscription
        this.subscriptions.set(subscriptionId, {
          id: subscriptionId,
          filters,
          stream: controller,
        })

        // Send keepalive every 30 seconds
        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'))
          } catch {
            // Stream closed, clean up
            clearInterval(keepaliveInterval)
            this.subscriptions.delete(subscriptionId)
          }
        }, 30000)

        // Clean up on close
        controller.close = () => {
          clearInterval(keepaliveInterval)
          this.subscriptions.delete(subscriptionId)
        }
      },
      cancel: () => {
        // Clean up when client disconnects
        this.subscriptions.delete(subscriptionId)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  /**
   * Get statistics about current subscriptions
   */
  async getStats(): Promise<{ subscriptions: number; filters: Record<string, number> }> {
    const filterCounts: Record<string, number> = {}

    for (const subscription of this.subscriptions.values()) {
      if (subscription.filters?.type) {
        filterCounts[subscription.filters.type] = (filterCounts[subscription.filters.type] || 0) + 1
      }
    }

    return {
      subscriptions: this.subscriptions.size,
      filters: filterCounts,
    }
  }

  /**
   * Check if event matches subscriber filters
   */
  private matchesFilters(event: Event, filters?: EventFilter): boolean {
    if (!filters) return true

    if (filters.type && event.type !== filters.type) return false
    if (filters.source && event.source !== filters.source) return false
    if (filters.since && event.timestamp < filters.since) return false
    if (filters.until && event.timestamp > filters.until) return false

    return true
  }

  /**
   * Handle incoming fetch requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Parse filters from query params
    const filters: EventFilter = {}
    const params = url.searchParams
    if (params.get('type')) filters.type = params.get('type')!
    if (params.get('source')) filters.source = params.get('source')!
    if (params.get('since')) filters.since = new Date(params.get('since')!)
    if (params.get('until')) filters.until = new Date(params.get('until')!)

    return this.subscribe(filters)
  }
}
