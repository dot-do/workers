/**
 * Ads Audience Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdsAudienceService } from '../src/index'
import type { Env } from '../src/index'
import { AudienceType, AudienceStatus, MatchType, AdPlatform, type AudienceDefinition, type CustomerList, type RetargetingRules } from '@dot-do/ads-types'

describe('AdsAudienceService', () => {
  let service: AdsAudienceService
  let mockEnv: Env

  beforeEach(() => {
    // Mock environment
    mockEnv = {
      AUDIENCES_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      } as any,
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(null),
        })),
      } as any,
      CUSTOMER_LISTS: {
        put: vi.fn().mockResolvedValue(undefined),
      } as any,
      AUDIENCE_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      } as any,
      ANALYTICS: {
        writeDataPoint: vi.fn(),
      } as any,
    }

    service = new AdsAudienceService({} as any, mockEnv)
  })

  describe('Audience CRUD', () => {
    it('should create an audience', async () => {
      const definition: AudienceDefinition = {
        name: 'Test Audience',
        type: AudienceType.Custom,
        size: 10000,
      }

      const audience = await service.createAudience(definition)

      expect(audience).toBeDefined()
      expect(audience.id).toBeDefined()
      expect(audience.definition.name).toBe('Test Audience')
      expect(audience.definition.type).toBe(AudienceType.Custom)
      expect(audience.size).toBe(10000)
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUDIENCES_KV.put).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should update an audience', async () => {
      const audienceId = 'test-audience-id'
      const existingAudience = {
        id: audienceId,
        status: AudienceStatus.Active,
        size: 10000,
        platforms: [],
        definition: {
          name: 'Old Name',
          type: AudienceType.Custom,
          size: 10000,
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(existingAudience))

      const updates = { name: 'New Name' }
      const updatedAudience = await service.updateAudience(audienceId, updates)

      expect(updatedAudience.definition.name).toBe('New Name')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUDIENCES_KV.put).toHaveBeenCalled()
    })

    it('should delete an audience', async () => {
      const audienceId = 'test-audience-id'
      const existingAudience = {
        id: audienceId,
        status: AudienceStatus.Active,
        size: 10000,
        platforms: [],
        definition: {
          name: 'Test Audience',
          type: AudienceType.Custom,
          size: 10000,
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(existingAudience))

      await service.deleteAudience(audienceId)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUDIENCES_KV.delete).toHaveBeenCalledWith(`audience:${audienceId}`)
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })
  })

  describe('Customer Lists', () => {
    it('should upload customer list', async () => {
      const list: CustomerList = {
        matchType: MatchType.Email,
        data: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
      }

      const audience = await service.uploadCustomerList(list, 'Newsletter Subscribers', 'Email list from newsletter signups')

      expect(audience).toBeDefined()
      expect(audience.definition.name).toBe('Newsletter Subscribers')
      expect(audience.definition.type).toBe(AudienceType.Custom)
      expect(mockEnv.CUSTOMER_LISTS.put).toHaveBeenCalled()
      expect(mockEnv.AUDIENCE_QUEUE.send).toHaveBeenCalled()
    })
  })

  describe('Lookalike Audiences', () => {
    it('should create lookalike audience', async () => {
      const sourceAudienceId = 'source-audience-id'
      const sourceAudience = {
        id: sourceAudienceId,
        status: AudienceStatus.Active,
        size: 1000,
        platforms: [],
        definition: {
          name: 'High Value Customers',
          type: AudienceType.Custom,
          size: 1000,
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(sourceAudience))

      const lookalike = await service.createLookalikeAudience(sourceAudienceId, 5, ['US', 'CA'])

      expect(lookalike).toBeDefined()
      expect(lookalike.definition.type).toBe(AudienceType.Lookalike)
      expect(lookalike.size).toBeGreaterThan(sourceAudience.size)
      expect(lookalike.definition.name).toContain('Lookalike')
      expect(mockEnv.AUDIENCE_QUEUE.send).toHaveBeenCalled()
    })
  })

  describe('Retargeting Audiences', () => {
    it('should create retargeting audience', async () => {
      const pixelId = 'pixel-123'
      const rules: RetargetingRules = {
        pixelId,
        timeWindow: 30,
        events: ['page_view'],
        urlRules: [
          { operator: 'contains', value: '/products' },
        ],
      }

      const audience = await service.createRetargetingAudience(pixelId, rules)

      expect(audience).toBeDefined()
      expect(audience.definition.type).toBe(AudienceType.Retargeting)
      expect(audience.definition.rules).toBeDefined()
      expect(mockEnv.AUDIENCE_QUEUE.send).toHaveBeenCalled()
    })
  })

  describe('Audience Segmentation', () => {
    it('should segment audience', async () => {
      const audienceId = 'test-audience-id'
      const audience = {
        id: audienceId,
        status: AudienceStatus.Active,
        size: 100000,
        platforms: [],
        definition: {
          name: 'All Customers',
          type: AudienceType.Custom,
          size: 100000,
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(audience))

      const criteria = [
        { field: 'age', operator: 'greater_than' as const, value: 30 },
        { field: 'location', operator: 'equals' as const, value: 'US' },
      ]

      const segments = await service.segmentAudience(audienceId, criteria)

      expect(segments).toBeDefined()
      expect(segments.length).toBe(2)
      expect(segments[0].audienceId).toBe(audienceId)
      expect(segments[0].size).toBeGreaterThan(0)
    })
  })

  describe('Audience Combination', () => {
    it('should combine audiences with AND operator', async () => {
      const audience1 = {
        id: 'audience-1',
        status: AudienceStatus.Active,
        size: 50000,
        platforms: [],
        definition: { name: 'Email Subscribers', type: AudienceType.Custom, size: 50000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      const audience2 = {
        id: 'audience-2',
        status: AudienceStatus.Active,
        size: 80000,
        platforms: [],
        definition: { name: 'Website Visitors', type: AudienceType.Custom, size: 80000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'audience:audience-1') return Promise.resolve(JSON.stringify(audience1))
        if (key === 'audience:audience-2') return Promise.resolve(JSON.stringify(audience2))
        return Promise.resolve(null)
      })

      const combined = await service.combineAudiences(['audience-1', 'audience-2'], 'AND')

      expect(combined).toBeDefined()
      expect(combined.definition.type).toBe(AudienceType.Custom)
      expect(combined.definition.rules?.operator).toBe('AND')
      expect(combined.size).toBeLessThanOrEqual(Math.min(audience1.size, audience2.size))
    })

    it('should combine audiences with OR operator', async () => {
      const audience1 = {
        id: 'audience-1',
        status: AudienceStatus.Active,
        size: 50000,
        platforms: [],
        definition: { name: 'Email Subscribers', type: AudienceType.Custom, size: 50000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      const audience2 = {
        id: 'audience-2',
        status: AudienceStatus.Active,
        size: 80000,
        platforms: [],
        definition: { name: 'Website Visitors', type: AudienceType.Custom, size: 80000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'audience:audience-1') return Promise.resolve(JSON.stringify(audience1))
        if (key === 'audience:audience-2') return Promise.resolve(JSON.stringify(audience2))
        return Promise.resolve(null)
      })

      const combined = await service.combineAudiences(['audience-1', 'audience-2'], 'OR')

      expect(combined).toBeDefined()
      expect(combined.definition.type).toBe(AudienceType.Custom)
      expect(combined.definition.rules?.operator).toBe('OR')
      expect(combined.size).toBeGreaterThan(0)
    })
  })

  describe('Audience Insights', () => {
    it('should get audience insights', async () => {
      const audienceId = 'test-audience-id'
      const audience = {
        id: audienceId,
        status: AudienceStatus.Active,
        size: 100000,
        platforms: [],
        definition: { name: 'Test Audience', type: AudienceType.Custom, size: 100000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(audience))

      const insights = await service.getAudienceInsights(audienceId)

      expect(insights).toBeDefined()
      expect(insights.demographics).toBeDefined()
      expect(insights.demographics.age).toBeDefined()
      expect(insights.demographics.gender).toBeDefined()
      expect(insights.interests).toBeDefined()
      expect(insights.behaviors).toBeDefined()
    })
  })

  describe('Audience Overlap', () => {
    it('should analyze audience overlap', async () => {
      const audience1 = {
        id: 'audience-1',
        status: AudienceStatus.Active,
        size: 50000,
        platforms: [],
        definition: { name: 'Audience 1', type: AudienceType.Custom, size: 50000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      const audience2 = {
        id: 'audience-2',
        status: AudienceStatus.Active,
        size: 80000,
        platforms: [],
        definition: { name: 'Audience 2', type: AudienceType.Custom, size: 80000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'audience:audience-1') return Promise.resolve(JSON.stringify(audience1))
        if (key === 'audience:audience-2') return Promise.resolve(JSON.stringify(audience2))
        return Promise.resolve(null)
      })

      const overlap = await service.getAudienceOverlap(['audience-1', 'audience-2'])

      expect(overlap).toBeDefined()
      expect(overlap.audiences).toHaveLength(2)
      expect(overlap.overlaps).toBeDefined()
      expect(overlap.overlaps.length).toBeGreaterThan(0)
      expect(overlap.unique).toBeDefined()
    })
  })

  describe('Platform Sync', () => {
    it('should sync audience to platform', async () => {
      const audienceId = 'test-audience-id'
      const audience = {
        id: audienceId,
        status: AudienceStatus.Active,
        size: 10000,
        platforms: [],
        definition: { name: 'Test Audience', type: AudienceType.Custom, size: 10000 },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUDIENCES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(audience))

      await service.syncAudienceToPlatform(audienceId, AdPlatform.GoogleAds)

      expect(mockEnv.AUDIENCE_QUEUE.send).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })
  })
})
