/**
 * Unit tests for ChannelRouter
 *
 * Tests routing strategies, availability checking, fallback logic,
 * and channel-specific sending mechanisms.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ChannelRouter, routeHumanFunction, routeAndSend } from '../src/router'
import type {
  HumanFunction,
  HumanChannel,
  RoutingContext,
  RouterEnv,
  ChannelHealth,
  AssigneeAvailability,
} from '../src/router'
import { z } from 'zod'

// ============================================================================
// Mock Data
// ============================================================================

const mockEnv: RouterEnv = {
  ROUTING_KV: {
    get: vi.fn(),
    put: vi.fn(),
  } as any,
  SLACK_API_TOKEN: 'xoxb-test-token',
  WORKOS_API_KEY: 'sk_test_workos',
  HUMAN_QUEUE: {
    send: vi.fn(),
  } as any,
  DB: {
    get: vi.fn(),
    list: vi.fn(),
    upsert: vi.fn(),
  } as any,
}

const mockFunction: HumanFunction<any, any> = {
  name: 'approve-expense',
  description: 'Approve or reject an expense claim',
  schema: {
    input: z.object({
      amount: z.number(),
      category: z.string(),
    }),
    output: z.object({
      approved: z.boolean(),
    }),
  },
  routing: {
    channels: ['slack', 'web', 'email'],
    assignees: ['user1', 'user2'],
    priority: 2,
    timeout: 86400000,
  },
  ui: {
    prompt: null as any,
  },
}

// ============================================================================
// Tests
// ============================================================================

describe('ChannelRouter', () => {
  let router: ChannelRouter

  beforeEach(() => {
    router = new ChannelRouter(mockEnv)
    vi.clearAllMocks()
  })

  describe('route()', () => {
    it('should select primary channel for routing', async () => {
      const input = { amount: 100, category: 'meals' }

      const decision = await router.route(mockFunction, input)

      expect(decision).toBeDefined()
      expect(decision.channel).toBeOneOf(['slack', 'web', 'email'])
      expect(decision.fallbackChannels).toBeDefined()
      expect(decision.strategy).toBeDefined()
    })

    it('should apply routing rules from KV', async () => {
      const rules = [
        {
          functionName: 'approve-expense',
          action: {
            preferChannel: 'slack' as HumanChannel,
          },
        },
      ]

      vi.mocked(mockEnv.ROUTING_KV!.get).mockResolvedValueOnce(JSON.stringify(rules))

      const input = { amount: 100, category: 'meals' }
      const decision = await router.route(mockFunction, input)

      expect(decision.channel).toBe('slack')
    })

    it('should exclude channels based on context', async () => {
      const input = { amount: 100, category: 'meals' }
      const context: Partial<RoutingContext> = {
        excludeChannels: ['email'],
      }

      const decision = await router.route(mockFunction, input, context)

      expect(decision.channel).not.toBe('email')
      expect(decision.fallbackChannels).not.toContain('email')
    })

    it('should handle time-based routing rules', async () => {
      const rules = [
        {
          functionName: '*',
          condition: {
            timeOfDay: { start: 9, end: 17 }, // Business hours
          },
          action: {
            preferChannel: 'slack' as HumanChannel,
          },
        },
      ]

      vi.mocked(mockEnv.ROUTING_KV!.get).mockResolvedValueOnce(JSON.stringify(rules))

      const input = { amount: 100, category: 'meals' }
      const context: Partial<RoutingContext> = {
        timeOfDay: 14, // 2 PM
      }

      const decision = await router.route(mockFunction, input, context)

      expect(decision.channel).toBe('slack')
    })

    it('should throw error when no healthy channels available', async () => {
      const functionWithNoChannels: HumanFunction<any, any> = {
        ...mockFunction,
        routing: {
          ...mockFunction.routing,
          channels: [],
        },
      }

      const input = { amount: 100, category: 'meals' }

      await expect(router.route(functionWithNoChannels, input)).rejects.toThrow('No healthy channels available')
    })

    it('should build fallback cascade in priority order', async () => {
      const input = { amount: 100, category: 'meals' }

      const decision = await router.route(mockFunction, input)

      expect(decision.fallbackChannels.length).toBeGreaterThan(0)
      // Primary channel should not be in fallback list
      expect(decision.fallbackChannels).not.toContain(decision.channel)
    })
  })

  describe('checkAvailability()', () => {
    it('should check availability for multiple assignees', async () => {
      const channels: ChannelHealth[] = [
        {
          channel: 'slack',
          available: true,
          responseTime: 1000,
          successRate: 0.95,
          currentLoad: 2,
          maxLoad: 5,
          lastChecked: new Date(),
        },
      ]

      vi.mocked(mockEnv.DB!.list).mockResolvedValue({
        data: [{ assignee: 'user1' }, { assignee: 'user1' }], // 2 active tasks
      })

      const availabilityMap = await router.checkAvailability(['user1', 'user2'], channels)

      expect(availabilityMap.size).toBe(2)
      expect(availabilityMap.get('user1')?.get('slack')).toBeDefined()
      expect(availabilityMap.get('user2')?.get('slack')).toBeDefined()
    })

    it('should cache availability results', async () => {
      const cached = {
        userId: 'user1',
        channel: 'slack',
        available: true,
        currentLoad: 1,
        maxLoad: 5,
        lastActive: new Date().toISOString(),
      }

      vi.mocked(mockEnv.ROUTING_KV!.get).mockResolvedValueOnce(cached)

      const channels: ChannelHealth[] = [
        {
          channel: 'slack',
          available: true,
          responseTime: 1000,
          successRate: 0.95,
          currentLoad: 2,
          maxLoad: 5,
          lastChecked: new Date(),
        },
      ]

      const availabilityMap = await router.checkAvailability(['user1'], channels)

      expect(availabilityMap.get('user1')?.get('slack')?.available).toBe(true)
      expect(mockEnv.ROUTING_KV!.get).toHaveBeenCalledWith('availability:user1:slack', { type: 'json' })
    })

    it('should check Slack availability via API', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ ok: true, presence: 'active' }),
      })

      vi.mocked(mockEnv.DB!.list).mockResolvedValue({
        data: [], // No active tasks
      })

      const channels: ChannelHealth[] = [
        {
          channel: 'slack',
          available: true,
          responseTime: 1000,
          successRate: 0.95,
          currentLoad: 0,
          maxLoad: 5,
          lastChecked: new Date(),
        },
      ]

      const availabilityMap = await router.checkAvailability(['user1'], channels)

      expect(availabilityMap.get('user1')?.get('slack')?.available).toBe(true)
      expect(fetch).toHaveBeenCalledWith('https://slack.com/api/users.getPresence', expect.anything())
    })

    it('should respect max load limits', async () => {
      vi.mocked(mockEnv.DB!.list).mockResolvedValue({
        data: [1, 2, 3, 4, 5], // 5 active tasks (max for slack)
      })

      const channels: ChannelHealth[] = [
        {
          channel: 'slack',
          available: true,
          responseTime: 1000,
          successRate: 0.95,
          currentLoad: 5,
          maxLoad: 5,
          lastChecked: new Date(),
        },
      ]

      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ ok: true, presence: 'active' }),
      })

      const availabilityMap = await router.checkAvailability(['user1'], channels)

      // Should be unavailable because at max load
      expect(availabilityMap.get('user1')?.get('slack')?.available).toBe(false)
    })
  })

  describe('sendToChannel()', () => {
    it('should send to Slack with interactive blocks', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: async () => ({ ok: true, channel: { id: 'C123' } }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ ok: true }),
        })

      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
        assignee: 'U123',
        priority: 2 as const,
      }

      await router.sendToChannel('slack', payload)

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenCalledWith('https://slack.com/api/conversations.open', expect.anything())
      expect(fetch).toHaveBeenCalledWith('https://slack.com/api/chat.postMessage', expect.anything())
    })

    it('should send to web via database and queue', async () => {
      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
        assignee: 'user1',
        priority: 2 as const,
      }

      await router.sendToChannel('web', payload)

      expect(mockEnv.DB!.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $id: 'human_execution/exec-123',
            data: expect.objectContaining({
              channel: 'web',
              status: 'pending',
            }),
          }),
        ]),
        expect.anything()
      )

      expect(mockEnv.HUMAN_QUEUE!.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'web_notification',
          payload: expect.objectContaining({
            executionId: 'exec-123',
          }),
        })
      )
    })

    it('should send to email via queue', async () => {
      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
        assignee: 'user1',
        priority: 2 as const,
      }

      await router.sendToChannel('email', payload)

      expect(mockEnv.HUMAN_QUEUE!.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email_notification',
          payload: expect.objectContaining({
            executionId: 'exec-123',
            email: expect.objectContaining({
              subject: expect.stringContaining('approve-expense'),
            }),
          }),
        })
      )
    })

    it('should throw error for unsupported channel', async () => {
      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
      }

      await expect(router.sendToChannel('invalid' as any, payload)).rejects.toThrow('Unsupported channel')
    })

    it('should handle Slack API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ ok: false, error: 'user_not_found' }),
      })

      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
        assignee: 'invalid-user',
      }

      await expect(router.sendToChannel('slack', payload)).rejects.toThrow('Failed to send to Slack')
    })
  })

  describe('fallback()', () => {
    it('should attempt fallback channels in order', async () => {
      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
      }

      // Mock web to succeed
      vi.mocked(mockEnv.DB!.upsert).mockResolvedValue(undefined)
      vi.mocked(mockEnv.HUMAN_QUEUE!.send).mockResolvedValue(undefined)

      const result = await router.fallback('slack', payload, ['web', 'email'])

      expect(result).toBe('web')
    })

    it('should throw error if all fallbacks fail', async () => {
      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
      }

      // Mock all to fail
      vi.mocked(mockEnv.DB!.upsert).mockRejectedValue(new Error('DB error'))

      await expect(router.fallback('slack', payload, ['web', 'email'])).rejects.toThrow('All fallback channels failed')
    })
  })

  describe('broadcast()', () => {
    it('should send to multiple channels simultaneously', async () => {
      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
      }

      // Mock all to succeed
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: async () => ({ ok: true, channel: { id: 'C123' } }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ ok: true }),
        })

      vi.mocked(mockEnv.DB!.upsert).mockResolvedValue(undefined)
      vi.mocked(mockEnv.HUMAN_QUEUE!.send).mockResolvedValue(undefined)

      const results = await router.broadcast(['slack', 'web', 'email'], payload)

      expect(results.size).toBe(3)
      expect(results.get('slack')).toBe(true)
      expect(results.get('web')).toBe(true)
      expect(results.get('email')).toBe(true)
    })

    it('should continue broadcasting even if some channels fail', async () => {
      const payload = {
        executionId: 'exec-123',
        functionName: 'approve-expense',
        input: { amount: 100, category: 'meals' },
      }

      // Mock slack to fail, others to succeed
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))
      vi.mocked(mockEnv.DB!.upsert).mockResolvedValue(undefined)
      vi.mocked(mockEnv.HUMAN_QUEUE!.send).mockResolvedValue(undefined)

      const results = await router.broadcast(['slack', 'web'], payload)

      expect(results.size).toBe(2)
      expect(results.get('slack')).toBe(false)
      expect(results.get('web')).toBe(true)
    })
  })

  describe('Routing Strategies', () => {
    it('should use hash strategy for consistent routing', async () => {
      const input1 = { amount: 100, category: 'meals' }
      const input2 = { amount: 100, category: 'meals' }

      const decision1 = await router.route(mockFunction, input1, { urgency: 'low' })
      const decision2 = await router.route(mockFunction, input2, { urgency: 'low' })

      // Same input should route to same channel
      expect(decision1.channel).toBe(decision2.channel)
    })

    it('should use weighted strategy for critical urgency', async () => {
      const input = { amount: 100, category: 'meals' }
      const context: Partial<RoutingContext> = {
        urgency: 'critical',
      }

      const decision = await router.route(mockFunction, input, context)

      expect(decision.strategy).toBe('weighted')
    })

    it('should load balance across assignees', async () => {
      vi.mocked(mockEnv.DB!.list)
        .mockResolvedValueOnce({ data: [1, 2, 3] }) // user1 has 3 tasks
        .mockResolvedValueOnce({ data: [1] }) // user2 has 1 task

      const input = { amount: 100, category: 'meals' }
      const decision = await router.route(mockFunction, input)

      // Should prefer user2 with lower load
      expect(decision.assignee).toBe('user2')
    })
  })

  describe('Convenience Functions', () => {
    it('should route using convenience function', async () => {
      const input = { amount: 100, category: 'meals' }

      const decision = await routeHumanFunction(mockEnv, mockFunction, input)

      expect(decision).toBeDefined()
      expect(decision.channel).toBeDefined()
    })

    it('should route and send using convenience function', async () => {
      const input = { amount: 100, category: 'meals' }

      vi.mocked(mockEnv.DB!.upsert).mockResolvedValue(undefined)
      vi.mocked(mockEnv.HUMAN_QUEUE!.send).mockResolvedValue(undefined)

      const result = await routeAndSend(mockEnv, mockFunction, input, 'exec-123')

      expect(result.decision).toBeDefined()
      expect(result.sent).toBe(true)
    })

    it('should attempt fallback in routeAndSend if primary fails', async () => {
      const input = { amount: 100, category: 'meals' }

      // First send fails, second succeeds
      vi.mocked(mockEnv.DB!.upsert).mockRejectedValueOnce(new Error('Primary failed')).mockResolvedValueOnce(undefined)

      vi.mocked(mockEnv.HUMAN_QUEUE!.send).mockResolvedValue(undefined)

      const result = await routeAndSend(mockEnv, mockFunction, input, 'exec-123')

      expect(result.sent).toBe(true)
    })
  })
})

// ============================================================================
// Custom Vitest Matchers
// ============================================================================

expect.extend({
  toBeOneOf(received: any, array: any[]) {
    const pass = array.includes(received)
    return {
      pass,
      message: () => (pass ? `expected ${received} not to be one of ${array}` : `expected ${received} to be one of ${array}`),
    }
  },
})

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeOneOf(array: any[]): T
  }
}
