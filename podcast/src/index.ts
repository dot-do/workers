/**
 * Type definitions for Podcast AI generation service
 */

export type PodcastFormat = 'deep-dive' | 'interview' | 'debate' | 'news-discussion' | 'storytelling'
export type SpeakerRole = 'host' | 'guest' | 'narrator' | 'character' | 'expert'

export interface Env {
  AUDIO: R2Bucket
  DB: any
  VOICE: any // Voice service binding
  OPENAI_API_KEY: string
  ELEVENLABS_API_KEY: string
  GOOGLE_CLOUD_API_KEY: string
  pipeline: any
  do: any
}

export interface Speaker {
  id: string
  name: string
  role: SpeakerRole
  provider: 'openai' | 'elevenlabs' | 'google'
  voice: string
  description?: string
}

export interface DialogueLine {
  speaker: string // speaker id
  text: string
  emotion?: string
  pause?: number // seconds before this line
}

export interface PodcastGenerationRequest {
  title: string
  format: PodcastFormat
  topic?: string
  speakers: Speaker[]
  dialogue: DialogueLine[]
  duration?: number // target duration in minutes
  backgroundMusic?: boolean
  metadata?: Record<string, any>
}

export interface PodcastGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  title: string
  format: PodcastFormat
  speakers: Speaker[]
  audioUrl?: string
  r2Key?: string
  duration?: number // actual duration in seconds
  error?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export interface PodcastRecord {
  id: string
  title: string
  format: string
  topic: string | null
  speakers: string // JSON
  dialogue: string // JSON
  status: string
  audioUrl: string | null
  r2Key: string | null
  duration: number | null
  error: string | null
  createdAt: string
  completedAt: string | null
  metadata: string | null
}

export interface PodcastTemplate {
  name: string
  format: PodcastFormat
  topic: string
  speakers: Speaker[]
  dialogue: DialogueLine[]
}


/**
 * Zod validation schemas for Podcast AI generation
 */

import { z } from 'zod'

export const formatSchema = z.enum(['deep-dive', 'interview', 'debate', 'news-discussion', 'storytelling'])
export const roleSchema = z.enum(['host', 'guest', 'narrator', 'character', 'expert'])

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
  provider: z.enum(['openai', 'elevenlabs', 'google']),
  voice: z.string(),
  description: z.string().optional(),
})

export const dialogueLineSchema = z.object({
  speaker: z.string(),
  text: z.string().min(1).max(5000),
  emotion: z.string().optional(),
  pause: z.number().min(0).max(10).optional(),
})

export const podcastGenerationRequestSchema = z.object({
  title: z.string().min(1).max(200),
  format: formatSchema,
  topic: z.string().max(500).optional(),
  speakers: z.array(speakerSchema).min(1).max(10),
  dialogue: z.array(dialogueLineSchema).min(1).max(500),
  duration: z.number().min(1).max(180).optional(),
  backgroundMusic: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})


