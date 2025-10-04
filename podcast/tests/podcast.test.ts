/**
 * Podcast AI Generation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PodcastService } from '../src/index'
import { generateBatchPodcastPrompts, getAllPodcastTemplates } from '../src/prompts'

describe('PodcastService', () => {
  let service: PodcastService
  let env: any

  beforeEach(() => {
    env = {
      AUDIO: {
        put: async () => {},
        get: async () => null,
      },
      DB: {
        execute: async () => ({ rows: [] }),
      },
      VOICE: {
        generateVoice: async () => ({
          id: 'voice-123',
          status: 'completed',
          audioUrl: 'https://example.com/audio.mp3',
          r2Key: 'voice/2025/10/voice-123.mp3',
        }),
        getVoice: async () => ({
          id: 'voice-123',
          status: 'completed',
          audioUrl: 'https://example.com/audio.mp3',
          r2Key: 'voice/2025/10/voice-123.mp3',
        }),
      },
      OPENAI_API_KEY: 'test-key',
      ELEVENLABS_API_KEY: 'test-key',
      GOOGLE_CLOUD_API_KEY: 'test-key',
    }
    const ctx = {
      waitUntil: () => {},
    }
    service = new PodcastService(ctx as any, env)
  })

  describe('generatePodcast', () => {
    it('should create podcast generation request', async () => {
      const result = await service.generatePodcast({
        title: 'Test Podcast',
        format: 'interview',
        topic: 'Testing podcast generation',
        speakers: [
          { id: 'host1', name: 'Alex', role: 'host', provider: 'openai', voice: 'onyx' },
          { id: 'guest1', name: 'Sarah', role: 'guest', provider: 'elevenlabs', voice: 'rachel' },
        ],
        dialogue: [
          { speaker: 'host1', text: 'Welcome to our show!' },
          { speaker: 'guest1', text: 'Thanks for having me!' },
        ],
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.status).toBe('pending')
      expect(result.title).toBe('Test Podcast')
      expect(result.format).toBe('interview')
      expect(result.speakers).toHaveLength(2)
    })

    it('should validate required fields', async () => {
      await expect(
        service.generatePodcast({
          title: '',
          format: 'interview',
          speakers: [],
          dialogue: [],
        })
      ).rejects.toThrow()
    })

    it('should support multiple formats', async () => {
      const formats = ['deep-dive', 'interview', 'debate', 'news-discussion', 'storytelling'] as const

      for (const format of formats) {
        const result = await service.generatePodcast({
          title: `Test ${format}`,
          format,
          speakers: [{ id: 's1', name: 'Test', role: 'host', provider: 'openai', voice: 'alloy' }],
          dialogue: [{ speaker: 's1', text: 'Test dialogue' }],
        })

        expect(result.format).toBe(format)
      }
    })

    it('should support multiple speakers', async () => {
      const result = await service.generatePodcast({
        title: 'Multi-speaker Test',
        format: 'debate',
        speakers: [
          { id: 'moderator', name: 'Casey', role: 'host', provider: 'openai', voice: 'shimmer' },
          { id: 'pro', name: 'Dave', role: 'guest', provider: 'elevenlabs', voice: 'dave' },
          { id: 'con', name: 'Lisa', role: 'guest', provider: 'google', voice: 'en-US-Neural2-C' },
        ],
        dialogue: [
          { speaker: 'moderator', text: 'Welcome to the debate!' },
          { speaker: 'pro', text: 'I support this proposal.' },
          { speaker: 'con', text: 'I oppose this proposal.' },
        ],
      })

      expect(result.speakers).toHaveLength(3)
    })

    it('should support emotion and pause in dialogue', async () => {
      const result = await service.generatePodcast({
        title: 'Emotional Podcast',
        format: 'storytelling',
        speakers: [{ id: 'narrator', name: 'Morgan', role: 'narrator', provider: 'openai', voice: 'fable' }],
        dialogue: [
          { speaker: 'narrator', text: 'Once upon a time...', emotion: 'atmospheric' },
          { speaker: 'narrator', text: 'The end.', emotion: 'solemn', pause: 2.0 },
        ],
      })

      expect(result).toBeDefined()
    })
  })

  describe('generateBatch', () => {
    it('should generate multiple podcasts', async () => {
      const result = await service.generateBatch({
        podcasts: [
          {
            title: 'First Podcast',
            format: 'interview',
            speakers: [{ id: 's1', name: 'Test', role: 'host', provider: 'openai', voice: 'alloy' }],
            dialogue: [{ speaker: 's1', text: 'First podcast dialogue' }],
          },
          {
            title: 'Second Podcast',
            format: 'news-discussion',
            speakers: [{ id: 's2', name: 'Test2', role: 'host', provider: 'elevenlabs', voice: 'rachel' }],
            dialogue: [{ speaker: 's2', text: 'Second podcast dialogue' }],
          },
        ],
      })

      expect(result).toBeDefined()
      expect(result.batchId).toBeDefined()
      expect(result.podcasts).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('generateTestBatch', () => {
    it('should generate 5 test podcasts', async () => {
      const result = await service.generateTestBatch()

      expect(result).toBeDefined()
      expect(result.podcasts).toHaveLength(5)
      expect(result.total).toBe(5)
    })

    it('should use diverse formats', async () => {
      const result = await service.generateTestBatch()

      const formats = result.podcasts.map((p) => p.format)
      expect(new Set(formats).size).toBeGreaterThanOrEqual(4) // At least 4 different formats
    })

    it('should include multi-speaker podcasts', async () => {
      const result = await service.generateTestBatch()

      const multiSpeaker = result.podcasts.filter((p) => p.speakers.length > 1)
      expect(multiSpeaker.length).toBeGreaterThan(0)
    })

    it('should use different providers', async () => {
      const result = await service.generateTestBatch()

      const allSpeakers = result.podcasts.flatMap((p) => p.speakers)
      const providers = allSpeakers.map((s) => s.provider)

      expect(providers).toContain('openai')
      expect(providers).toContain('elevenlabs')
      expect(providers).toContain('google')
    })
  })

  describe('getPodcast', () => {
    it('should return null for non-existent podcast', async () => {
      const result = await service.getPodcast('non-existent')

      expect(result).toBeNull()
    })

    it('should return podcast details when found', async () => {
      env.DB.execute = async () => ({
        rows: [
          {
            id: 'test-id',
            title: 'Test Podcast',
            format: 'interview',
            topic: 'Testing',
            speakers: JSON.stringify([{ id: 's1', name: 'Test', role: 'host', provider: 'openai', voice: 'alloy' }]),
            dialogue: JSON.stringify([{ speaker: 's1', text: 'Test dialogue' }]),
            status: 'completed',
            audio_url: 'https://example.com/audio.mp3',
            r2_key: 'podcast/2025/10/test-id.mp3',
            duration: 120.5,
            created_at: '2025-10-03T00:00:00Z',
            completed_at: '2025-10-03T00:02:00Z',
            metadata: '{"test": true}',
          },
        ],
      })

      const result = await service.getPodcast('test-id')

      expect(result).toBeDefined()
      expect(result?.id).toBe('test-id')
      expect(result?.title).toBe('Test Podcast')
      expect(result?.status).toBe('completed')
      expect(result?.audioUrl).toBe('https://example.com/audio.mp3')
      expect(result?.duration).toBe(120.5)
      expect(result?.speakers).toHaveLength(1)
    })
  })
})

describe('Podcast Prompts', () => {
  it('should have 5 diverse podcast prompt templates', () => {
    const templates = getAllPodcastTemplates()

    expect(templates).toHaveLength(5)
    expect(templates.map((t) => t.name)).toEqual([
      'Tech News Discussion',
      'Business Interview',
      'Educational Deep Dive',
      'Story Podcast',
      'Product Review Discussion',
    ])
  })

  it('should include all podcast formats', () => {
    const templates = getAllPodcastTemplates()
    const formats = templates.map((t) => t.format)

    expect(formats).toContain('news-discussion')
    expect(formats).toContain('interview')
    expect(formats).toContain('deep-dive')
    expect(formats).toContain('storytelling')
    expect(formats).toContain('debate')
  })

  it('should include multi-speaker scenarios', () => {
    const templates = getAllPodcastTemplates()

    templates.forEach((template) => {
      expect(template.speakers.length).toBeGreaterThanOrEqual(1)
      expect(template.speakers.length).toBeLessThanOrEqual(10)
      expect(template.dialogue.length).toBeGreaterThan(0)
    })
  })

  it('should include dialogue with varied elements', () => {
    const templates = getAllPodcastTemplates()

    templates.forEach((template) => {
      expect(template.dialogue.length).toBeGreaterThan(2)

      // Check that dialogue references valid speakers
      template.dialogue.forEach((line) => {
        const speakerExists = template.speakers.some((s) => s.id === line.speaker)
        expect(speakerExists).toBe(true)
      })
    })
  })

  it('should use different voice providers', () => {
    const templates = getAllPodcastTemplates()
    const allSpeakers = templates.flatMap((t) => t.speakers)
    const providers = allSpeakers.map((s) => s.provider)

    expect(providers).toContain('openai')
    expect(providers).toContain('elevenlabs')
    expect(providers).toContain('google')
  })

  it('should generate batch prompts', () => {
    const prompts = generateBatchPodcastPrompts()

    expect(prompts).toHaveLength(5)
    prompts.forEach((prompt) => {
      expect(prompt.name).toBeDefined()
      expect(prompt.format).toBeDefined()
      expect(prompt.speakers).toBeDefined()
      expect(prompt.dialogue).toBeDefined()
    })
  })
})
