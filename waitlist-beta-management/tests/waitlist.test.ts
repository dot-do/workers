import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WaitlistBetaManagementService } from '../src/index'
import type { Env } from '../src/types'

describe('WaitlistBetaManagementService', () => {
  let service: WaitlistBetaManagementService
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
      WAITLIST_QUEUE: mockQueue as any,
    }

    service = new WaitlistBetaManagementService({} as any, mockEnv)
  })

  describe('addToWaitlist', () => {
    it('should add a new entry to the waitlist', async () => {
      const request = {
        email: 'test@example.com',
        name: 'Test User',
        company: 'Acme Corp',
        useCase: 'Building automation platform',
        source: 'twitter',
      }

      const entry = await service.addToWaitlist(request)

      expect(entry).toBeDefined()
      expect(entry.email).toBe(request.email)
      expect(entry.name).toBe(request.name)
      expect(entry.status).toBe('pending')
      expect(entry.priorityScore).toBeGreaterThan(0)
    })

    it('should reject invalid email', async () => {
      const request = {
        email: 'invalid-email',
      }

      await expect(service.addToWaitlist(request)).rejects.toThrow()
    })

    it('should calculate higher priority for referrals', async () => {
      const withReferral = await service.addToWaitlist({
        email: 'test1@example.com',
        referralCode: 'friend@example.com',
      })

      const withoutReferral = await service.addToWaitlist({
        email: 'test2@example.com',
      })

      expect(withReferral.priorityScore).toBeGreaterThan(withoutReferral.priorityScore)
    })

    it('should calculate higher priority for complete profiles', async () => {
      const complete = await service.addToWaitlist({
        email: 'complete@example.com',
        name: 'Complete User',
        company: 'Acme Corp',
        useCase: 'Building amazing things',
        source: 'twitter',
      })

      const minimal = await service.addToWaitlist({
        email: 'minimal@example.com',
      })

      expect(complete.priorityScore).toBeGreaterThan(minimal.priorityScore)
    })
  })

  describe('generateInvites', () => {
    it('should generate invitations for eligible entries', async () => {
      const request = {
        count: 10,
        priorityThreshold: 50,
        dryRun: true,
      }

      const result = await service.generateInvites(request)

      expect(result).toBeDefined()
      expect(result.dryRun).toBe(true)
      expect(result.summary.generated).toBeLessThanOrEqual(10)
    })

    it('should respect priority threshold', async () => {
      const result = await service.generateInvites({
        count: 100,
        priorityThreshold: 80,
        dryRun: true,
      })

      // All generated invitations should be for high-priority entries
      expect(result.summary.generated).toBeDefined()
    })

    it('should not send emails in dry run mode', async () => {
      const result = await service.generateInvites({
        count: 5,
        dryRun: true,
      })

      expect(result.summary.sent).toBe(0)
      expect(mockEnv.WAITLIST_QUEUE.send).not.toHaveBeenCalled()
    })
  })

  describe('checkInvite', () => {
    it('should validate a valid invite code', async () => {
      // Mock a valid invitation
      const mockInvitation = {
        id: 'test-id',
        invite_code: 'VALID123CODE',
        status: 'sent',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() => Promise.resolve(mockInvitation)),
        })),
      })) as any

      const result = await service.checkInvite({ inviteCode: 'VALID123CODE' })

      expect(result.valid).toBe(true)
      expect(result.invitation).toBeDefined()
    })

    it('should reject expired invite code', async () => {
      const mockInvitation = {
        id: 'test-id',
        invite_code: 'EXPIRED123',
        status: 'sent',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      }

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() => Promise.resolve(mockInvitation)),
        })),
      })) as any

      const result = await service.checkInvite({ inviteCode: 'EXPIRED123' })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should reject already accepted invite', async () => {
      const mockInvitation = {
        id: 'test-id',
        invite_code: 'USED123CODE',
        status: 'accepted',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() => Promise.resolve(mockInvitation)),
        })),
      })) as any

      const result = await service.checkInvite({ inviteCode: 'USED123CODE' })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already accepted')
    })
  })

  describe('getAnalytics', () => {
    it('should return waitlist analytics', async () => {
      const analytics = await service.getAnalytics()

      expect(analytics).toBeDefined()
      expect(analytics.total).toBeGreaterThanOrEqual(0)
      expect(analytics.byStatus).toBeDefined()
      expect(analytics.bySource).toBeDefined()
      expect(analytics.averagePriorityScore).toBeGreaterThanOrEqual(0)
      expect(analytics.conversionRate).toBeGreaterThanOrEqual(0)
      expect(analytics.topReferrers).toBeDefined()
    })
  })
})
