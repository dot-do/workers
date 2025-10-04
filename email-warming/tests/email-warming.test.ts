import { describe, it, expect, beforeEach } from 'vitest'
import { EmailWarmingService } from '../src/index'
import type { Env, WarmupConfig } from '../src/types'

describe('Email Warming Service', () => {
  let service: EmailWarmingService
  let env: Env

  const mockDB = {
    execute: async (query: string, params?: any[]) => {
      // Mock database responses
      if (query.includes('INSERT INTO email_warmup')) {
        return { rows: [], success: true }
      }
      if (query.includes('SELECT * FROM email_warmup')) {
        return {
          rows: [
            {
              id: 'warmup-123',
              domain_id: 'domain-abc',
              status: 'in_progress',
              schedule_type: 'standard',
              current_day: 1,
              total_days: 28,
              daily_limit: 50,
              sent_today: 0,
              config: JSON.stringify({
                domainId: 'domain-abc',
                scheduleType: 'standard',
                autoAdvance: true,
                pauseOnHighBounce: true,
                pauseOnHighComplaint: true,
                bounceThreshold: 0.05,
                complaintThreshold: 0.001,
              }),
              schedule: JSON.stringify(
                Array(28)
                  .fill(0)
                  .map((_, i) => ({
                    day: i + 1,
                    dailyLimit: [50, 100, 200, 500][i] || 1000,
                    sent: 0,
                    bounceRate: 0,
                    complaintRate: 0,
                    successRate: 0,
                    completed: false,
                  }))
              ),
              started_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
          success: true,
        }
      }
      return { rows: [], success: true }
    },
  }

  const mockKV = {
    get: async (key: string, type?: string) => {
      if (key === 'warmup:domain-abc') {
        return type === 'json'
          ? {
              currentDay: 1,
              dailyLimit: 50,
              sentToday: 0,
              status: 'in_progress',
            }
          : JSON.stringify({
              currentDay: 1,
              dailyLimit: 50,
              sentToday: 0,
              status: 'in_progress',
            })
      }
      return null
    },
    put: async (key: string, value: string, options?: any) => {},
    delete: async (key: string) => {},
  }

  beforeEach(() => {
    env = {
      DB: mockDB,
      KV: mockKV as any,
      WARMUP_QUEUE: null as any,
      ENVIRONMENT: 'test',
    }
    service = new EmailWarmingService({} as any, env)
  })

  describe('startWarmup', () => {
    it('should start warmup with standard schedule', async () => {
      const config: WarmupConfig = {
        domainId: 'domain-abc',
        scheduleType: 'standard',
        autoAdvance: true,
        pauseOnHighBounce: true,
        pauseOnHighComplaint: true,
      }

      // Mock to prevent duplicate warmup error
      env.DB = {
        execute: async (query: string) => {
          if (query.includes('SELECT')) {
            return { rows: [], success: true }
          }
          return { rows: [], success: true }
        },
      }
      service = new EmailWarmingService({} as any, env)

      const result = await service.startWarmup({ config })

      expect(result).toBeDefined()
      expect(result.status).toBe('in_progress')
      expect(result.currentDay).toBe(1)
      expect(result.schedule.length).toBeGreaterThan(0)
    })

    it('should start warmup with custom schedule', async () => {
      const config: WarmupConfig = {
        domainId: 'domain-abc',
        scheduleType: 'custom',
        customSchedule: [100, 200, 300, 400, 500],
      }

      // Mock to prevent duplicate warmup error
      env.DB = {
        execute: async (query: string) => {
          if (query.includes('SELECT')) {
            return { rows: [], success: true }
          }
          return { rows: [], success: true }
        },
      }
      service = new EmailWarmingService({} as any, env)

      const result = await service.startWarmup({ config })

      expect(result.schedule.length).toBe(5)
      expect(result.schedule[0].dailyLimit).toBe(100)
    })

    it('should reject custom schedule without customSchedule array', async () => {
      const config: WarmupConfig = {
        domainId: 'domain-abc',
        scheduleType: 'custom',
      }

      // Mock to prevent duplicate warmup error
      env.DB = {
        execute: async (query: string) => {
          if (query.includes('SELECT')) {
            return { rows: [], success: true }
          }
          return { rows: [], success: true }
        },
      }
      service = new EmailWarmingService({} as any, env)

      await expect(service.startWarmup({ config })).rejects.toThrow()
    })
  })

  describe('getWarmupProgress', () => {
    it('should get warmup progress', async () => {
      const result = await service.getWarmupProgress('domain-abc')

      expect(result).toBeDefined()
      expect(result?.domainId).toBe('domain-abc')
      expect(result?.status).toBe('in_progress')
      expect(result?.currentDay).toBe(1)
    })

    it('should return null for non-existent warmup', async () => {
      env.DB = {
        execute: async () => ({ rows: [], success: true }),
      }
      service = new EmailWarmingService({} as any, env)

      const result = await service.getWarmupProgress('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('checkLimit', () => {
    it('should allow send within limit', async () => {
      const result = await service.checkLimit({ domainId: 'domain-abc', count: 10 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(50)
      expect(result.dailyLimit).toBe(50)
    })

    it('should deny send exceeding limit', async () => {
      // Mock KV with high sent count
      env.KV = {
        get: async (key: string, type?: string) => {
          if (key === 'warmup:domain-abc') {
            return type === 'json'
              ? {
                  currentDay: 1,
                  dailyLimit: 50,
                  sentToday: 45,
                  status: 'in_progress',
                }
              : JSON.stringify({
                  currentDay: 1,
                  dailyLimit: 50,
                  sentToday: 45,
                  status: 'in_progress',
                })
          }
          return null
        },
      } as any
      service = new EmailWarmingService({} as any, env)

      const result = await service.checkLimit({ domainId: 'domain-abc', count: 10 })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(5)
      expect(result.reason).toContain('Warmup limit reached')
    })

    it('should allow unlimited for no warmup', async () => {
      env.KV = {
        get: async () => null,
      } as any
      env.DB = {
        execute: async () => ({ rows: [], success: true }),
      }
      service = new EmailWarmingService({} as any, env)

      const result = await service.checkLimit({ domainId: 'domain-xyz', count: 1000 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(Infinity)
      expect(result.status).toBe('not_started')
    })
  })

  describe('pauseWarmup', () => {
    it('should pause active warmup', async () => {
      const result = await service.pauseWarmup({ domainId: 'domain-abc' })

      expect(result.status).toBe('paused')
      expect(result.pausedAt).toBeDefined()
    })
  })

  describe('resumeWarmup', () => {
    it('should resume paused warmup', async () => {
      // Mock paused warmup
      env.DB = {
        execute: async (query: string) => {
          if (query.includes('SELECT')) {
            return {
              rows: [
                {
                  id: 'warmup-123',
                  domain_id: 'domain-abc',
                  status: 'paused',
                  schedule_type: 'standard',
                  current_day: 1,
                  total_days: 28,
                  daily_limit: 50,
                  sent_today: 0,
                  config: JSON.stringify({ domainId: 'domain-abc', scheduleType: 'standard' }),
                  schedule: JSON.stringify([]),
                  started_at: new Date().toISOString(),
                  paused_at: new Date().toISOString(),
                },
              ],
              success: true,
            }
          }
          return { rows: [], success: true }
        },
      }
      service = new EmailWarmingService({} as any, env)

      const result = await service.resumeWarmup({ domainId: 'domain-abc' })

      expect(result.status).toBe('in_progress')
    })
  })

  describe('recordSend', () => {
    it('should record successful send', async () => {
      await service.recordSend({
        domainId: 'domain-abc',
        status: 'delivered',
      })

      // Should not throw
      expect(true).toBe(true)
    })

    it('should record bounced send', async () => {
      await service.recordSend({
        domainId: 'domain-abc',
        status: 'bounced',
      })

      // Should not throw
      expect(true).toBe(true)
    })

    it('should skip if no active warmup', async () => {
      env.DB = {
        execute: async () => ({ rows: [], success: true }),
      }
      service = new EmailWarmingService({} as any, env)

      await service.recordSend({
        domainId: 'non-existent',
        status: 'delivered',
      })

      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should calculate warmup statistics', async () => {
      const result = await service.getStats('domain-abc')

      expect(result).toBeDefined()
      expect(result?.domainId).toBe('domain-abc')
      expect(result?.currentDay).toBe(1)
      expect(result?.totalDays).toBe(28)
      expect(result?.completionPercentage).toBeGreaterThanOrEqual(0)
    })

    it('should return null for non-existent warmup', async () => {
      env.DB = {
        execute: async () => ({ rows: [], success: true }),
      }
      service = new EmailWarmingService({} as any, env)

      const result = await service.getStats('non-existent')
      expect(result).toBeNull()
    })
  })
})
