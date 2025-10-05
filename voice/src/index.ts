/**
 * Voice AI Generation Service
 *
 * Professional voiceovers and TTS using OpenAI, ElevenLabs, and Google Cloud
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { ulid } from 'ulid'
import { z } from 'zod'

// ============================================================================
// Types
// ============================================================================

export type VoiceProvider = 'openai' | 'elevenlabs' | 'google'
export type AudioFormat = 'mp3' | 'wav' | 'opus' | 'aac' | 'flac'
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type OpenAIModel = 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts'
export type ElevenLabsVoice = 'rachel' | 'clyde' | 'domi' | 'dave' | 'fin' | 'sarah' | 'antoni' | 'thomas' | 'charlie' | 'emily'
export type ElevenLabsModel = 'eleven_multilingual_v2' | 'eleven_turbo_v2' | 'eleven_flash_v2'
export type GoogleVoice = 'en-US-Neural2-A' | 'en-US-Neural2-C' | 'en-US-Neural2-D' | 'en-US-Neural2-E' | 'en-US-Neural2-F' | 'en-US-Studio-O' | 'en-US-Chirp-3-HD'

export interface Env {
  AUDIO: R2Bucket
  DB: any
  OPENAI_API_KEY: string
  ELEVENLABS_API_KEY: string
  GOOGLE_CLOUD_API_KEY: string
  pipeline: any
  do: any
}

export interface VoiceGenerationRequest {
  text: string
  provider?: VoiceProvider
  voice?: string
  model?: string
  format?: AudioFormat
  speed?: number
  pitch?: number
  emotion?: string
  style?: string
  language?: string
  ssml?: boolean
  metadata?: Record<string, any>
}

export interface VoiceGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  text: string
  provider: VoiceProvider
  voice: string
  audioUrl?: string
  r2Key?: string
  duration?: number
  error?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export interface BatchVoiceGenerationRequest {
  voices: Array<{
    text: string
    provider?: VoiceProvider
    voice?: string
    model?: string
    format?: AudioFormat
    speed?: number
    pitch?: number
    emotion?: string
    style?: string
  }>
  metadata?: Record<string, any>
}

export interface BatchVoiceGenerationResponse {
  batchId: string
  voices: VoiceGenerationResponse[]
  total: number
  pending: number
  completed: number
  failed: number
}

export interface VoiceRecord {
  id: string
  text: string
  provider: string
  voice: string
  model: string | null
  format: string
  status: string
  audioUrl: string | null
  r2Key: string | null
  duration: number | null
  error: string | null
  createdAt: string
  completedAt: string | null
  metadata: string | null
}

export interface VoicePromptTemplate {
  name: string
  useCase: string
  text: string
  provider: VoiceProvider
  voice: string
  style?: string
  emotion?: string
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const providerSchema = z.enum(['openai', 'elevenlabs', 'google']).default('openai')
export const formatSchema = z.enum(['mp3', 'wav', 'opus', 'aac', 'flac']).default('mp3')

export const voiceGenerationRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  provider: providerSchema.optional(),
  voice: z.string().optional(),
  model: z.string().optional(),
  format: formatSchema.optional(),
  speed: z.number().min(0.25).max(4.0).optional(),
  pitch: z.number().min(-20).max(20).optional(),
  emotion: z.string().max(200).optional(),
  style: z.string().max(200).optional(),
  language: z.string().max(10).optional(),
  ssml: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

export const batchVoiceGenerationRequestSchema = z.object({
  voices: z.array(
    z.object({
      text: z.string().min(1).max(10000),
      provider: providerSchema.optional(),
      voice: z.string().optional(),
      model: z.string().optional(),
      format: formatSchema.optional(),
      speed: z.number().min(0.25).max(4.0).optional(),
      pitch: z.number().min(-20).max(20).optional(),
      emotion: z.string().max(200).optional(),
      style: z.string().max(200).optional(),
    })
  ).min(1).max(10),
  metadata: z.record(z.any()).optional(),
})

export const voicePromptTemplateSchema = z.object({
  name: z.string(),
  useCase: z.string(),
  text: z.string(),
  provider: providerSchema,
  voice: z.string(),
  style: z.string().optional(),
  emotion: z.string().optional(),
})

// ============================================================================
// Voice Prompt Templates
// ============================================================================

/**
 * Template-based prompts covering diverse voiceover use cases
 */
