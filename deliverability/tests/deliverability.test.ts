/**
 * Deliverability Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeliverabilityService } from '../src/index'
import type { Env } from '../src/types'

// Mock environment
const createMockEnv = (): Env => ({
  DB: {
    execute: vi.fn(),
  } as any,
  KV: {
    get: vi.fn(),
    put: vi.fn(),
  } as any,
  ctx: {} as any,
})

describe('DeliverabilityService', () => {
  let service: DeliverabilityService
  let env: Env

  beforeEach(() => {
    env = createMockEnv()
    service = new DeliverabilityService(env.ctx, env)
  })

  describe('getMetrics', () => {
    it('should calculate metrics for a domain with good deliverability', async () => {
      // Mock database query
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            sent: 1000,
            delivered: 980,
            bounced: 10,
            complained: 1,
            failed: 9,
            opened: 294,
            clicked: 88,
            replied: 15,
            unsubscribed: 5,
          },
        ],
      } as any)

      const result = await service.getMetrics({
        domainId: 'domain123',
        period: 'week',
      })

      expect(result).toMatchObject({
        domainId: 'domain123',
        period: 'week',
        sent: 1000,
        delivered: 980,
        bounced: 10,
        complained: 1,
        deliveryRate: 0.98,
        bounceRate: 0.01,
        complaintRate: expect.closeTo(0.00102, 5),
        openRate: 0.3,
        clickRate: expect.closeTo(0.0898, 4),
        status: 'excellent',
      })

      expect(result.issues).toHaveLength(0)
      expect(result.recommendations).toHaveLength(0)
    })

    it('should identify high bounce rate issues', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            sent: 1000,
            delivered: 920,
            bounced: 80,
            complained: 0,
            failed: 0,
            opened: 200,
            clicked: 50,
            replied: 10,
            unsubscribed: 5,
          },
        ],
      } as any)

      const result = await service.getMetrics({
        domainId: 'domain123',
        period: 'day',
      })

      expect(result.bounceRate).toBe(0.08)
      expect(result.status).toBe('warning')
      expect(result.issues).toContain('High bounce rate: 8.00%')
      expect(result.recommendations).toContain('Clean your email list - remove invalid addresses')
    })

    it('should identify high complaint rate issues', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            sent: 1000,
            delivered: 980,
            bounced: 10,
            complained: 20,
            failed: 10,
            opened: 300,
            clicked: 80,
            replied: 15,
            unsubscribed: 5,
          },
        ],
      } as any)

      const result = await service.getMetrics({
        domainId: 'domain123',
        period: 'week',
      })

      expect(result.complaintRate).toBeCloseTo(0.0204, 4)
      expect(result.status).toBe('critical')
      expect(result.issues.some((i) => i.includes('High complaint rate'))).toBe(true)
      expect(result.recommendations.some((r) => r.includes('Review email content'))).toBe(true)
    })

    it('should identify low delivery rate issues', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            sent: 1000,
            delivered: 850,
            bounced: 100,
            complained: 5,
            failed: 45,
            opened: 200,
            clicked: 50,
            replied: 10,
            unsubscribed: 3,
          },
        ],
      } as any)

      const result = await service.getMetrics({
        domainId: 'domain123',
        period: 'day',
      })

      expect(result.deliveryRate).toBe(0.85)
      expect(result.status).toBe('critical')
      expect(result.issues.some((i) => i.includes('Low delivery rate'))).toBe(true)
      expect(result.recommendations.some((r) => r.includes('DNS records'))).toBe(true)
    })

    it('should identify low open rate for sufficient volume', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            sent: 1000,
            delivered: 980,
            bounced: 10,
            complained: 1,
            failed: 9,
            opened: 98,
            clicked: 30,
            replied: 5,
            unsubscribed: 5,
          },
        ],
      } as any)

      const result = await service.getMetrics({
        domainId: 'domain123',
        period: 'week',
      })

      expect(result.openRate).toBe(0.1)
      expect(result.issues.some((i) => i.includes('Low open rate'))).toBe(true)
      expect(result.recommendations.some((r) => r.includes('subject lines'))).toBe(true)
    })

    it('should handle zero sent emails', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            sent: 0,
            delivered: 0,
            bounced: 0,
            complained: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            replied: 0,
            unsubscribed: 0,
          },
        ],
      } as any)

      const result = await service.getMetrics({
        domainId: 'domain123',
        period: 'hour',
      })

      expect(result.deliveryRate).toBe(0)
      expect(result.bounceRate).toBe(0)
      expect(result.complaintRate).toBe(0)
      expect(result.status).toBe('excellent')
    })

    it('should use custom date range when provided', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [{ sent: 100, delivered: 95, bounced: 5, complained: 0, failed: 0, opened: 30, clicked: 10, replied: 2, unsubscribed: 1 }],
      } as any)

      await service.getMetrics({
        domainId: 'domain123',
        period: 'day',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z',
      })

      expect(env.DB.execute).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['domain123', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z']))
    })
  })

  describe('getReputation', () => {
    it('should return cached reputation if available and not refreshing', async () => {
      const cachedReputation = {
        domainId: 'domain123',
        senderScore: 85,
        ipReputation: 90,
        domainReputation: 88,
        blacklistCount: 0,
        blacklists: [],
        spfStatus: 'pass' as const,
        dkimStatus: 'pass' as const,
        dmarcStatus: 'pass' as const,
        lastChecked: '2024-01-01T12:00:00Z',
      }

      vi.mocked(env.KV.get).mockResolvedValue(JSON.stringify(cachedReputation))

      const result = await service.getReputation({
        domainId: 'domain123',
        refresh: false,
      })

      expect(result).toEqual(cachedReputation)
      expect(env.DB.execute).not.toHaveBeenCalled()
    })

    it('should query database when refresh is true', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            id: 'domain123',
            spf_verified: true,
            dkim_verified: true,
            dmarc_verified: true,
            warmup_status: 'completed',
          },
        ],
      } as any)

      const result = await service.getReputation({
        domainId: 'domain123',
        refresh: true,
      })

      expect(result).toMatchObject({
        domainId: 'domain123',
        senderScore: 110,
        spfStatus: 'pass',
        dkimStatus: 'pass',
        dmarcStatus: 'pass',
        blacklistCount: 0,
      })

      expect(env.KV.put).toHaveBeenCalledWith(`reputation:domain123`, expect.any(String), { expirationTtl: 3600 })
    })

    it('should calculate correct sender score with missing DNS records', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            id: 'domain123',
            spf_verified: false,
            dkim_verified: false,
            dmarc_verified: false,
            warmup_status: 'in_progress',
          },
        ],
      } as any)

      const result = await service.getReputation({
        domainId: 'domain123',
        refresh: true,
      })

      // 100 - 10 (no SPF) - 10 (no DKIM) - 5 (no DMARC) - 10 (warmup not complete) = 65
      expect(result.senderScore).toBe(65)
      expect(result.spfStatus).toBe('fail')
      expect(result.dkimStatus).toBe('fail')
      expect(result.dmarcStatus).toBe('fail')
    })

    it('should throw error if domain not found', async () => {
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [],
      } as any)

      await expect(
        service.getReputation({
          domainId: 'nonexistent',
          refresh: true,
        })
      ).rejects.toThrow('Domain nonexistent not found')
    })

    it('should query database when cache is empty', async () => {
      vi.mocked(env.KV.get).mockResolvedValue(null)
      vi.mocked(env.DB.execute).mockResolvedValue({
        rows: [
          {
            id: 'domain123',
            spf_verified: true,
            dkim_verified: true,
            dmarc_verified: false,
            warmup_status: 'completed',
          },
        ],
      } as any)

      const result = await service.getReputation({
        domainId: 'domain123',
      })

      expect(result.senderScore).toBe(95) // 100 - 5 (no DMARC) + 10 (warmup complete) - 10 (warmup not complete deduction doesn't apply)
      expect(env.DB.execute).toHaveBeenCalled()
    })
  })

  describe('analyzeDomain', () => {
    beforeEach(() => {
      // Mock getMetrics
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [{ sent: 1000, delivered: 950, bounced: 30, complained: 2, failed: 18, opened: 285, clicked: 95, replied: 20, unsubscribed: 10 }],
      } as any)

      // Mock getReputation
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [
          {
            id: 'domain123',
            spf_verified: true,
            dkim_verified: false,
            dmarc_verified: false,
            warmup_status: 'completed',
          },
        ],
      } as any)
    })

    it('should analyze domain and return comprehensive report', async () => {
      const result = await service.analyzeDomain({
        domainId: 'domain123',
        depth: 'quick',
      })

      expect(result).toMatchObject({
        domainId: 'domain123',
        status: 'warning',
      })

      expect(result.metrics).toBeDefined()
      expect(result.reputation).toBeDefined()
      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.issues).toBeInstanceOf(Array)
    })

    it('should identify critical bounce rate issues', async () => {
      // Override mock with critical bounce rate
      vi.mocked(env.DB.execute).mockReset()
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [{ sent: 1000, delivered: 850, bounced: 150, complained: 2, failed: 0, opened: 250, clicked: 80, replied: 15, unsubscribed: 5 }],
      } as any)
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [{ id: 'domain123', spf_verified: true, dkim_verified: true, dmarc_verified: true, warmup_status: 'completed' }],
      } as any)

      const result = await service.analyzeDomain({
        domainId: 'domain123',
        depth: 'full',
      })

      expect(result.status).toBe('critical')
      const criticalIssues = result.issues.filter((i) => i.severity === 'critical')
      expect(criticalIssues.length).toBeGreaterThan(0)
      expect(criticalIssues.some((i) => i.category === 'bounce_rate')).toBe(true)
    })

    it('should identify critical complaint rate issues', async () => {
      vi.mocked(env.DB.execute).mockReset()
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [{ sent: 1000, delivered: 980, bounced: 10, complained: 50, failed: 10, opened: 300, clicked: 90, replied: 15, unsubscribed: 5 }],
      } as any)
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [{ id: 'domain123', spf_verified: true, dkim_verified: true, dmarc_verified: true, warmup_status: 'completed' }],
      } as any)

      const result = await service.analyzeDomain({
        domainId: 'domain123',
        depth: 'quick',
      })

      expect(result.status).toBe('critical')
      const criticalIssues = result.issues.filter((i) => i.severity === 'critical')
      expect(criticalIssues.some((i) => i.category === 'complaint_rate')).toBe(true)
    })

    it('should identify DNS authentication warnings', async () => {
      const result = await service.analyzeDomain({
        domainId: 'domain123',
        depth: 'quick',
      })

      const dnsIssues = result.issues.filter((i) => i.category === 'dns_auth')
      expect(dnsIssues.length).toBeGreaterThan(0)
      expect(dnsIssues.some((i) => i.message.includes('DKIM'))).toBe(true)
    })

    it('should identify engagement issues', async () => {
      vi.mocked(env.DB.execute).mockReset()
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [{ sent: 1000, delivered: 980, bounced: 10, complained: 1, failed: 9, opened: 98, clicked: 10, replied: 2, unsubscribed: 5 }],
      } as any)
      vi.mocked(env.DB.execute).mockResolvedValueOnce({
        rows: [{ id: 'domain123', spf_verified: true, dkim_verified: true, dmarc_verified: true, warmup_status: 'completed' }],
      } as any)

      const result = await service.analyzeDomain({
        domainId: 'domain123',
        depth: 'quick',
      })

      const engagementIssues = result.issues.filter((i) => i.category === 'engagement')
      expect(engagementIssues.length).toBeGreaterThan(0)
    })

    it('should use quick analysis by default', async () => {
      const result = await service.analyzeDomain({
        domainId: 'domain123',
      })

      expect(result.metrics.period).toBe('week')
    })

    it('should refresh reputation with full analysis', async () => {
      const result = await service.analyzeDomain({
        domainId: 'domain123',
        depth: 'full',
      })

      expect(result.reputation).toBeDefined()
    })
  })

  describe('HTTP API', () => {
    it('should handle health check', async () => {
      const response = await service.fetch(new Request('http://localhost/health'), env)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        status: 'ok',
        service: 'deliverability',
        version: '1.0.0',
      })
    })
  })

  describe('calculateStatus', () => {
    it('should return critical for high bounce rate', async () => {
      const service = new DeliverabilityService(env.ctx, env)
      const status = (service as any).calculateStatus(0.11, 0.001, 0.95)
      expect(status).toBe('critical')
    })

    it('should return critical for high complaint rate', async () => {
      const service = new DeliverabilityService(env.ctx, env)
      const status = (service as any).calculateStatus(0.03, 0.006, 0.95)
      expect(status).toBe('critical')
    })

    it('should return critical for low delivery rate', async () => {
      const service = new DeliverabilityService(env.ctx, env)
      const status = (service as any).calculateStatus(0.03, 0.001, 0.84)
      expect(status).toBe('critical')
    })

    it('should return warning for moderate bounce rate', async () => {
      const service = new DeliverabilityService(env.ctx, env)
      const status = (service as any).calculateStatus(0.06, 0.001, 0.95)
      expect(status).toBe('warning')
    })

    it('should return excellent for great metrics', async () => {
      const service = new DeliverabilityService(env.ctx, env)
      const status = (service as any).calculateStatus(0.01, 0.0003, 0.99)
      expect(status).toBe('excellent')
    })

    it('should return good for decent metrics', async () => {
      const service = new DeliverabilityService(env.ctx, env)
      const status = (service as any).calculateStatus(0.03, 0.0008, 0.96)
      expect(status).toBe('good')
    })
  })
})
