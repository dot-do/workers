/**
 * Runway AI Provider
 *
 * Provides video generation via Runway Gen-3 API
 * Supports Gen-3 Alpha Turbo with camera control
 */

import type { AIServiceEnv, VideoGenerationOptions } from '../types'

export class RunwayProvider {
  private env: AIServiceEnv
  private baseURL: string = 'https://api.dev.runwayml.com/v1'

  constructor(env: AIServiceEnv) {
    this.env = env
  }

  /**
   * Get default video generation model
   */
  getDefaultVideoModel(): string {
    return 'gen3a_turbo'
  }

  /**
   * Generate video from text prompt or image
   */
  async generateVideo(prompt: string, options?: VideoGenerationOptions): Promise<ArrayBuffer> {
    if (!this.env.RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not configured')
    }

    const model = options?.model || this.getDefaultVideoModel()
    const duration = options?.duration || 5 // Default 5 seconds (max 10)
    const resolution = options?.resolution || '720p'

    // Build request body
    const requestBody: any = {
      text_prompt: prompt,
      duration: duration,
      ratio: options?.aspectRatio || '16:9',
      seed: options?.seed,
    }

    // Add image for image-to-video
    if (options?.firstFrame) {
      requestBody.init_image = options.firstFrame
    }

    // Camera movement (Runway-specific)
    if (options?.cameraMovement) {
      requestBody.camera_motion = options.cameraMovement
    }

    // Style reference
    if (options?.styleReference) {
      requestBody.style_image = options.styleReference
    }

    // Create task
    const createResponse = await fetch(`${this.baseURL}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        taskType: 'gen3a_turbo',
        internal: false,
        options: requestBody,
      }),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      throw new Error(`Runway API error (${createResponse.status}): ${error}`)
    }

    let task = (await createResponse.json()) as any

    // Poll for completion
    let attempts = 0
    const maxAttempts = 300 // 5 minutes max (1 second intervals)

    while (task.status !== 'SUCCEEDED' && task.status !== 'FAILED' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++

      const pollResponse = await fetch(`${this.baseURL}/tasks/${task.id}`, {
        headers: {
          'Authorization': `Bearer ${this.env.RUNWAY_API_KEY}`,
          'X-Runway-Version': '2024-11-06',
        },
      })

      if (!pollResponse.ok) {
        throw new Error(`Failed to poll task status: ${pollResponse.status}`)
      }

      task = await pollResponse.json()
    }

    // Check final status
    if (task.status === 'FAILED') {
      throw new Error(`Video generation failed: ${task.failure || 'Unknown error'}`)
    }

    if (!task.output || !task.output.length) {
      throw new Error('No video output in response')
    }

    // Download the generated video
    const videoUrl = task.output[0]
    const videoResponse = await fetch(videoUrl)

    if (!videoResponse.ok) {
      throw new Error(`Failed to download generated video: ${videoResponse.status}`)
    }

    return await videoResponse.arrayBuffer()
  }

  /**
   * Get estimated cost for video generation
   * Based on Runway API pricing as of 2025 ($0.01 per credit)
   */
  getEstimatedCost(duration: number, resolution: string): number {
    // Runway Gen-3 Alpha Turbo pricing:
    // ~10-20 credits per generation ($0.10-$0.20)
    // Varies by duration and complexity
    const baseCredits = 10
    const durationMultiplier = duration / 5
    const resolutionMultiplier = resolution === '4k' ? 2 : resolution === '1080p' ? 1.5 : 1

    const credits = baseCredits * durationMultiplier * resolutionMultiplier
    return credits * 0.01 // $0.01 per credit
  }
}
