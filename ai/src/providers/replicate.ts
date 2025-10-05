/**
 * Replicate AI Provider
 *
 * Provides music generation via Replicate API
 * Supports Stable Audio 2.5 and other music generation models
 */

import type { AIServiceEnv, MusicGenerationOptions } from '../types'

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
   * Get estimated cost for music generation
   * Based on Replicate pricing as of 2025
   */
  getEstimatedCost(duration: number): number {
    // Stable Audio Open: ~$0.05 per generation
    // MusicGen: ~$0.03 per generation
    // Average: ~$0.08 per generation
    return 0.08
  }
}
