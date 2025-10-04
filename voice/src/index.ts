/**
 * Voice AI Generation Service
 *
 * Professional voiceovers and TTS using OpenAI, ElevenLabs, and Google Cloud
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { ulid } from 'ulid'
import type { Env, VoiceGenerationRequest, VoiceGenerationResponse, BatchVoiceGenerationRequest, BatchVoiceGenerationResponse } from './types'
import { voiceGenerationRequestSchema, batchVoiceGenerationRequestSchema } from './schema'
import { generateBatchVoicePrompts, getAllVoicePromptTemplates, generateVoiceFromTemplate, generateSteerableInstruction, wrapWithSSML } from './prompts'

/**
 * Voice Service RPC Interface
 */
export class VoiceService extends WorkerEntrypoint<Env> {
  /**
   * Generate a single voiceover
   */
  async generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    const validated = voiceGenerationRequestSchema.parse(request)
    const id = ulid()

    try {
      // Store initial record in database
      await this.env.DB.execute(
        `INSERT INTO voice_generations (id, text, provider, voice, model, format, status, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          validated.text,
          validated.provider || 'openai',
          validated.voice || 'default',
          validated.model || null,
          validated.format || 'mp3',
          'pending',
          new Date().toISOString(),
          JSON.stringify(validated.metadata || {}),
        ]
      )

      // Start voice generation (async - will be processed in background)
      this.ctx.waitUntil(this.processVoiceGeneration(id, validated))

      return {
        id,
        status: 'pending',
        text: validated.text,
        provider: validated.provider || 'openai',
        voice: validated.voice || 'default',
        createdAt: new Date().toISOString(),
        metadata: validated.metadata,
      }
    } catch (error: any) {
      console.error('Failed to start voice generation:', error)
      throw new Error(`Voice generation failed: ${error.message}`)
    }
  }

  /**
   * Generate multiple voiceovers in batch
   */
  async generateBatch(request: BatchVoiceGenerationRequest): Promise<BatchVoiceGenerationResponse> {
    const validated = batchVoiceGenerationRequestSchema.parse(request)
    const batchId = ulid()

    const voices: VoiceGenerationResponse[] = []

    for (const voiceConfig of validated.voices) {
      const voice = await this.generateVoice({
        ...voiceConfig,
        metadata: { ...validated.metadata, batchId },
      })
      voices.push(voice)
    }

    return {
      batchId,
      voices,
      total: voices.length,
      pending: voices.filter((v) => v.status === 'pending').length,
      completed: 0,
      failed: 0,
    }
  }

  /**
   * Generate 5 test voiceovers using default prompts
   */
  async generateTestBatch(): Promise<BatchVoiceGenerationResponse> {
    const prompts = generateBatchVoicePrompts()

    return this.generateBatch({
      voices: prompts.map((prompt) => ({
        ...prompt,
      })),
      metadata: {
        type: 'test_batch',
        generatedAt: new Date().toISOString(),
      },
    })
  }

  /**
   * Get voice generation status by ID
   */
  async getVoice(id: string): Promise<VoiceGenerationResponse | null> {
    const result = await this.env.DB.execute(`SELECT * FROM voice_generations WHERE id = ?`, [id])

    if (!result.rows.length) {
      return null
    }

    const row = result.rows[0] as any

    return {
      id: row.id,
      status: row.status,
      text: row.text,
      provider: row.provider,
      voice: row.voice,
      audioUrl: row.audio_url,
      r2Key: row.r2_key,
      duration: row.duration,
      error: row.error,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }
  }

  /**
   * Process voice generation in background
   */
  private async processVoiceGeneration(id: string, request: VoiceGenerationRequest): Promise<void> {
    try {
      // Update status to processing
      await this.env.DB.execute(`UPDATE voice_generations SET status = ? WHERE id = ?`, ['processing', id])

      // Call appropriate provider
      const audioData = await this.callVoiceProvider(request)

      // Upload to R2
      const format = request.format || 'mp3'
      const r2Key = `voice/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${id}.${format}`
      await this.env.AUDIO.put(r2Key, audioData)

      // Generate public URL
      const audioUrl = `https://audio.services.do/${r2Key}`

      // TODO: Calculate audio duration from file
      const duration = null

      // Update database with completion
      await this.env.DB.execute(
        `UPDATE voice_generations SET status = ?, audio_url = ?, r2_key = ?, duration = ?, completed_at = ? WHERE id = ?`,
        ['completed', audioUrl, r2Key, duration, new Date().toISOString(), id]
      )
    } catch (error: any) {
      console.error('Voice generation failed:', error)
      await this.env.DB.execute(`UPDATE voice_generations SET status = ?, error = ? WHERE id = ?`, ['failed', error.message, id])
    }
  }

