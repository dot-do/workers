/**
 * Voice AI Generation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VoiceService } from '../src/index'
import { generateBatchVoicePrompts, getAllVoicePromptTemplates } from '../src/prompts'

describe('VoiceService', () => {
  let service: VoiceService
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
      OPENAI_API_KEY: 'test-key',
      ELEVENLABS_API_KEY: 'test-key',
      GOOGLE_CLOUD_API_KEY: 'test-key',
    }
    const ctx = {
      waitUntil: () => {},
    }
    service = new VoiceService(ctx as any, env)
  })

  describe('generateVoice', () => {
    it('should create voice generation request', async () => {
      const result = await service.generateVoice({
        text: 'Hello world, this is a test voiceover',
        provider: 'openai',
        voice: 'alloy',
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.status).toBe('pending')
      expect(result.text).toBe('Hello world, this is a test voiceover')
      expect(result.provider).toBe('openai')
      expect(result.voice).toBe('alloy')
    })

    it('should validate text length', async () => {
      await expect(
        service.generateVoice({
          text: '',
          provider: 'openai',
        })
      ).rejects.toThrow()
    })

    it('should default to openai provider', async () => {
      const result = await service.generateVoice({
        text: 'Hello world, this is a test voiceover',
      })

      expect(result.provider).toBe('openai')
    })

    it('should support elevenlabs provider', async () => {
      const result = await service.generateVoice({
        text: 'Hello world, this is a test voiceover',
        provider: 'elevenlabs',
        voice: 'rachel',
      })

      expect(result.provider).toBe('elevenlabs')
      expect(result.voice).toBe('rachel')
    })

    it('should support google provider', async () => {
      const result = await service.generateVoice({
        text: 'Hello world, this is a test voiceover',
        provider: 'google',
        voice: 'en-US-Neural2-C',
      })

      expect(result.provider).toBe('google')
      expect(result.voice).toBe('en-US-Neural2-C')
    })
  })

  describe('generateBatch', () => {
    it('should generate multiple voiceovers', async () => {
      const result = await service.generateBatch({
        voices: [
          { text: 'First voiceover test', provider: 'openai', voice: 'alloy' },
          { text: 'Second voiceover test', provider: 'elevenlabs', voice: 'rachel' },
        ],
      })

      expect(result).toBeDefined()
      expect(result.batchId).toBeDefined()
      expect(result.voices).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should enforce max batch size', async () => {
      const voices = Array(11).fill({ text: 'Test voiceover' })

      await expect(service.generateBatch({ voices })).rejects.toThrow()
    })
  })

  describe('generateTestBatch', () => {
    it('should generate 5 test voiceovers', async () => {
      const result = await service.generateTestBatch()

      expect(result).toBeDefined()
      expect(result.voices).toHaveLength(5)
      expect(result.total).toBe(5)
    })

    it('should use different providers', async () => {
      const result = await service.generateTestBatch()

      const providers = result.voices.map((v) => v.provider)
      expect(providers).toContain('openai')
      expect(providers).toContain('elevenlabs')
      expect(providers).toContain('google')
    })

    it('should use different voices', async () => {
      const result = await service.generateTestBatch()

      const voices = result.voices.map((v) => v.voice)
      expect(new Set(voices).size).toBeGreaterThan(1) // At least 2 different voices
    })
  })

  describe('getVoice', () => {
    it('should return null for non-existent voice', async () => {
      const result = await service.getVoice('non-existent')

      expect(result).toBeNull()
    })

    it('should return voice details when found', async () => {
      env.DB.execute = async () => ({
        rows: [
          {
            id: 'test-id',
            text: 'Test voiceover',
            provider: 'openai',
            voice: 'alloy',
            model: 'tts-1',
            format: 'mp3',
            status: 'completed',
            audio_url: 'https://example.com/audio.mp3',
            r2_key: 'voice/2025/10/test-id.mp3',
            duration: 5.2,
            created_at: '2025-10-03T00:00:00Z',
            completed_at: '2025-10-03T00:00:05Z',
            metadata: '{"test": true}',
          },
        ],
      })

      const result = await service.getVoice('test-id')

      expect(result).toBeDefined()
      expect(result?.id).toBe('test-id')
      expect(result?.status).toBe('completed')
      expect(result?.audioUrl).toBe('https://example.com/audio.mp3')
      expect(result?.provider).toBe('openai')
      expect(result?.duration).toBe(5.2)
    })
  })
})

describe('Voice Prompts', () => {
  it('should have 5 diverse voice prompt templates', () => {
    const templates = getAllVoicePromptTemplates()

    expect(templates).toHaveLength(5)
    expect(templates.map((t) => t.name)).toEqual([
      'Professional Business Narration',
      'Educational Explainer',
      'Podcast Intro',
      'Audiobook Excerpt',
      'Customer Service Greeting',
    ])
  })

  it('should include different providers', () => {
    const templates = getAllVoicePromptTemplates()
    const providers = templates.map((t) => t.provider)

    expect(providers).toContain('openai')
    expect(providers).toContain('elevenlabs')
    expect(providers).toContain('google')
  })

  it('should include style and emotion guidance', () => {
    const templates = getAllVoicePromptTemplates()

    templates.forEach((template) => {
      expect(template.text.length).toBeGreaterThan(50)
      expect(template.useCase).toBeDefined()
    })
  })

  it('should generate batch prompts', () => {
    const prompts = generateBatchVoicePrompts()

    expect(prompts).toHaveLength(5)
    prompts.forEach((prompt) => {
      expect(prompt.text).toBeDefined()
      expect(prompt.provider).toBeDefined()
      expect(prompt.voice).toBeDefined()
    })
  })
})
