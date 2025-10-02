/**
 * OpenAI Provider Implementation
 * Supports GPT-5, GPT-4o, and embedding models via Cloudflare AI Gateway
 */

import type { AIProviderInterface, GenerateOptions, EmbeddingOptions, AIServiceEnv, ModelPricing } from '../types'
import { MODEL_PRICING } from '../types'

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
    const pricing = MODEL_PRICING[model]
    if (!pricing) return 0

    const inputCost = (usage.promptTokens / 1_000_000) * pricing.input
    const outputCost = (usage.completionTokens / 1_000_000) * pricing.output

    return inputCost + outputCost
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
}