  /**
   * Call appropriate voice provider based on request
   */
  private async callVoiceProvider(request: VoiceGenerationRequest): Promise<ArrayBuffer> {
    const provider = request.provider || 'openai'

    switch (provider) {
      case 'openai':
        return await this.callOpenAITTS(request)
      case 'elevenlabs':
        return await this.callElevenLabsTTS(request)
      case 'google':
        return await this.callGoogleCloudTTS(request)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Call OpenAI TTS API
   */
  private async callOpenAITTS(request: VoiceGenerationRequest): Promise<ArrayBuffer> {
    // TODO: Implement actual OpenAI TTS API call
    // Research shows this structure:
    //
    // const response = await fetch('https://api.openai.com/v1/audio/speech', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: request.model || 'tts-1',
    //     input: request.text,
    //     voice: request.voice || 'alloy',
    //     response_format: request.format || 'mp3',
    //     speed: request.speed || 1.0,
    //     instructions: generateSteerableInstruction(request.style, request.emotion)
    //   })
    // })
    //
    // return await response.arrayBuffer()

    throw new Error('OpenAI TTS API integration not yet implemented - requires API key setup')
  }

  /**
   * Call ElevenLabs TTS API
   */
  private async callElevenLabsTTS(request: VoiceGenerationRequest): Promise<ArrayBuffer> {
    // TODO: Implement actual ElevenLabs API call
    // Research shows this structure:
    //
    // const voiceId = request.voice || 'default-voice-id'
    // const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    //   method: 'POST',
    //   headers: {
    //     'xi-api-key': this.env.ELEVENLABS_API_KEY,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     text: request.text,
    //     model_id: request.model || 'eleven_multilingual_v2',
    //     voice_settings: {
    //       stability: 0.5,
    //       similarity_boost: 0.75,
    //       style: request.style ? 0.5 : 0,
    //       use_speaker_boost: true
    //     }
    //   })
    // })
    //
    // return await response.arrayBuffer()

    throw new Error('ElevenLabs API integration not yet implemented - requires API key setup')
  }

  /**
   * Call Google Cloud TTS API
   */
  private async callGoogleCloudTTS(request: VoiceGenerationRequest): Promise<ArrayBuffer> {
    // TODO: Implement actual Google Cloud TTS API call
    // Research shows this structure:
    //
    // const text = request.ssml ? wrapWithSSML(request.text, { speed: request.speed, pitch: request.pitch }) : request.text
    //
    // const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.env.GOOGLE_CLOUD_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     input: request.ssml ? { ssml: text } : { text },
    //     voice: {
    //       languageCode: request.language || 'en-US',
    //       name: request.voice || 'en-US-Neural2-C'
    //     },
    //     audioConfig: {
    //       audioEncoding: request.format?.toUpperCase() || 'MP3',
    //       speakingRate: request.speed || 1.0,
    //       pitch: request.pitch || 0.0
    //     }
    //   })
    // })
    //
    // const data = await response.json()
    // return Buffer.from(data.audioContent, 'base64')

    throw new Error('Google Cloud TTS API integration not yet implemented - requires API key setup')
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'voice', version: '1.0.0' }))

// Generate single voiceover
app.post('/generate', async (c) => {
  const service = new VoiceService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.generateVoice(body)
  return c.json(result)
})

// Generate batch
app.post('/generate/batch', async (c) => {
  const service = new VoiceService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.generateBatch(body)
  return c.json(result)
})

// Generate test batch (5 default prompts)
app.post('/generate/test', async (c) => {
  const service = new VoiceService(c.env.ctx, c.env)
  const result = await service.generateTestBatch()
  return c.json(result)
})

// Get voice by ID
app.get('/voices/:id', async (c) => {
  const service = new VoiceService(c.env.ctx, c.env)
  const id = c.req.param('id')
  const result = await service.getVoice(id)

  if (!result) {
    return c.json({ error: 'Voice not found' }, 404)
  }

  return c.json(result)
})

// List all voice prompts
app.get('/prompts', (c) => {
  const templates = getAllVoicePromptTemplates()
  const prompts = templates.map((t) => ({
    template: t,
    config: generateVoiceFromTemplate(t),
  }))
  return c.json(prompts)
})

// List available voices by provider
app.get('/voices', (c) => {
  const provider = c.req.query('provider') || 'all'

  const voices = {
    openai: [
      { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
      { id: 'echo', name: 'Echo', description: 'Warm and inclusive' },
      { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
      { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
      { id: 'nova', name: 'Nova', description: 'Bright and energetic' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft and soothing' },
    ],
    elevenlabs: [
      { id: 'rachel', name: 'Rachel', description: 'Clear and professional' },
      { id: 'clyde', name: 'Clyde', description: 'Deep and commanding' },
      { id: 'domi', name: 'Domi', description: 'Warm and friendly' },
    ],
    google: [
      { id: 'en-US-Neural2-A', name: 'US Male 1', description: 'Natural male voice' },
      { id: 'en-US-Neural2-C', name: 'US Female 1', description: 'Natural female voice' },
      { id: 'en-US-Studio-O', name: 'US Studio', description: 'High-quality studio voice' },
    ],
  }

  if (provider === 'all') {
    return c.json(voices)
  } else if (voices[provider as keyof typeof voices]) {
    return c.json(voices[provider as keyof typeof voices])
  } else {
    return c.json({ error: 'Unknown provider' }, 400)
  }
})

export default {
  fetch: app.fetch,
}
