/**
 * Imagen AI Image Generation Service
 *
 * Generates AI images using Google Imagen 3 and OpenAI DALL-E 3, stores them in R2
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { ulid } from 'ulid'
import type { Env, ImageGenerationRequest, ImageGenerationResponse, BatchImageGenerationRequest, BatchImageGenerationResponse } from './types'
import { imageGenerationRequestSchema, batchImageGenerationRequestSchema } from './schema'
import { generateBatchPrompts, generatePromptFromTemplate, getAllPromptTemplates } from './prompts'

/**
 * Imagen Service RPC Interface
 */
export class ImagenService extends WorkerEntrypoint<Env> {
  /**
   * Generate a single image
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const validated = imageGenerationRequestSchema.parse(request)
    const id = ulid()

    try {
      // Store initial record in database
      await this.env.DB.execute(
        `INSERT INTO imagen_images (id, prompt, provider, size, status, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          validated.prompt,
          validated.provider || 'google-imagen',
          validated.size || '1024x1024',
          'pending',
          new Date().toISOString(),
          JSON.stringify(validated.metadata || {}),
        ]
      )

      // Start image generation (async - will be processed in background)
      this.ctx.waitUntil(this.processImageGeneration(id, validated))

      return {
        id,
        status: 'pending',
        prompt: validated.prompt,
        provider: validated.provider || 'google-imagen',
        size: validated.size || '1024x1024',
        createdAt: new Date().toISOString(),
        metadata: validated.metadata,
      }
    } catch (error: any) {
      console.error('Failed to start image generation:', error)
      throw new Error(`Image generation failed: ${error.message}`)
    }
  }

  /**
   * Generate multiple images in batch
   */
  async generateBatch(request: BatchImageGenerationRequest): Promise<BatchImageGenerationResponse> {
    const validated = batchImageGenerationRequestSchema.parse(request)
    const batchId = ulid()

    const images: ImageGenerationResponse[] = []

    for (const promptConfig of validated.prompts) {
      const image = await this.generateImage({
        ...promptConfig,
        metadata: { ...validated.metadata, batchId },
      })
      images.push(image)
    }

    return {
      batchId,
      images,
      total: images.length,
      pending: images.filter((v) => v.status === 'pending').length,
      completed: 0,
      failed: 0,
    }
  }

  /**
   * Generate 5 test images using default prompts
   */
  async generateTestBatch(): Promise<BatchImageGenerationResponse> {
    const prompts = generateBatchPrompts()
    const templates = getAllPromptTemplates()

    return this.generateBatch({
      prompts: prompts.map((prompt, i) => ({
        prompt,
        provider: i % 2 === 0 ? 'google-imagen' : 'openai-dalle', // Alternate between providers
        size: i < 3 ? '1024x1024' : '1792x1024', // Mix sizes
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
   * Get image status by ID
   */
  async getImage(id: string): Promise<ImageGenerationResponse | null> {
    const result = await this.env.DB.execute(`SELECT * FROM imagen_images WHERE id = ?`, [id])

    if (!result.rows.length) {
      return null
    }

    const row = result.rows[0] as any

    return {
      id: row.id,
      status: row.status,
      prompt: row.prompt,
      provider: row.provider,
      size: row.size,
      imageUrl: row.image_url,
      r2Key: row.r2_key,
      error: row.error,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }
  }

  /**
   * Process image generation in background
   */
  private async processImageGeneration(id: string, request: ImageGenerationRequest): Promise<void> {
    try {
      // Update status to processing
      await this.env.DB.execute(`UPDATE imagen_images SET status = ? WHERE id = ?`, ['processing', id])

      // Call appropriate provider
      const imageData = request.provider === 'openai-dalle' ? await this.callOpenAIAPI(request) : await this.callGoogleImagenAPI(request)

      // Upload to R2
      const r2Key = `images/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${id}.png`
      await this.env.IMAGES.put(r2Key, imageData)

      // Generate public URL
      const imageUrl = `https://images.services.do/${r2Key}`

      // Update database with completion
      await this.env.DB.execute(
        `UPDATE imagen_images SET status = ?, image_url = ?, r2_key = ?, completed_at = ? WHERE id = ?`,
        ['completed', imageUrl, r2Key, new Date().toISOString(), id]
      )
    } catch (error: any) {
      console.error('Image generation failed:', error)
      await this.env.DB.execute(`UPDATE imagen_images SET status = ?, error = ? WHERE id = ?`, ['failed', error.message, id])
    }
  }

  /**
   * Call Google Imagen 3 API
   */
  private async callGoogleImagenAPI(request: ImageGenerationRequest): Promise<ArrayBuffer> {
    // TODO: Implement actual Google Imagen 3 API call
    // The API structure from research:
    //
    // import { GoogleGenAI } from "@google/genai";
    // const ai = new GoogleGenAI({ apiKey: this.env.GOOGLE_API_KEY });
    // const result = await ai.models.generateImages({
    //   model: "imagen-3.0-generate-001",
    //   prompt: request.prompt,
    //   config: {
    //     numberOfImages: 1,
    //     aspectRatio: request.size,
    //     negativePrompt: request.negativePrompt
    //   }
    // });
    // const imageFile = result.images[0];
    // const imageData = await ai.files.download({ file: imageFile });

    throw new Error('Google Imagen 3 API integration not yet implemented - requires Google GenAI SDK setup')
  }

  /**
   * Call OpenAI DALL-E 3 API
   */
  private async callOpenAIAPI(request: ImageGenerationRequest): Promise<ArrayBuffer> {
    try {
      // Initialize OpenAI client
      // Note: This is a simplified version - actual Workers implementation may vary
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: request.prompt,
          n: 1,
          size: request.size || '1024x1024',
          quality: request.quality || 'standard',
          style: request.style || 'vivid',
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data: any = await response.json()
      const imageUrl = data.data[0].url

      // Download the image
      const imageResponse = await fetch(imageUrl)
      return await imageResponse.arrayBuffer()
    } catch (error: any) {
      console.error('OpenAI API call failed:', error)
      throw new Error(`OpenAI DALL-E 3 failed: ${error.message}`)
    }
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'imagen', version: '1.0.0' }))

// Generate single image
app.post('/generate', async (c) => {
  const service = new ImagenService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.generateImage(body)
  return c.json(result)
})

// Generate batch
app.post('/generate/batch', async (c) => {
  const service = new ImagenService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.generateBatch(body)
  return c.json(result)
})

// Generate test batch (5 default prompts)
app.post('/generate/test', async (c) => {
  const service = new ImagenService(c.env.ctx, c.env)
  const result = await service.generateTestBatch()
  return c.json(result)
})

// Get image by ID
app.get('/images/:id', async (c) => {
  const service = new ImagenService(c.env.ctx, c.env)
  const id = c.req.param('id')
  const result = await service.getImage(id)

  if (!result) {
    return c.json({ error: 'Image not found' }, 404)
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
