import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReferralProgramService } from '../src/index'
import type { Env } from '../src/types'

describe('ReferralProgramService', () => {
  let service: ReferralProgramService
  let mockEnv: Env

  beforeEach(() => {
    // Mock D1 database
    const mockDB = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(() => Promise.resolve({ success: true })),
          first: vi.fn(() => Promise.resolve(null)),
          all: vi.fn(() => Promise.resolve({ results: [] })),
        })),
      })),
    }

    // Mock KV namespace
    const mockKV = {
      get: vi.fn(() => Promise.resolve(null)),
      put: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
    }

    // Mock queue
    const mockQueue = {
      send: vi.fn(() => Promise.resolve()),
    }

    mockEnv = {
      DB: mockDB as any,
      KV: mockKV as any,
      EMAIL_SERVICE: {},
      ANALYTICS_SERVICE: {},
      AUTH_SERVICE: {},
      WAITLIST_SERVICE: {},
      REFERRAL_QUEUE: mockQueue as any,
    }

    service = new ReferralProgramService({} as any, mockEnv)
  })

  describe('generateReferralCode', () => {
    it('should generate a referral code for a user', async () => {
      const request = {
        userId: 'user_123',
        email: 'john@example.com',
        name: 'John Doe',
      }

      const code = await service.generateReferralCode(request)

      expect(code).toBeDefined()
      expect(code.userId).toBe(request.userId)
      expect(code.email).toBe(request.email)
      expect(code.code).toBeDefined()
      expect(code.status).toBe('active')
      expect(code.tier).toBe('bronze')
      expect(code.referralCount).toBe(0)
    })

    it('should accept custom referral code', async () => {
      const request = {
        userId: 'user_123',
        email: 'john@example.com',
        customCode: 'mycustomcode',
      }

      const code = await service.generateReferralCode(request)

      expect(code.code).toBe('mycustomcode')
    })

    it('should reject invalid email', async () => {
      const request = {
        userId: 'user_123',
        email: 'invalid-email',
      }

      await expect(service.generateReferralCode(request)).rejects.toThrow()
    })

    it('should generate unique code based on email', async () => {
      const request1 = {
        userId: 'user_123',
        email: 'john.doe@example.com',
      }

      const request2 = {
        userId: 'user_456',
        email: 'jane.smith@example.com',
      }

      const code1 = await service.generateReferralCode(request1)
      const code2 = await service.generateReferralCode(request2)

      expect(code1.code).toBeDefined()
      expect(code2.code).toBeDefined()
      expect(code1.code).not.toBe(code2.code)
    })
  })

  describe('trackReferral', () => {
    it('should track a new referral', async () => {
      // Mock existing referral code
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() =>
            Promise.resolve({
              id: 'code_123',
              user_id: 'user_123',
              code: 'johndoe7abc',
              email: 'john@example.com',
              status: 'active',
              tier: 'bronze',
              referral_count: 0,
              successful_referrals: 0,
              credits_earned: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          ),
          run: vi.fn(() => Promise.resolve({ success: true })),
        })),
      })) as any

      const request = {
        referralCode: 'johndoe7abc',
        referredEmail: 'jane@example.com',
        source: 'waitlist',
      }

      const referral = await service.trackReferral(request)

      expect(referral).toBeDefined()
      expect(referral.referredEmail).toBe(request.referredEmail)
      expect(referral.status).toBe('pending')
      expect(referral.rewardAmount).toBeGreaterThan(0)
    })

    it('should prevent self-referral', async () => {
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() =>
            Promise.resolve({
              id: 'code_123',
              user_id: 'user_123',
              code: 'johndoe7abc',
              email: 'john@example.com',
              status: 'active',
              tier: 'bronze',
            })
          ),
        })),
      })) as any

      const request = {
        referralCode: 'johndoe7abc',
        referredEmail: 'john@example.com', // Same as referrer
      }

      await expect(service.trackReferral(request)).rejects.toThrow('Cannot refer yourself')
    })
  })

  describe('convertReferral', () => {
    it('should convert a pending referral', async () => {
      // Mock pending referral
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() =>
            Promise.resolve({
              id: 'ref_123',
              referral_code_id: 'code_123',
              referrer_user_id: 'user_123',
              referred_email: 'jane@example.com',
              status: 'pending',
              reward_amount: 100,
              referred_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          ),
          run: vi.fn(() => Promise.resolve({ success: true })),
        })),
      })) as any

      const request = {
        referredEmail: 'jane@example.com',
        referredUserId: 'user_456',
      }

      const converted = await service.convertReferral(request)

      expect(converted.status).toBe('converted')
      expect(converted.referredUserId).toBe(request.referredUserId)
    })

    it('should reject already converted referral', async () => {
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() =>
            Promise.resolve({
              id: 'ref_123',
              status: 'converted', // Already converted
            })
          ),
        })),
      })) as any

      const request = {
        referredEmail: 'jane@example.com',
        referredUserId: 'user_456',
      }

      await expect(service.convertReferral(request)).rejects.toThrow('already processed')
    })
  })

  describe('getUserStats', () => {
    it('should return user referral statistics', async () => {
      // Mock referral code and referrals
      mockEnv.DB.prepare = vi.fn((query) => {
        if (query.includes('referral_codes')) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(() =>
                Promise.resolve({
                  id: 'code_123',
                  user_id: 'user_123',
                  code: 'johndoe7abc',
                  email: 'john@example.com',
                  tier: 'silver',
                  referral_count: 10,
                  successful_referrals: 7,
                  credits_earned: 840,
                })
              ),
            })),
          }
        } else {
          return {
            bind: vi.fn(() => ({
              all: vi.fn(() => Promise.resolve({ results: [] })),
            })),
          }
        }
      }) as any

      const stats = await service.getUserStats('user_123')

      expect(stats).toBeDefined()
      expect(stats.referralCode).toBe('johndoe7abc')
      expect(stats.totalReferrals).toBe(10)
      expect(stats.successfulReferrals).toBe(7)
      expect(stats.tier).toBe('silver')
      expect(stats.creditsEarned).toBe(840)
    })
  })

  describe('getLeaderboard', () => {
    it('should return top referrers', async () => {
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(() =>
            Promise.resolve({
              results: [
                {
                  user_id: 'user_123',
                  email: 'john@example.com',
                  successful_referrals: 42,
                  credits_earned: 6300,
                  tier: 'platinum',
                },
                {
                  user_id: 'user_456',
                  email: 'jane@example.com',
                  successful_referrals: 18,
                  credits_earned: 2520,
                  tier: 'gold',
                },
              ],
            })
          ),
        })),
      })) as any

      const leaderboard = await service.getLeaderboard({ limit: 10 })

      expect(leaderboard).toHaveLength(2)
      expect(leaderboard[0].rank).toBe(1)
      expect(leaderboard[0].referralCount).toBe(42)
      expect(leaderboard[1].rank).toBe(2)
    })

    it('should support timeframe filtering', async () => {
      const leaderboard = await service.getLeaderboard({
        timeframe: 'month',
        limit: 5,
      })

      expect(leaderboard).toBeDefined()
      expect(Array.isArray(leaderboard)).toBe(true)
    })
  })

  describe('getAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      mockEnv.DB.prepare = vi.fn((query) => {
        if (query.includes('COUNT(*)') && !query.includes('GROUP BY')) {
          return {
            first: vi.fn(() => Promise.resolve({ count: 100 })),
          }
        } else if (query.includes('SUM')) {
          return {
            first: vi.fn(() => Promise.resolve({ sum: 10000 })),
          }
        } else {
          return {
            all: vi.fn(() => Promise.resolve({ results: [] })),
          }
        }
      }) as any

      const analytics = await service.getAnalytics()

      expect(analytics).toBeDefined()
      expect(analytics.totalReferrals).toBeGreaterThanOrEqual(0)
      expect(analytics.conversionRate).toBeGreaterThanOrEqual(0)
      expect(analytics.viralCoefficient).toBeGreaterThanOrEqual(0)
    })
  })
})