/**
 * Podcast AI Generation Service
 *
 * Multi-speaker dialogue and long-form audio content generation
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ulid } from 'ulid'
import { podcastGenerationRequestSchema } from './schema'
import type {
  Env,
  PodcastGenerationRequest,
  PodcastGenerationResponse,
  PodcastRecord,
  DialogueLine,
  Speaker,
} from './types'
import { generateBatchPodcastPrompts, getAllPodcastTemplates } from './prompts'

export class PodcastService extends WorkerEntrypoint<Env> {
  /**
   * RPC: Generate a podcast episode
   */
  async generatePodcast(request: PodcastGenerationRequest): Promise<PodcastGenerationResponse> {
    const validated = podcastGenerationRequestSchema.parse(request)
    const id = ulid()
    const now = new Date().toISOString()

    const record: PodcastRecord = {
      id,
      title: validated.title,
      format: validated.format,
      topic: validated.topic || null,
      speakers: JSON.stringify(validated.speakers),
      dialogue: JSON.stringify(validated.dialogue),
      status: 'pending',
      audioUrl: null,
      r2Key: null,
      duration: null,
      error: null,
      createdAt: now,
      completedAt: null,
      metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
    }

    // Save to database
    await this.env.DB.execute(
      `INSERT INTO podcasts (id, title, format, topic, speakers, dialogue, status, created_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      record.title,
      record.format,
      record.topic,
      record.speakers,
      record.dialogue,
      record.status,
      record.createdAt,
      record.metadata
    )

    // Process podcast generation in background
    this.ctx.waitUntil(this.processPodcastGeneration(id, validated))

    return {
      id,
      status: 'pending',
      title: validated.title,
      format: validated.format,
      speakers: validated.speakers,
      createdAt: now,
      metadata: validated.metadata,
    }
  }

  /**
   * RPC: Generate a batch of podcasts
   */
  async generateBatch(requests: { podcasts: PodcastGenerationRequest[] }): Promise<{
    batchId: string
    podcasts: PodcastGenerationResponse[]
    total: number
  }> {
    const batchId = ulid()
    const podcasts: PodcastGenerationResponse[] = []

    for (const request of requests.podcasts) {
      const result = await this.generatePodcast(request)
      podcasts.push(result)
    }

    return {
      batchId,
      podcasts,
      total: podcasts.length,
    }
  }

  /**
   * RPC: Generate test batch with diverse templates
   */
  async generateTestBatch(): Promise<{
    batchId: string
    podcasts: PodcastGenerationResponse[]
    total: number
  }> {
    const templates = generateBatchPodcastPrompts()
    const podcasts: PodcastGenerationResponse[] = []

    for (const template of templates) {
      const request: PodcastGenerationRequest = {
        title: template.name,
        format: template.format,
        topic: template.topic,
        speakers: template.speakers,
        dialogue: template.dialogue,
        metadata: { template: true },
      }
      const result = await this.generatePodcast(request)
      podcasts.push(result)
    }

    return {
      batchId: ulid(),
      podcasts,
      total: podcasts.length,
    }
  }

  /**
   * RPC: Get podcast by ID
   */
  async getPodcast(id: string): Promise<PodcastGenerationResponse | null> {
    const result = await this.env.DB.execute('SELECT * FROM podcasts WHERE id = ?', id)

    if (!result.rows || result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as any

    return {
      id: row.id,
      status: row.status as any,
      title: row.title,
      format: row.format as any,
      speakers: JSON.parse(row.speakers),
      audioUrl: row.audio_url || undefined,
      r2Key: row.r2_key || undefined,
      duration: row.duration || undefined,
      error: row.error || undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }
  }

  /**
   * Background processing: Generate podcast episode
   */
  private async processPodcastGeneration(id: string, request: PodcastGenerationRequest): Promise<void> {
    try {
      // Update status to processing
      await this.env.DB.execute('UPDATE podcasts SET status = ? WHERE id = ?', 'processing', id)

      // Generate voice segments for each dialogue line
      const audioSegments: ArrayBuffer[] = []

      for (const line of request.dialogue) {
        const speaker = request.speakers.find((s) => s.id === line.speaker)
        if (!speaker) {
          throw new Error(`Speaker not found: ${line.speaker}`)
        }

        // Call voice service to generate this line
        const voiceRequest = {
          text: line.text,
          provider: speaker.provider,
          voice: speaker.voice,
          emotion: line.emotion,
        }

        // TODO: Call voice service via RPC binding
        // const voiceResult = await this.env.VOICE.generateVoice(voiceRequest)
        // const audioBuffer = await this.waitForVoiceGeneration(voiceResult.id)
        // audioSegments.push(audioBuffer)

        // For now, create placeholder
        const placeholder = new ArrayBuffer(0)
        audioSegments.push(placeholder)

        // Add pause if specified
        if (line.pause && line.pause > 0) {
          // TODO: Generate silence for pause duration
          const silenceBuffer = new ArrayBuffer(0)
          audioSegments.push(silenceBuffer)
        }
      }

      // TODO: Concatenate audio segments into single file
      // This would involve:
      // 1. Decoding each audio segment
      // 2. Concatenating the raw audio data
      // 3. Re-encoding to final format (MP3)
      // 4. Adding background music if requested
      const finalAudioBuffer = new ArrayBuffer(0)

      // Save to R2
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      const r2Key = `podcast/${year}/${month}/${id}.mp3`

      await this.env.AUDIO.put(r2Key, finalAudioBuffer, {
        httpMetadata: {
          contentType: 'audio/mpeg',
        },
      })

      const audioUrl = `https://podcast-audio.do/${r2Key}`
      const duration = 0 // TODO: Calculate actual duration
      const completedAt = new Date().toISOString()

      // Update database with results
      await this.env.DB.execute(
        'UPDATE podcasts SET status = ?, audio_url = ?, r2_key = ?, duration = ?, completed_at = ? WHERE id = ?',
        'completed',
        audioUrl,
        r2Key,
        duration,
        completedAt,
        id
      )
    } catch (error) {
      // Log error and update status
      console.error('Podcast generation failed:', error)

      await this.env.DB.execute(
        'UPDATE podcasts SET status = ?, error = ? WHERE id = ?',
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
        id
      )
    }
  }

  /**
   * Wait for voice generation to complete
   */
  private async waitForVoiceGeneration(voiceId: string): Promise<ArrayBuffer> {
    // Poll voice service until generation is complete
    const maxAttempts = 60 // 60 attempts * 1 second = 1 minute max wait
    let attempts = 0

    while (attempts < maxAttempts) {
      const result = await this.env.VOICE.getVoice(voiceId)

      if (result.status === 'completed' && result.audioUrl) {
        // Download audio from R2
        const audio = await this.env.AUDIO.get(result.r2Key!)
        if (!audio) {
          throw new Error('Audio file not found in R2')
        }
        return await audio.arrayBuffer()
      }

      if (result.status === 'failed') {
        throw new Error(`Voice generation failed: ${result.error}`)
      }

      // Wait 1 second before next attempt
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++
    }

    throw new Error('Voice generation timed out')
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'podcast' })
})

// Generate podcast
app.post('/generate', async (c) => {
  try {
    const body = await c.req.json()
    const service = new PodcastService(c.env.ctx, c.env)
    const result = await service.generatePodcast(body)
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    )
  }
})

// Generate batch
app.post('/generate/batch', async (c) => {
  try {
    const body = await c.req.json()
    const service = new PodcastService(c.env.ctx, c.env)
    const result = await service.generateBatch(body)
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    )
  }
})

// Generate test batch
app.post('/generate/test', async (c) => {
  try {
    const service = new PodcastService(c.env.ctx, c.env)
    const result = await service.generateTestBatch()
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Get podcast by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const service = new PodcastService(c.env.ctx, c.env)
  const podcast = await service.getPodcast(id)

  if (!podcast) {
    return c.json({ success: false, error: 'Podcast not found' }, 404)
  }

  return c.json({ success: true, data: podcast })
})

// List podcast templates
app.get('/templates', (c) => {
  const templates = getAllPodcastTemplates()
  return c.json({
    success: true,
    data: {
      templates: templates.map((t) => ({
        name: t.name,
        format: t.format,
        topic: t.topic,
        speakerCount: t.speakers.length,
        dialogueLines: t.dialogue.length,
      })),
      total: templates.length,
    },
  })
})

export default {
  fetch: app.fetch,
}
