/**
 * Veo 3 Video Generation Service
 *
 * Generates AI videos using Google Veo 3 and stores them in R2
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { ulid } from 'ulid'
import type { Env, VideoGenerationRequest, VideoGenerationResponse, BatchVideoGenerationRequest, BatchVideoGenerationResponse } from './types'
import { videoGenerationRequestSchema, batchVideoGenerationRequestSchema } from './schema'
import { generateBatchPrompts, generatePromptFromTemplate, getAllPromptTemplates } from './prompts'

/**
 * Veo Service RPC Interface
 */
export class VeoService extends WorkerEntrypoint<Env> {
  /**
   * Generate a single video
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const validated = videoGenerationRequestSchema.parse(request)
    const id = ulid()

    try {
      // Store initial record in database
      await this.env.DB.execute(
        `INSERT INTO veo_videos (id, prompt, aspect_ratio, status, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, validated.prompt, validated.aspectRatio || '16:9', 'pending', new Date().toISOString(), JSON.stringify(validated.metadata || {})]
      )

      // Start video generation (async - will be processed in background)
      this.ctx.waitUntil(this.processVideoGeneration(id, validated))

      return {
        id,
        status: 'pending',
        prompt: validated.prompt,
        aspectRatio: validated.aspectRatio || '16:9',
        createdAt: new Date().toISOString(),
        metadata: validated.metadata,
      }
    } catch (error: any) {
      console.error('Failed to start video generation:', error)
      throw new Error(`Video generation failed: ${error.message}`)
    }
  }

  /**
   * Generate multiple videos in batch
   */
  async generateBatch(request: BatchVideoGenerationRequest): Promise<BatchVideoGenerationResponse> {
    const validated = batchVideoGenerationRequestSchema.parse(request)
    const batchId = ulid()

    const videos: VideoGenerationResponse[] = []

    for (const promptConfig of validated.prompts) {
      const video = await this.generateVideo({
        ...promptConfig,
        metadata: { ...validated.metadata, batchId },
      })
      videos.push(video)
    }

    return {
      batchId,
      videos,
      total: videos.length,
      pending: videos.filter((v) => v.status === 'pending').length,
      completed: 0,
      failed: 0,
    }
  }

  /**
   * Generate 5 test videos using default prompts
   */
  async generateTestBatch(): Promise<BatchVideoGenerationResponse> {
    const prompts = generateBatchPrompts()
    const templates = getAllPromptTemplates()

    return this.generateBatch({
      prompts: prompts.map((prompt, i) => ({
        prompt,
        aspectRatio: i % 2 === 0 ? '16:9' : '9:16', // Alternate between horizontal and vertical
        metadata: {
          template: templates[i].occupation,
          industry: templates[i].industry,
        },
      })),
      metadata: {
        type: 'test_batch',
        generatedAt: new Date().toISOString(),
      },
    })
  }

  /**
   * Get video status by ID
   */
  async getVideo(id: string): Promise<VideoGenerationResponse | null> {
    const result = await this.env.DB.execute(`SELECT * FROM veo_videos WHERE id = ?`, [id])

    if (!result.rows.length) {
      return null
    }

    const row = result.rows[0] as any

    return {
      id: row.id,
      status: row.status,
      prompt: row.prompt,
      aspectRatio: row.aspect_ratio,
      videoUrl: row.video_url,
      r2Key: row.r2_key,
      error: row.error,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }
  }

  /**
   * Process video generation in background
   */
  private async processVideoGeneration(id: string, request: VideoGenerationRequest): Promise<void> {
    try {
      // Update status to processing
      await this.env.DB.execute(`UPDATE veo_videos SET status = ? WHERE id = ?`, ['processing', id])

      // Call Google Veo 3 API
      // Note: This is a placeholder - actual implementation depends on Google's SDK structure
      const videoData = await this.callVeo3API(request)

      // Upload to R2
      const r2Key = `videos/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${id}.mp4`
      await this.env.VIDEOS.put(r2Key, videoData)

      // Generate public URL
      const videoUrl = `https://videos.services.do/${r2Key}`

      // Update database with completion
      await this.env.DB.execute(
        `UPDATE veo_videos SET status = ?, video_url = ?, r2_key = ?, completed_at = ? WHERE id = ?`,
        ['completed', videoUrl, r2Key, new Date().toISOString(), id]
      )
    } catch (error: any) {
      console.error('Video generation failed:', error)
      await this.env.DB.execute(`UPDATE veo_videos SET status = ?, error = ? WHERE id = ?`, ['failed', error.message, id])
    }
  }

  /**
   * Call Google Veo 3 API
   *
   * Note: This is a placeholder implementation. The actual Google GenAI SDK
   * usage will need to be adapted based on the latest API structure.
   */
  private async callVeo3API(request: VideoGenerationRequest): Promise<ArrayBuffer> {
    // TODO: Implement actual Google Veo 3 API call
    // The research shows this structure, but we need to adapt to Workers runtime:
    //
    // import { GoogleGenAI } from "@google/genai";
    // const ai = new GoogleGenAI({ apiKey: this.env.GOOGLE_API_KEY });
    // let operation = await ai.models.generateVideos({
    //   model: "veo-3.0-generate-001",
    //   prompt: request.prompt,
    //   config: { aspectRatio: request.aspectRatio }
    // });
    //
    // Poll until done:
    // while (!operation.done) {
    //   await new Promise(res => setTimeout(res, 10000));
    //   operation = await ai.operations.getVideosOperation({ operation });
    // }
    //
    // Download video:
    // const videoFile = operation.response.generatedVideos[0].video;
    // const videoData = await ai.files.download({ file: videoFile });

    throw new Error('Veo 3 API integration not yet implemented - requires Google GenAI SDK setup')
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'veo', version: '1.0.0' }))

// Generate single video
app.post('/generate', async (c) => {
  const service = new VeoService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.generateVideo(body)
  return c.json(result)
})

// Generate batch
app.post('/generate/batch', async (c) => {
  const service = new VeoService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.generateBatch(body)
  return c.json(result)
})

// Generate test batch (5 default prompts)
app.post('/generate/test', async (c) => {
  const service = new VeoService(c.env.ctx, c.env)
  const result = await service.generateTestBatch()
  return c.json(result)
})

// Get video by ID
app.get('/videos/:id', async (c) => {
  const service = new VeoService(c.env.ctx, c.env)
  const id = c.req.param('id')
  const result = await service.getVideo(id)

  if (!result) {
    return c.json({ error: 'Video not found' }, 404)
  }

  return c.json(result)
})

// List all prompts
app.get('/prompts', (c) => {
  const templates = getAllPromptTemplates()
  const prompts = templates.map((t) => ({
    template: t,
    prompt: generatePromptFromTemplate(t),
  }))
  return c.json(prompts)
})

export default {
  fetch: app.fetch,
}
