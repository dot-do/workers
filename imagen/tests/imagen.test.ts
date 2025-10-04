/**
 * Imagen AI Image Generation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ImagenService } from '../src/index'
import { generateBatchPrompts, getAllPromptTemplates } from '../src/prompts'

describe('ImagenService', () => {
  let service: ImagenService
  let env: any

  beforeEach(() => {
    env = {
      IMAGES: {
        put: async () => {},
        get: async () => null,
      },
      DB: {
        execute: async () => ({ rows: [] }),
      },
      GOOGLE_API_KEY: 'test-key',
      OPENAI_API_KEY: 'test-key',
    }
    const ctx = {
      waitUntil: () => {},
    }
    service = new ImagenService(ctx as any, env)
  })

  describe('generateImage', () => {
    it('should create image generation request', async () => {
      const result = await service.generateImage({
        prompt: 'A surgeon examines holographic medical data',
        provider: 'google-imagen',
        size: '1024x1024',
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.status).toBe('pending')
      expect(result.prompt).toBe('A surgeon examines holographic medical data')
      expect(result.provider).toBe('google-imagen')
      expect(result.size).toBe('1024x1024')
    })

    it('should validate prompt length', async () => {
      await expect(
        service.generateImage({
          prompt: 'short',
          provider: 'google-imagen',
        })
      ).rejects.toThrow()
    })

    it('should default to google-imagen provider', async () => {
      const result = await service.generateImage({
        prompt: 'A surgeon examines holographic medical data',
      })

      expect(result.provider).toBe('google-imagen')
    })

    it('should support OpenAI DALL-E provider', async () => {
      const result = await service.generateImage({
        prompt: 'A surgeon examines holographic medical data',
        provider: 'openai-dalle',
      })

      expect(result.provider).toBe('openai-dalle')
    })
  })

  describe('generateBatch', () => {
    it('should generate multiple images', async () => {
      const result = await service.generateBatch({
        prompts: [
          { prompt: 'A surgeon examines holographic medical data', provider: 'google-imagen' },
          { prompt: 'A welder works alongside robotic arm', provider: 'openai-dalle' },
        ],
      })

      expect(result).toBeDefined()
      expect(result.batchId).toBeDefined()
      expect(result.images).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should enforce max batch size', async () => {
      const prompts = Array(11).fill({ prompt: 'A surgeon examines holographic medical data' })

      await expect(service.generateBatch({ prompts })).rejects.toThrow()
    })
  })

  describe('generateTestBatch', () => {
    it('should generate 5 test images', async () => {
      const result = await service.generateTestBatch()

      expect(result).toBeDefined()
      expect(result.images).toHaveLength(5)
      expect(result.total).toBe(5)
    })

    it('should alternate providers', async () => {
      const result = await service.generateTestBatch()

      expect(result.images[0].provider).toBe('google-imagen')
      expect(result.images[1].provider).toBe('openai-dalle')
      expect(result.images[2].provider).toBe('google-imagen')
      expect(result.images[3].provider).toBe('openai-dalle')
      expect(result.images[4].provider).toBe('google-imagen')
    })

    it('should mix image sizes', async () => {
      const result = await service.generateTestBatch()

      expect(result.images[0].size).toBe('1024x1024')
      expect(result.images[1].size).toBe('1024x1024')
      expect(result.images[2].size).toBe('1024x1024')
      expect(result.images[3].size).toBe('1792x1024')
      expect(result.images[4].size).toBe('1792x1024')
    })
  })

  describe('getImage', () => {
    it('should return null for non-existent image', async () => {
      const result = await service.getImage('non-existent')

      expect(result).toBeNull()
    })

    it('should return image details when found', async () => {
      env.DB.execute = async () => ({
        rows: [
          {
            id: 'test-id',
            prompt: 'Test prompt',
            provider: 'google-imagen',
            size: '1024x1024',
            status: 'completed',
            image_url: 'https://example.com/image.png',
            r2_key: 'images/2025/10/test-id.png',
            created_at: '2025-10-03T00:00:00Z',
            completed_at: '2025-10-03T00:05:00Z',
            metadata: '{"test": true}',
          },
        ],
      })

      const result = await service.getImage('test-id')

      expect(result).toBeDefined()
      expect(result?.id).toBe('test-id')
      expect(result?.status).toBe('completed')
      expect(result?.imageUrl).toBe('https://example.com/image.png')
      expect(result?.provider).toBe('google-imagen')
    })
  })
})

describe('Prompts', () => {
  it('should have 5 diverse prompt templates', () => {
    const templates = getAllPromptTemplates()

    expect(templates).toHaveLength(5)
    expect(templates.map((t) => t.industry)).toEqual(['Healthcare', 'Manufacturing', 'Technology', 'Retail', 'Construction'])
  })

  it('should generate complete prompts', () => {
    const prompts = generateBatchPrompts()

    expect(prompts).toHaveLength(5)
    prompts.forEach((prompt) => {
      expect(prompt).toContain('Style:')
      expect(prompt).toContain('Lighting:')
      expect(prompt).toContain('Mood:')
      expect(prompt.length).toBeGreaterThan(100)
    })
  })
})
