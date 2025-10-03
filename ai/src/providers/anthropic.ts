/**
 * Anthropic Provider Implementation
 * Supports Claude models via OpenRouter + Cloudflare AI Gateway
 */

import type { AIProviderInterface, GenerateOptions } from 'ai-generation'
import type { EmbeddingOptions } from 'ai-embeddings'
import { calculateCost as calcCost } from 'ai-models'
import type { AIServiceEnv } from '../types'

export class AnthropicProvider implements AIProviderInterface {
  private env: AIServiceEnv
  private baseURL: string

  constructor(env: AIServiceEnv) {
    this.env = env
    // Use Cloudflare AI Gateway + OpenRouter for Claude models
    this.baseURL = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/services-studio/openrouter`
  }

  getDefaultModel(): string {
    return 'anthropic/claude-sonnet-4.5'
  }

  getDefaultEmbeddingModel(): string {
    // Anthropic doesn't provide embeddings - fallback to OpenAI
    throw new Error('Anthropic does not support embeddings. Use OpenAI or Workers AI instead.')
  }

  calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): number {
    // Map OpenRouter model names to our pricing keys
    const pricingKey = model.replace('anthropic/', '')
    return calcCost(usage, pricingKey) || calcCost(usage, 'claude-sonnet-4.5')
  }

  /**
   * Generate text using Claude models via OpenRouter
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || this.getDefaultModel()
    const systemPrompt = options?.systemPrompt

    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${this.baseURL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENROUTER_API_KEY || this.env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://services.do',
        'X-Title': 'AI Service',
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
      throw new Error(`Anthropic API error: ${response.status} ${error}`)
    }

    const data = await response.json() as any

    return data.choices[0].message.content
  }

  /**
   * Generate streaming text using Claude models
   */
  async generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream> {
    const model = options?.model || this.getDefaultModel()
    const systemPrompt = options?.systemPrompt

    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${this.baseURL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENROUTER_API_KEY || this.env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://services.do',
        'X-Title': 'AI Service',
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
      throw new Error(`Anthropic API error: ${response.status} ${error}`)
    }

    if (!response.body) {
      throw new Error('No response body from Anthropic')
    }

    // Transform OpenRouter SSE stream to our format
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
   * Embeddings not supported by Anthropic
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    throw new Error('Anthropic does not support embeddings. Use OpenAI or Workers AI instead.')
  }
}
