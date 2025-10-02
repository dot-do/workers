/**
 * Workers AI Provider Implementation
 * Uses Cloudflare's native Workers AI (free/low-cost models)
 */

import type { AIProviderInterface, GenerateOptions, EmbeddingOptions, AIServiceEnv } from '../types'

export class WorkersAIProvider implements AIProviderInterface {
  private env: AIServiceEnv

  constructor(env: AIServiceEnv) {
    this.env = env
  }

  getDefaultModel(): string {
    return '@cf/meta/llama-3.1-8b-instruct'
  }

  getDefaultEmbeddingModel(): string {
    return '@cf/baai/bge-base-en-v1.5'
  }

  calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): number {
    // Workers AI is free for reasonable usage
    return 0
  }

  /**
   * Generate text using Workers AI
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || this.getDefaultModel()
    const systemPrompt = options?.systemPrompt

    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.env.AI.run(model as any, {
      messages,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
    }) as any

    if (typeof response === 'string') {
      return response
    }

    if (response && typeof response === 'object') {
      if ('response' in response) {
        return response.response
      }
      if ('result' in response && 'response' in response.result) {
        return response.result.response
      }
    }

    throw new Error('Unexpected Workers AI response format')
  }

  /**
   * Generate streaming text using Workers AI
   */
  async generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream> {
    const model = options?.model || this.getDefaultModel()
    const systemPrompt = options?.systemPrompt

    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.env.AI.run(model as any, {
      messages,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    }) as any

    if (response instanceof ReadableStream) {
      // Workers AI returns a stream of objects, we need to extract the text
      return response.pipeThrough(new TransformStream({
        transform(chunk, controller) {
          if (chunk && typeof chunk === 'object') {
            let text: string | undefined

            if ('response' in chunk) {
              text = chunk.response
            } else if ('delta' in chunk) {
              text = chunk.delta
            } else if ('content' in chunk) {
              text = chunk.content
            }

            if (text) {
              controller.enqueue(new TextEncoder().encode(text))
            }
          }
        }
      }))
    }

    // If not a stream, convert response to stream
    const text = typeof response === 'string' ? response : JSON.stringify(response)
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text))
        controller.close()
      }
    })
  }

  /**
   * Generate embeddings using Workers AI
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const model = options?.model || this.getDefaultEmbeddingModel()

    const response = await this.env.AI.run(model as any, {
      text: [text],
    }) as any

    if (response && typeof response === 'object' && 'data' in response) {
      const data = response.data
      if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0])) {
          return data[0]
        }
        return data
      }
    }

    throw new Error('Unexpected Workers AI embedding response format')
  }
}
