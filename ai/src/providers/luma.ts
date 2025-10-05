/**
 * Luma AI Provider
 *
 * Provides video generation via Luma Dream Machine API
 * Supports Dream Machine v1.6 (text-to-video, image-to-video)
 */

import type { AIServiceEnv, VideoGenerationOptions } from '../types'

export class LumaProvider {
  private env: AIServiceEnv
  private baseURL: string = 'https://api.lumalabs.ai/dream-machine/v1'

  constructor(env: AIServiceEnv) {
    this.env = env
  }

  /**
   * Get default video generation model
   */
  getDefaultVideoModel(): string {
    return 'dream-machine-v1.6'
  }

  /**
   * Generate video from text prompt or image
   */
  async generateVideo(prompt: string, options?: VideoGenerationOptions): Promise<ArrayBuffer> {
    if (!this.env.LUMA_API_KEY) {
      throw new Error('LUMA_API_KEY is not configured')
    }

    const model = options?.model || this.getDefaultVideoModel()
    const duration = options?.duration || 5 // Default 5 seconds
    const aspectRatio = options?.aspectRatio || '16:9'

    // Build request body
    const requestBody: any = {
      prompt: prompt,
      aspect_ratio: aspectRatio,
    }

    // Add first frame for image-to-video
    if (options?.firstFrame) {
      requestBody.keyframes = {
        frame0: {
          type: 'image',
          url: options.firstFrame,
        },
      }
    }

    // Add last frame for video extension/loop
    if (options?.lastFrame) {
      if (!requestBody.keyframes) {
        requestBody.keyframes = {}
      }
      requestBody.keyframes.frame1 = {
        type: 'image',
        url: options.lastFrame,
      }
    }

    // Camera movement
    if (options?.cameraMovement) {
      requestBody.camera_motion = options.cameraMovement
    }

    // Create generation
    const createResponse = await fetch(`${this.baseURL}/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.LUMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      throw new Error(`Luma API error (${createResponse.status}): ${error}`)
    }

    let generation = (await createResponse.json()) as any

    // Poll for completion
    let attempts = 0
    const maxAttempts = 180 // 3 minutes max (1 second intervals)

    while (generation.state !== 'completed' && generation.state !== 'failed' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++

      const pollResponse = await fetch(`${this.baseURL}/generations/${generation.id}`, {
        headers: {
          'Authorization': `Bearer ${this.env.LUMA_API_KEY}`,
        },
      })

      if (!pollResponse.ok) {
        throw new Error(`Failed to poll generation status: ${pollResponse.status}`)
      }

      generation = await pollResponse.json()
    }

    // Check final status
    if (generation.state === 'failed') {
      throw new Error(`Video generation failed: ${generation.failure_reason || 'Unknown error'}`)
    }

    if (!generation.video || !generation.video.url) {
      throw new Error('No video URL in response')
    }

    // Download the generated video
    const videoUrl = generation.video.url
    const videoResponse = await fetch(videoUrl)

    if (!videoResponse.ok) {
      throw new Error(`Failed to download generated video: ${videoResponse.status}`)
    }

    return await videoResponse.arrayBuffer()
  }

  /**
   * Get estimated cost for video generation
   * Based on Luma API pricing as of 2025
   */
  getEstimatedCost(duration: number, resolution: string): number {
    // Luma API pricing:
    // 5 seconds: 170 credits (~$0.20-$0.50 depending on provider)
    // 10 seconds: 340 credits
    // Average: ~$0.35 per 5-second video
    if (duration <= 5) {
      return 0.35
    } else {
      // 10 seconds
      return 0.70
    }
  }
}
