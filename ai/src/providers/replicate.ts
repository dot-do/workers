/**
 * Replicate AI Provider
 *
 * Provides music and video generation via Replicate API
 * Supports Stable Audio 2.5, Luma Ray, Kling v2.1, and other models
 */

import type { AIServiceEnv, MusicGenerationOptions, VideoGenerationOptions } from '../types'

export class ReplicateProvider {
  private env: AIServiceEnv
  private baseURL: string = 'https://api.replicate.com/v1'

  constructor(env: AIServiceEnv) {
    this.env = env
  }

  /**
   * Get default music generation model
   */
  getDefaultMusicModel(): string {
    return 'stability-ai/stable-audio-open-1.0'
  }

  /**
   * Generate music from text prompt
   */
  async generateMusic(prompt: string, options?: MusicGenerationOptions): Promise<ArrayBuffer> {
    if (!this.env.REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not configured')
    }

    const model = options?.model || this.getDefaultMusicModel()
    const duration = Math.min(options?.duration || 30, 180) // Max 180 seconds
    const format = options?.format || 'mp3'

    // Build enhanced prompt with style, mood, and BPM
    let fullPrompt = prompt
    if (options?.style) {
      fullPrompt += ` in ${options.style} style`
    }
    if (options?.mood) {
      fullPrompt += `, ${options.mood} mood`
    }
    if (options?.bpm) {
      fullPrompt += `, ${options.bpm} BPM`
    }

    // Create prediction
    const createResponse = await fetch(`${this.baseURL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60', // Wait up to 60 seconds for result
      },
      body: JSON.stringify({
        version: this.getModelVersion(model),
        input: {
          prompt: fullPrompt,
          seconds_total: duration,
          output_format: format,
          seed: options?.seed,
        },
      }),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      throw new Error(`Replicate API error (${createResponse.status}): ${error}`)
    }

    let prediction = await createResponse.json() as any

    // Poll for completion if not already complete
    let attempts = 0
    const maxAttempts = 120 // 2 minutes max (1 second intervals)

    while (
      (prediction.status === 'starting' || prediction.status === 'processing') &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++

      const pollResponse = await fetch(`${this.baseURL}/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${this.env.REPLICATE_API_KEY}`,
        },
      })

      if (!pollResponse.ok) {
        throw new Error(`Failed to poll prediction status: ${pollResponse.status}`)
      }

      prediction = await pollResponse.json()
    }

    // Check final status
    if (prediction.status === 'failed') {
      throw new Error(`Music generation failed: ${prediction.error || 'Unknown error'}`)
    }

    if (prediction.status === 'canceled') {
      throw new Error('Music generation was canceled')
    }

    if (!prediction.output) {
      throw new Error('No output generated')
    }

    // Download the generated audio
    const audioUrl = prediction.output
    const audioResponse = await fetch(audioUrl)

    if (!audioResponse.ok) {
      throw new Error(`Failed to download generated audio: ${audioResponse.status}`)
    }

    return await audioResponse.arrayBuffer()
  }

  /**
   * Get default video generation model
   */
  getDefaultVideoModel(): string {
    return 'luma/ray'
  }

  /**
   * Generate video from text prompt or image
   */
  async generateVideo(prompt: string, options?: VideoGenerationOptions): Promise<ArrayBuffer> {
    if (!this.env.REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not configured')
    }

    const model = options?.model || this.getDefaultVideoModel()
    const aspectRatio = options?.aspectRatio || '16:9'

    // Build input based on model
    const input: any = {
      prompt: prompt,
      aspect_ratio: aspectRatio,
    }

    // Add optional parameters
    if (options?.negativePrompt) {
      input.negative_prompt = options.negativePrompt
    }
    if (options?.seed) {
      input.seed = options.seed
    }

    // Image-to-video support
    if (options?.firstFrame) {
      input.image = options.firstFrame
    }

    // Create prediction
    const createResponse = await fetch(`${this.baseURL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60', // Wait up to 60 seconds for result
      },
      body: JSON.stringify({
        version: this.getVideoModelVersion(model),
        input,
      }),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      throw new Error(`Replicate API error (${createResponse.status}): ${error}`)
    }

    let prediction = (await createResponse.json()) as any

    // Poll for completion if not already complete
    let attempts = 0
    const maxAttempts = 180 // 3 minutes max (1 second intervals)

    while (
      (prediction.status === 'starting' || prediction.status === 'processing') &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++

      const pollResponse = await fetch(`${this.baseURL}/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${this.env.REPLICATE_API_KEY}`,
        },
      })

      if (!pollResponse.ok) {
        throw new Error(`Failed to poll prediction status: ${pollResponse.status}`)
      }

      prediction = await pollResponse.json()
    }

    // Check final status
    if (prediction.status === 'failed') {
      throw new Error(`Video generation failed: ${prediction.error || 'Unknown error'}`)
    }

    if (prediction.status === 'canceled') {
      throw new Error('Video generation was canceled')
    }

    if (!prediction.output) {
      throw new Error('No video output in response')
    }

    // Download the generated video
    const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    const videoResponse = await fetch(videoUrl)

    if (!videoResponse.ok) {
      throw new Error(`Failed to download generated video: ${videoResponse.status}`)
    }

    return await videoResponse.arrayBuffer()
  }

  /**
   * Get model version string for specific models
   */
  private getModelVersion(model: string): string {
    // Model version mappings (these may need to be updated)
    const versions: Record<string, string> = {
      'stability-ai/stable-audio-open-1.0': 'latest',
      'meta/musicgen': 'latest',
      'riffusion/riffusion': 'latest',
    }

    return versions[model] || 'latest'
  }

  /**
   * Get video model version string for specific models
   */
  private getVideoModelVersion(model: string): string {
    // Video model version mappings (these may need to be updated)
    const versions: Record<string, string> = {
      'luma/ray': 'latest',
      'kling-ai/kling-v2-1': 'latest',
      'minimax/video-01': 'latest',
    }

    return versions[model] || 'latest'
  }

  /**
   * Get estimated cost for music generation
   * Based on Replicate pricing as of 2025
   */
  getEstimatedCost(duration: number): number {
    // Stable Audio Open: ~$0.05 per generation
    // MusicGen: ~$0.03 per generation
    // Average: ~$0.08 per generation
    return 0.08
  }

  /**
   * Get estimated cost for video generation
   * Based on Replicate pricing as of 2025
   */
  getEstimatedVideoCost(duration: number, model: string): number {
    // Luma Ray: ~$0.35 per 5-second video
    // Kling v2.1: ~$0.50 per 5-second video
    // Average: ~$0.42 per 5-second video
    const basePrice = model.includes('kling') ? 0.50 : 0.35
    return (duration / 5) * basePrice
  }
}