export const voicePromptTemplates: VoicePromptTemplate[] = [
  {
    name: 'Professional Business Narration',
    useCase: 'Corporate video, product demo, explainer video',
    text: `Welcome to the future of business automation. Our AI-powered platform streamlines your workflow, eliminates repetitive tasks, and empowers your team to focus on what truly matters: innovation and growth. With seamless integrations, real-time analytics, and enterprise-grade security, we're helping companies worldwide transform their operations and achieve unprecedented efficiency.`,
    provider: 'openai',
    voice: 'onyx',
    style: 'professional',
    emotion: 'confident and authoritative',
  },
  {
    name: 'Educational Explainer',
    useCase: 'E-learning, tutorial, online course',
    text: `Let's dive into the fascinating world of machine learning! Imagine teaching a computer to recognize patterns, just like how you learned to identify animals as a child. Machine learning algorithms analyze thousands of examples, gradually improving their accuracy with each iteration. Today, we'll explore three fundamental concepts: supervised learning, where we provide labeled data; unsupervised learning, where the algorithm finds patterns on its own; and reinforcement learning, where it learns through trial and error. Ready to get started?`,
    provider: 'elevenlabs',
    voice: 'rachel',
    style: 'educational',
    emotion: 'enthusiastic and engaging',
  },
  {
    name: 'Podcast Intro',
    useCase: 'Podcast opener, show introduction',
    text: `Hey everyone, welcome back to Tech Horizons, the podcast where we explore the cutting edge of technology and its impact on society. I'm your host, and today we have an incredible episode lined up. We'll be discussing the latest breakthroughs in quantum computing, interviewing a pioneer in sustainable AI, and answering your burning questions about the future of work. So grab your coffee, settle in, and let's explore what's next in the world of innovation.`,
    provider: 'openai',
    voice: 'nova',
    style: 'conversational',
    emotion: 'warm and welcoming',
  },
  {
    name: 'Audiobook Excerpt',
    useCase: 'Audiobook narration, storytelling',
    text: `The rain hammered against the window panes as Sarah stood in the dimly lit study, her fingers tracing the worn leather binding of the ancient journal. Three generations had passed since her great-grandmother first penned these words, yet the secrets within still held the power to change everything. She took a deep breath, opened the cover, and began to read. "If you're reading this," the first entry began, "then you've already discovered that our family's past is far more extraordinary than you ever imagined."`,
    provider: 'elevenlabs',
    voice: 'sarah',
    style: 'narrative',
    emotion: 'mysterious and dramatic',
  },
  {
    name: 'Customer Service Greeting',
    useCase: 'IVR system, customer support, helpdesk',
    text: `Thank you for calling TechSupport Solutions. We're here to help you resolve any technical issues you might be experiencing. To better assist you, please listen carefully to the following options. Press one for account and billing inquiries. Press two for technical support and troubleshooting. Press three to speak with a customer service representative. Or, stay on the line to hear these options again. Your call is important to us.`,
    provider: 'google',
    voice: 'en-US-Neural2-C',
    style: 'professional',
    emotion: 'helpful and patient',
  },
]

/**
 * Generate complete voice generation config from a template
 */
export function generateVoiceFromTemplate(template: VoicePromptTemplate) {
  return {
    text: template.text,
    provider: template.provider,
    voice: template.voice,
    style: template.style,
    emotion: template.emotion,
    metadata: {
      template: template.name,
      useCase: template.useCase,
    },
  }
}

/**
 * Get a random voice prompt template
 */
export function getRandomVoicePromptTemplate(): VoicePromptTemplate {
  return voicePromptTemplates[Math.floor(Math.random() * voicePromptTemplates.length)]
}

/**
 * Get all 5 default prompts
 */
export function getAllVoicePromptTemplates(): VoicePromptTemplate[] {
  return voicePromptTemplates
}

/**
 * Generate 5 diverse voice generation configs (one from each template)
 */
export function generateBatchVoicePrompts() {
  return voicePromptTemplates.map(generateVoiceFromTemplate)
}

/**
 * Generate N random voice configs (may include duplicates)
 */
export function generateRandomVoicePrompts(count: number) {
  const prompts = []
  for (let i = 0; i < count; i++) {
    const template = getRandomVoicePromptTemplate()
    prompts.push(generateVoiceFromTemplate(template))
  }
  return prompts
}

/**
 * Add SSML tags for enhanced control (Google Cloud TTS)
 */
export function wrapWithSSML(text: string, options?: { speed?: number; pitch?: number; emphasis?: string }) {
  let ssml = '<speak>'

  if (options?.speed || options?.pitch) {
    const attrs: string[] = []
    if (options.speed) attrs.push(`rate="${options.speed >= 1 ? 'fast' : 'slow'}"`)
    if (options.pitch) attrs.push(`pitch="${options.pitch > 0 ? '+' : ''}${options.pitch}st"`)
    ssml += `<prosody ${attrs.join(' ')}>`
  }

  // Add emphasis if specified
  if (options?.emphasis) {
    ssml += `<emphasis level="${options.emphasis}">${text}</emphasis>`
  } else {
    ssml += text
  }

  if (options?.speed || options?.pitch) {
    ssml += '</prosody>'
  }

  ssml += '</speak>'
  return ssml
}

/**
 * Generate instruction for OpenAI's steerable TTS
 */
export function generateSteerableInstruction(style?: string, emotion?: string): string | undefined {
  if (!style && !emotion) return undefined

  const parts: string[] = []

  if (style) {
    parts.push(`speak in a ${style} style`)
  }

  if (emotion) {
    parts.push(`with a ${emotion} tone`)
  }

  return `Please ${parts.join(', ')}.`
}

// ============================================================================
// Voice Service RPC Interface
// ============================================================================

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

// ============================================================================
// HTTP API
// ============================================================================

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
