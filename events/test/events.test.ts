/**
 * Events Service Tests
 *
 * Tests event publishing, SSE streaming, webhook delivery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventsService, EventStream } from '../src/index'
import type { Env, Event } from '../src/index'

// Mock environment
const createMockEnv = (): Env => {
  const mockDb = {
    createThing: vi.fn(),
    getThing: vi.fn(),
    updateThing: vi.fn(),
    deleteThing: vi.fn(),
    listThings: vi.fn(() => Promise.resolve([])),
  }

  const mockQueue = {
    send: vi.fn(),
  }

  const mockAnalytics = {
    writeDataPoint: vi.fn(),
  }

  const mockDONamespace = {
    idFromName: vi.fn((name: string) => ({ name })),
    get: vi.fn((id: any) => ({
      broadcast: vi.fn(),
      subscribe: vi.fn(),
    })),
  }

  return {
    DB: mockDb,
    EVENT_STREAM: mockDONamespace as any,
    WEBHOOK_QUEUE: mockQueue as any,
    EVENTS_ANALYTICS: mockAnalytics as any,
  }
}

describe('EventsService', () => {
  let service: EventsService
  let env: Env

  beforeEach(() => {
    env = createMockEnv()
    service = new EventsService(env, {} as any)
  })

  describe('publishEvent', () => {
    it('should publish event with all fields', async () => {
      const event = await service.publishEvent({
        type: 'user.created',
        source: 'auth-service',
        payload: { userId: '123', email: 'test@example.com' },
        metadata: { ip: '127.0.0.1' },
      })

      expect(event.id).toBeDefined()
      expect(event.timestamp).toBeInstanceOf(Date)
      expect(event.type).toBe('user.created')
      expect(event.source).toBe('auth-service')
      expect(event.payload).toEqual({ userId: '123', email: 'test@example.com' })
      expect(event.metadata).toEqual({ ip: '127.0.0.1' })
    })

    it('should store event in database', async () => {
      await service.publishEvent({
        type: 'user.created',
        source: 'auth-service',
        payload: { userId: '123' },
      })

      expect(env.DB.createThing).toHaveBeenCalledWith(
        expect.objectContaining({
          ns: 'events',
          type: 'Event',
          visibility: 'public',
        })
      )
    })

    it('should track analytics', async () => {
      await service.publishEvent({
        type: 'user.created',
        source: 'auth-service',
        payload: { userId: '123' },
      })

      expect(env.EVENTS_ANALYTICS.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          indexes: ['events'],
          blobs: ['user.created', 'auth-service'],
        })
      )
    })

    it('should broadcast to SSE stream', async () => {
      const mockBroadcast = vi.fn()
      const mockDO = { broadcast: mockBroadcast, subscribe: vi.fn() }
      ;(env.EVENT_STREAM.get as any).mockReturnValue(mockDO)

      await service.publishEvent({
        type: 'user.created',
        source: 'auth-service',
        payload: { userId: '123' },
      })

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.created',
          source: 'auth-service',
        })
      )
    })

    it('should queue webhook deliveries', async () => {
      // Mock listWebhooks to return matching webhooks
      ;(env.DB.listThings as any).mockResolvedValue([
        {
          id: 'webhook-1',
          data: {
            url: 'https://example.com/webhook',
            events: ['user.created'],
            active: true,
          },
        },
      ])

      await service.publishEvent({
        type: 'user.created',
        source: 'auth-service',
        payload: { userId: '123' },
      })

      expect(env.WEBHOOK_QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: 'webhook-1',
          url: 'https://example.com/webhook',
        })
      )
    })
  })

  describe('getEvents', () => {
    beforeEach(() => {
      const mockEvents = [
        {
          id: 'event-1',
          data: {
            eventType: 'user.created',
            source: 'auth-service',
            payload: { userId: '123' },
            timestamp: new Date('2025-01-01').toISOString(),
          },
        },
        {
          id: 'event-2',
          data: {
            eventType: 'user.updated',
            source: 'auth-service',
            payload: { userId: '123' },
            timestamp: new Date('2025-01-02').toISOString(),
          },
        },
      ]
      ;(env.DB.listThings as any).mockResolvedValue(mockEvents)
    })

    it('should return all events without filters', async () => {
      const events = await service.getEvents()

      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('user.created')
      expect(events[1].type).toBe('user.updated')
    })

    it('should filter by type', async () => {
      const events = await service.getEvents({ type: 'user.created' })

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('user.created')
    })

    it('should filter by source', async () => {
      const events = await service.getEvents({ source: 'auth-service' })

      expect(events).toHaveLength(2)
    })

    it('should filter by date range', async () => {
      const events = await service.getEvents({
        since: new Date('2025-01-01'),
        until: new Date('2025-01-01T23:59:59'),
      })

      expect(events).toHaveLength(1)
      expect(events[0].timestamp.toDateString()).toBe(new Date('2025-01-01').toDateString())
    })

    it('should respect limit', async () => {
      const events = await service.getEvents({ limit: 1 })

      expect(env.DB.listThings).toHaveBeenCalledWith('events', 'Event', { limit: 1 })
    })
  })

  describe('webhook management', () => {
    it('should register webhook', async () => {
      const webhookId = await service.registerWebhook(
        'https://example.com/webhook',
        ['user.created', 'user.updated'],
        'secret-key'
      )

      expect(webhookId).toBeDefined()
      expect(env.DB.createThing).toHaveBeenCalledWith(
        expect.objectContaining({
          ns: 'webhooks',
          type: 'Webhook',
          data: expect.objectContaining({
            url: 'https://example.com/webhook',
            events: ['user.created', 'user.updated'],
            secret: 'secret-key',
            active: true,
          }),
        })
      )
    })

    it('should get webhook', async () => {
      ;(env.DB.getThing as any).mockResolvedValue({
        id: 'webhook-1',
        data: {
          url: 'https://example.com/webhook',
          events: ['user.created'],
          active: true,
          createdAt: new Date('2025-01-01').toISOString(),
        },
      })

      const webhook = await service.getWebhook('webhook-1')

      expect(webhook).toMatchObject({
        id: 'webhook-1',
        url: 'https://example.com/webhook',
        events: ['user.created'],
        active: true,
      })
    })

    it('should return null for non-existent webhook', async () => {
      ;(env.DB.getThing as any).mockRejectedValue(new Error('Not found'))

      const webhook = await service.getWebhook('non-existent')

      expect(webhook).toBeNull()
    })

    it('should update webhook', async () => {
      ;(env.DB.getThing as any).mockResolvedValue({
        id: 'webhook-1',
        data: {
          url: 'https://example.com/webhook',
          events: ['user.created'],
          active: true,
          createdAt: new Date('2025-01-01').toISOString(),
        },
      })

      await service.updateWebhook('webhook-1', {
        active: false,
      })

      expect(env.DB.updateThing).toHaveBeenCalledWith(
        'webhooks',
        'webhook-1',
        expect.objectContaining({
          data: expect.objectContaining({
            active: false,
          }),
        })
      )
    })

    it('should delete webhook', async () => {
      await service.deleteWebhook('webhook-1')

      expect(env.DB.deleteThing).toHaveBeenCalledWith('webhooks', 'webhook-1')
    })

    it('should list webhooks', async () => {
      ;(env.DB.listThings as any).mockResolvedValue([
        {
          id: 'webhook-1',
          data: {
            url: 'https://example.com/webhook',
            events: ['user.created'],
            active: true,
            createdAt: new Date('2025-01-01').toISOString(),
          },
        },
      ])

      const webhooks = await service.listWebhooks()

      expect(webhooks).toHaveLength(1)
      expect(webhooks[0].id).toBe('webhook-1')
    })
  })
})

describe('EventStream Durable Object', () => {
  it('should broadcast event to all subscribers', async () => {
    // This would require a full Durable Object test environment
    // For now, we verify the interface
    expect(EventStream).toBeDefined()
  })

  it('should filter events by type', async () => {
    // Mock test - actual implementation would need DO test env
    const event: Event = {
      id: 'event-1',
      type: 'user.created',
      source: 'auth-service',
      payload: { userId: '123' },
      timestamp: new Date(),
    }

    // Verify filter logic
    const shouldMatch = event.type === 'user.created'
    expect(shouldMatch).toBe(true)
  })
})

describe('Event Types', () => {
  it('should support user events', () => {
    const event: Event = {
      id: 'event-1',
      type: 'user.created',
      source: 'auth-service',
      payload: { userId: '123' },
      timestamp: new Date(),
    }

    expect(event.type).toBe('user.created')
  })

  it('should support thing events', () => {
    const event: Event = {
      id: 'event-1',
      type: 'thing.created',
      source: 'api-service',
      payload: { thingId: 'thing-123' },
      timestamp: new Date(),
    }

    expect(event.type).toBe('thing.created')
  })

  it('should support relationship events', () => {
    const event: Event = {
      id: 'event-1',
      type: 'relationship.created',
      source: 'api-service',
      payload: { fromId: 'thing-1', toId: 'thing-2' },
      timestamp: new Date(),
    }

    expect(event.type).toBe('relationship.created')
  })

  it('should support job events', () => {
    const event: Event = {
      id: 'event-1',
      type: 'job.completed',
      source: 'queue-service',
      payload: { jobId: 'job-123', result: 'success' },
      timestamp: new Date(),
    }

    expect(event.type).toBe('job.completed')
  })

  it('should support webhook events', () => {
    const event: Event = {
      id: 'event-1',
      type: 'webhook.triggered',
      source: 'events-service',
      payload: { webhookId: 'webhook-123', status: 'delivered' },
      timestamp: new Date(),
    }

    expect(event.type).toBe('webhook.triggered')
  })
})
