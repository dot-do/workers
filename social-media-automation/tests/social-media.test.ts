import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SocialMediaAutomationService } from '../src/index'
import type { Env } from '../src/types'

describe('SocialMediaAutomationService', () => {
  let service: SocialMediaAutomationService
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
      SOCIAL_QUEUE: mockQueue as any,
      EMAIL_SERVICE: {},
      ANALYTICS_SERVICE: {},
      STORAGE_SERVICE: {},
    }

    service = new SocialMediaAutomationService({} as any, mockEnv)
  })

  describe('createPost', () => {
    it('should create a social media post', async () => {
      const request = {
        userId: 'user_123',
        platform: 'twitter' as const,
        type: 'text' as const,
        content: 'Hello world! #testing',
        hashtags: ['testing'],
        schedulingType: 'draft' as const,
      }

      const result = await service.createPost(request)

      expect(result.post).toBeDefined()
      expect(result.post.userId).toBe(request.userId)
      expect(result.post.platform).toBe(request.platform)
      expect(result.post.content).toBe(request.content)
      expect(result.post.status).toBe('draft')
    })

    it('should reject content exceeding platform limits', async () => {
      const request = {
        userId: 'user_123',
        platform: 'twitter' as const,
        type: 'text' as const,
        content: 'a'.repeat(300), // Twitter limit is 280
        schedulingType: 'draft' as const,
      }

      await expect(service.createPost(request)).rejects.toThrow('exceeds maximum length')
    })

    it('should schedule post for immediate publishing', async () => {
      const request = {
        userId: 'user_123',
        platform: 'twitter' as const,
        type: 'text' as const,
        content: 'Immediate post',
        schedulingType: 'immediate' as const,
      }

      const result = await service.createPost(request)

      expect(result.post.status).toBe('publishing')
      expect(mockEnv.SOCIAL_QUEUE.send).toHaveBeenCalled()
    })

    it('should schedule post for specific time', async () => {
      const futureDate = new Date()
      futureDate.setHours(futureDate.getHours() + 2)

      const request = {
        userId: 'user_123',
        platform: 'linkedin' as const,
        type: 'text' as const,
        content: 'Scheduled post',
        schedulingType: 'scheduled' as const,
        scheduledAt: futureDate.toISOString(),
      }

      const result = await service.createPost(request)

      expect(result.post.status).toBe('scheduled')
      expect(result.post.scheduledAt).toBe(request.scheduledAt)
    })

    it('should handle media URLs', async () => {
      const request = {
        userId: 'user_123',
        platform: 'instagram' as const,
        type: 'image' as const,
        content: 'Check out this image! #photography',
        hashtags: ['photography'],
        mediaUrls: ['https://example.com/image.jpg'],
        schedulingType: 'draft' as const,
      }

      const result = await service.createPost(request)

      expect(result.post.mediaUrls).toEqual(request.mediaUrls)
      expect(result.post.type).toBe('image')
    })

    it('should reject too many hashtags', async () => {
      const request = {
        userId: 'user_123',
        platform: 'twitter' as const,
        type: 'text' as const,
        content: 'Too many tags',
        hashtags: Array(15).fill('tag'), // Twitter limit is 10
        schedulingType: 'draft' as const,
      }

      await expect(service.createPost(request)).rejects.toThrow('Too many hashtags')
    })
  })

  describe('updatePost', () => {
    it('should update post content', async () => {
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() =>
            Promise.resolve({
              id: 'post_123',
              user_id: 'user_123',
              platform: 'twitter',
              type: 'text',
              status: 'draft',
              content: 'Original content',
              scheduling_type: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          ),
          run: vi.fn(() => Promise.resolve({ success: true })),
        })),
      })) as any

      const request = {
        postId: 'post_123',
        content: 'Updated content',
      }

      const result = await service.updatePost(request)

      expect(result).toBeDefined()
      expect(result.id).toBe('post_123')
    })

    it('should reject update of published post', async () => {
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() =>
            Promise.resolve({
              id: 'post_123',
              status: 'published',
            })
          ),
        })),
      })) as any

      const request = {
        postId: 'post_123',
        content: 'Cannot update',
      }

      await expect(service.updatePost(request)).rejects.toThrow('Cannot update published posts')
    })
  })

  describe('publishPost', () => {
    it('should publish a scheduled post', async () => {
      const past = new Date()
      past.setHours(past.getHours() - 1)

      mockEnv.DB.prepare = vi.fn((query) => {
        if (query.includes('platform_connections')) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(() =>
                Promise.resolve({
                  id: 'conn_123',
                  user_id: 'user_123',
                  platform: 'twitter',
                  status: 'active',
                  access_token: 'token_123',
                })
              ),
            })),
          }
        }
        return {
          bind: vi.fn(() => ({
            first: vi.fn(() =>
              Promise.resolve({
                id: 'post_123',
                user_id: 'user_123',
                platform: 'twitter',
                type: 'text',
                status: 'scheduled',
                content: 'Ready to publish',
                scheduled_at: past.toISOString(),
              })
            ),
            run: vi.fn(() => Promise.resolve({ success: true })),
          })),
        }
      }) as any

      const request = {
        postId: 'post_123',
      }

      const result = await service.publishPost(request)

      expect(result.post.status).toBe('published')
      expect(result.platformPostId).toBeDefined()
      expect(result.platformUrl).toBeDefined()
    })

    it('should reject publish without platform connection', async () => {
      mockEnv.DB.prepare = vi.fn((query) => {
        if (query.includes('platform_connections')) {
          return {
            bind: vi.fn(() => ({
              first: vi.fn(() => Promise.resolve(null)),
            })),
          }
        }
        return {
          bind: vi.fn(() => ({
            first: vi.fn(() =>
              Promise.resolve({
                id: 'post_123',
                user_id: 'user_123',
                platform: 'twitter',
                status: 'draft',
              })
            ),
          })),
        }
      }) as any

      const request = {
        postId: 'post_123',
      }

      await expect(service.publishPost(request)).rejects.toThrow('No active twitter connection')
    })
  })

  describe('connectPlatform', () => {
    it('should connect a new platform', async () => {
      const request = {
        userId: 'user_123',
        platform: 'twitter' as const,
        accessToken: 'token_123',
      }

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() => Promise.resolve(null)), // No existing connection
          run: vi.fn(() => Promise.resolve({ success: true })),
        })),
      })) as any

      const result = await service.connectPlatform(request)

      expect(result).toBeDefined()
      expect(result.platform).toBe(request.platform)
      expect(result.status).toBe('active')
    })

    it('should update existing connection', async () => {
      const request = {
        userId: 'user_123',
        platform: 'twitter' as const,
        accessToken: 'new_token_123',
      }

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(() =>
            Promise.resolve({
              id: 'conn_123',
              user_id: 'user_123',
              platform: 'twitter',
              status: 'expired',
            })
          ),
          run: vi.fn(() => Promise.resolve({ success: true })),
        })),
      })) as any

      const result = await service.connectPlatform(request)

      expect(result).toBeDefined()
    })
  })

  describe('createQueue', () => {
    it('should create a content queue', async () => {
      const request = {
        userId: 'user_123',
        name: 'My Queue',
        platforms: ['twitter', 'linkedin'] as const,
        postsPerDay: 3,
        timezone: 'America/Los_Angeles',
      }

      const result = await service.createQueue(request)

      expect(result).toBeDefined()
      expect(result.name).toBe(request.name)
      expect(result.platforms).toEqual(request.platforms)
      expect(result.postsPerDay).toBe(request.postsPerDay)
      expect(result.status).toBe('active')
    })

    it('should support preferred posting times', async () => {
      const request = {
        userId: 'user_123',
        name: 'Scheduled Queue',
        platforms: ['twitter'] as const,
        postsPerDay: 2,
        preferredTimes: ['09:00', '17:00'],
        timezone: 'America/New_York',
      }

      const result = await service.createQueue(request)

      expect(result.preferredTimes).toEqual(request.preferredTimes)
    })
  })

  describe('getOptimalTimes', () => {
    it('should return optimal posting times', async () => {
      const request = {
        userId: 'user_123',
        platform: 'twitter' as const,
      }

      const result = await service.getOptimalTimes(request)

      expect(result.optimalTimes).toBeDefined()
      expect(result.optimalTimes.length).toBeGreaterThan(0)
      expect(result.recommendation).toBeDefined()
    })

    it('should return sorted optimal times', async () => {
      const request = {
        userId: 'user_123',
        platform: 'linkedin' as const,
      }

      const result = await service.getOptimalTimes(request)

      const scores = result.optimalTimes.map((t) => t.score)
      const sortedScores = [...scores].sort((a, b) => b - a)

      expect(scores).toEqual(sortedScores)
    })
  })

  describe('getAnalytics', () => {
    it('should return post analytics', async () => {
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(() =>
            Promise.resolve({
              results: [
                {
                  post_id: 'post_123',
                  platform: 'twitter',
                  date: '2025-10-03',
                  likes: 10,
                  comments: 2,
                  shares: 3,
                  views: 100,
                  clicks: 5,
                  engagement_rate: 15,
                  click_through_rate: 5,
                },
              ],
            })
          ),
        })),
      })) as any

      const request = {
        postId: 'post_123',
      }

      const result = await service.getAnalytics(request)

      expect(result.analytics).toBeDefined()
      expect(result.analytics.length).toBe(1)
      expect(result.summary).toBeDefined()
      expect(result.summary.totalLikes).toBe(10)
    })

    it('should calculate summary metrics', async () => {
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(() =>
            Promise.resolve({
              results: [
                { likes: 10, comments: 2, shares: 3, views: 100, clicks: 5, engagement_rate: 15, click_through_rate: 5 },
                { likes: 20, comments: 4, shares: 6, views: 200, clicks: 10, engagement_rate: 15, click_through_rate: 5 },
              ],
            })
          ),
        })),
      })) as any

      const request = {
        userId: 'user_123',
      }

      const result = await service.getAnalytics(request)

      expect(result.summary.totalLikes).toBe(30)
      expect(result.summary.totalComments).toBe(6)
      expect(result.summary.avgEngagementRate).toBe(15)
    })
  })
})
