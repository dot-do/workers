/**
 * Veo 3 Video Generation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VeoService } from '../src/index'
import { generateBatchPrompts, getAllPromptTemplates } from '../src/prompts'

describe('VeoService', () => {
  let service: VeoService
  let env: any

  beforeEach(() => {
    env = {
      VIDEOS: {
        put: async () => {},
        get: async () => null,
      },
      DB: {
        execute: async () => ({ rows: [] }),
      },
      GOOGLE_API_KEY: 'test-key',
    }
    const ctx = {
      waitUntil: () => {},
    }
    service = new VeoService(ctx as any, env)
  })

  describe('generateVideo', () => {
    it('should create video generation request', async () => {
      const result = await service.generateVideo({
        prompt: 'A surgeon performs surgery',
        aspectRatio: '16:9',
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.status).toBe('pending')
      expect(result.prompt).toBe('A surgeon performs surgery')
      expect(result.aspectRatio).toBe('16:9')
    })

    it('should validate prompt length', async () => {
      await expect(
        service.generateVideo({
          prompt: 'short',
          aspectRatio: '16:9',
        })
      ).rejects.toThrow()
    })

    it('should default to 16:9 aspect ratio', async () => {
      const result = await service.generateVideo({
        prompt: 'A surgeon performs surgery in a hospital',
      })

      expect(result.aspectRatio).toBe('16:9')
    })
  })

  describe('generateBatch', () => {
    it('should generate multiple videos', async () => {
      const result = await service.generateBatch({
        prompts: [
          { prompt: 'A surgeon performs surgery' },
          { prompt: 'A welder welds metal components' },
        ],
      })

      expect(result).toBeDefined()
      expect(result.batchId).toBeDefined()
      expect(result.videos).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should enforce max batch size', async () => {
      const prompts = Array(11).fill({ prompt: 'A surgeon performs surgery' })

      await expect(
        service.generateBatch({ prompts })
      ).rejects.toThrow()
    })
  })

  describe('generateTestBatch', () => {
    it('should generate 5 test videos', async () => {
      const result = await service.generateTestBatch()

      expect(result).toBeDefined()
      expect(result.videos).toHaveLength(5)
      expect(result.total).toBe(5)
    })

    it('should alternate aspect ratios', async () => {
      const result = await service.generateTestBatch()

      expect(result.videos[0].aspectRatio).toBe('16:9')
      expect(result.videos[1].aspectRatio).toBe('9:16')
      expect(result.videos[2].aspectRatio).toBe('16:9')
      expect(result.videos[3].aspectRatio).toBe('9:16')
      expect(result.videos[4].aspectRatio).toBe('16:9')
    })
  })

  describe('getVideo', () => {
    it('should return null for non-existent video', async () => {
      const result = await service.getVideo('non-existent')

      expect(result).toBeNull()
    })

    it('should return video details when found', async () => {
      env.DB.execute = async () => ({
        rows: [
          {
            id: 'test-id',
            prompt: 'Test prompt',
            aspect_ratio: '16:9',
            status: 'completed',
            video_url: 'https://example.com/video.mp4',
            r2_key: 'videos/2025/10/test-id.mp4',
            created_at: '2025-10-03T00:00:00Z',
            completed_at: '2025-10-03T00:05:00Z',
            metadata: '{"test": true}',
          },
        ],
      })

      const result = await service.getVideo('test-id')

      expect(result).toBeDefined()
      expect(result?.id).toBe('test-id')
      expect(result?.status).toBe('completed')
      expect(result?.videoUrl).toBe('https://example.com/video.mp4')
    })
  })
})

describe('Prompts', () => {
  it('should have 5 diverse prompt templates', () => {
    const templates = getAllPromptTemplates()

    expect(templates).toHaveLength(5)
    expect(templates.map((t) => t.industry)).toEqual([
      'Healthcare',
      'Manufacturing',
      'Technology',
      'Retail',
      'Construction',
    ])
  })

  it('should generate complete prompts', () => {
    const prompts = generateBatchPrompts()

    expect(prompts).toHaveLength(5)
    prompts.forEach((prompt) => {
      expect(prompt).toContain('In the')
      expect(prompt).toContain('industry')
      expect(prompt).toContain('Audio:')
      expect(prompt.length).toBeGreaterThan(100)
    })
  })
})
