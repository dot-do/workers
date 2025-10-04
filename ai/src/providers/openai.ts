/**
 * OpenAI Provider Implementation
 * Supports GPT-5, GPT-4o, and embedding models via Cloudflare AI Gateway
 */

import type { AIProviderInterface, GenerateOptions } from 'ai-generation'
import type { EmbeddingOptions } from 'ai-embeddings'
import { calculateCost } from 'ai-models'
import type { AIServiceEnv, ImageGenerationOptions, ImageGenerationResponse, SpeechGenerationOptions } from '../types'

export class OpenAIProvider implements AIProviderInterface {
  private env: AIServiceEnv
  private baseURL: string

  constructor(env: AIServiceEnv) {
    this.env = env
    // Use Cloudflare AI Gateway for all OpenAI requests
    this.baseURL = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/services-studio/openai`
  }

  getDefaultModel(): string {
    return 'gpt-4o-mini'
  }

  getDefaultEmbeddingModel(): string {
    return 'text-embedding-3-small'
  }

  calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): number {
    return calculateCost(usage, model)
  }

  /**
   * Generate text using OpenAI models
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || this.getDefaultModel()
    const systemPrompt = options?.systemPrompt

    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        top_p: options?.topP ?? 1.0,
        frequency_penalty: options?.frequencyPenalty ?? 0,
        presence_penalty: options?.presencePenalty ?? 0,
        stop: options?.stop,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${error}`)
    }

    const data = await response.json() as any

    return data.choices[0].message.content
  }

  /**
   * Generate streaming text using OpenAI models
   */
  async generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream> {
    const model = options?.model || this.getDefaultModel()
    const systemPrompt = options?.systemPrompt

    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        top_p: options?.topP ?? 1.0,
        frequency_penalty: options?.frequencyPenalty ?? 0,
        presence_penalty: options?.presencePenalty ?? 0,
        stop: options?.stop,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${error}`)
    }

    if (!response.body) {
      throw new Error('No response body from OpenAI')
    }

    // Transform OpenAI SSE stream to our format
    return response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        const lines = text.split('\n').filter(line => line.trim().startsWith('data: '))

        for (const line of lines) {
          const data = line.replace(/^data: /, '')
          if (data === '[DONE]') {
            continue
          }

          try {
            const json = JSON.parse(data)
            const delta = json.choices[0]?.delta?.content || ''
            if (delta) {
              controller.enqueue(new TextEncoder().encode(delta))
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }))
  }

  /**
   * Generate embeddings using OpenAI models
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const model = options?.model || this.getDefaultEmbeddingModel()

    const response = await fetch(`${this.baseURL}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model,
        dimensions: options?.dimensions,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Embeddings API error: ${response.status} ${error}`)
    }

    const data = await response.json() as any

    return data.data[0].embedding
  }

  /**
   * Get default image generation model
   */
  getDefaultImageModel(): string {
    return 'dall-e-3'
  }

  /**
   * Generate images using DALL-E models
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResponse> {
    const startTime = Date.now()
    const model = options?.model || this.getDefaultImageModel()

    const response = await fetch(`${this.baseURL}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        style: options?.style || 'vivid',
        n: options?.n || 1,
        response_format: options?.responseFormat || 'url',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Images API error: ${response.status} ${error}`)
    }

    const data = await response.json() as any
    const latency = Date.now() - startTime

    // Calculate cost based on model and quality
    // DALL-E 3: Standard = $0.040, HD = $0.080 per image
    // DALL-E 2: $0.020 per image (1024x1024)
    const imagesCount = data.data?.length || 1
    let costPerImage = 0.040 // Default DALL-E 3 standard
    if (model === 'dall-e-3' && options?.quality === 'hd') {
      costPerImage = 0.080
    } else if (model === 'dall-e-2') {
      costPerImage = 0.020
    }
    const cost = imagesCount * costPerImage

    return {
      images: data.data.map((img: any) => ({
        url: img.url,
        b64_json: img.b64_json,
        revised_prompt: img.revised_prompt,
      })),
      model,
      provider: 'openai',
      cost,
      latency,
      usage: {
        requests: imagesCount,
      },
    }
  }

  /**
   * Get default speech model
   */
  getDefaultSpeechModel(): string {
    return 'tts-1'
  }

  /**
   * Generate speech using OpenAI TTS models
   */
  async generateSpeech(text: string, options?: SpeechGenerationOptions): Promise<ArrayBuffer> {
    const model = options?.model || this.getDefaultSpeechModel()

    const response = await fetch(`${this.baseURL}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice: options?.voice || 'alloy',
        speed: options?.speed || 1.0,
        response_format: options?.format || 'mp3',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI TTS API error: ${response.status} ${error}`)
    }

    return await response.arrayBuffer()
  }
}
