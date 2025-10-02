/**
 * AI Service - Multi-Provider AI Generation Service
 *
 * Supports OpenAI, Anthropic, and Workers AI with automatic fallback
 * Provides text generation, streaming, embeddings, and content analysis
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { WorkersAIProvider } from './providers/workers-ai'
import type {
  AIServiceEnv,
  AIProvider,
  GenerateOptions,
  GenerateResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  AnalysisResult,
  AIProviderInterface,
} from './types'
import { calculateCost } from './types'

export default class AIService extends WorkerEntrypoint<AIServiceEnv> {
  private providers: Map<AIProvider, AIProviderInterface>

  constructor(ctx: ExecutionContext, env: AIServiceEnv) {
    super(ctx, env)

    // Initialize providers
    this.providers = new Map([
      ['openai', new OpenAIProvider(env)],
      ['anthropic', new AnthropicProvider(env)],
      ['workers-ai', new WorkersAIProvider(env)],
    ])
  }

  /**
   * Get provider instance
   */
  private getProvider(provider: AIProvider): AIProviderInterface {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Unknown provider: ${provider}`)
    }
    return providerInstance
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: AIProvider): string {
    return this.getProvider(provider).getDefaultModel()
  }

  /**
   * Generate text with automatic fallback
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const provider = options?.provider || 'openai'
    const model = options?.model || this.getDefaultModel(provider)

    try {
      return await this.getProvider(provider).generateText(prompt, { ...options, model })
    } catch (error) {
      // Fallback to different provider if enabled
      if (options?.fallback !== false) {
        return await this.generateWithFallback(prompt, provider, options)
      }
      throw error
    }
  }

  /**
   * Generate text with provider fallback chain
   */
  private async generateWithFallback(prompt: string, failedProvider: AIProvider, options?: GenerateOptions): Promise<string> {
    // Fallback chain: openai -> anthropic -> workers-ai
    const fallbackChain: AIProvider[] = ['openai', 'anthropic', 'workers-ai'].filter(p => p !== failedProvider)

    for (const provider of fallbackChain) {
      try {
        const model = this.getDefaultModel(provider)
        return await this.getProvider(provider).generateText(prompt, { ...options, model })
      } catch (error) {
        console.error(`Fallback to ${provider} failed:`, error)
        continue
      }
    }

    throw new Error('All providers failed to generate text')
  }

  /**
   * Generate streaming response
   */
  async generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream> {
    const provider = options?.provider || 'openai'
    const model = options?.model || this.getDefaultModel(provider)

    return await this.getProvider(provider).generateStream(prompt, { ...options, model })
  }

  /**
   * Generate embedding vector
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const provider = options?.provider || 'openai'
    const model = options?.model || this.getProvider(provider).getDefaultEmbeddingModel()

    try {
      return await this.getProvider(provider).generateEmbedding(text, { ...options, model })
    } catch (error) {
      // Fallback to Workers AI for embeddings if primary fails
      if (provider !== 'workers-ai') {
        const workersAI = this.getProvider('workers-ai')
        return await workersAI.generateEmbedding(text, { ...options, model: workersAI.getDefaultEmbeddingModel() })
      }
      throw error
    }
  }

  /**
   * Analyze content with AI
   */
  async analyzeContent(content: string, analysis: string, options?: GenerateOptions): Promise<string> {
    const prompt = `Analyze the following content for: ${analysis}\n\nContent:\n${content}`
    return await this.generateText(prompt, { ...options, model: options?.model || 'gpt-4o' })
  }

  /**
   * RPC Method: Generate text with full response metadata
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'openai'
    const model = options?.model || this.getDefaultModel(provider)

    const text = await this.generateText(prompt, { ...options, provider, model })

    const latency = Date.now() - startTime

    // Mock usage for now - would need actual response from providers
    const usage = {
      promptTokens: Math.ceil(prompt.length / 4), // Rough estimate
      completionTokens: Math.ceil(text.length / 4),
      totalTokens: Math.ceil((prompt.length + text.length) / 4),
    }

    const cost = calculateCost(usage, model)

    return {
      text,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Generate embedding with full response metadata
   */
  async embed(text: string, options?: EmbeddingOptions): Promise<EmbeddingResponse> {
    const startTime = Date.now()
    const provider = options?.provider || 'openai'
    const model = options?.model || this.getProvider(provider).getDefaultEmbeddingModel()

    const embedding = await this.generateEmbedding(text, { ...options, provider, model })

    const latency = Date.now() - startTime

    const usage = {
      promptTokens: Math.ceil(text.length / 4),
      totalTokens: Math.ceil(text.length / 4),
    }

    const cost = calculateCost({ promptTokens: usage.promptTokens, completionTokens: 0 }, model)

    return {
      embedding,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * RPC Method: Analyze content with full response metadata
   */
  async analyze(content: string, analysis: string, options?: GenerateOptions): Promise<AnalysisResult> {
    const startTime = Date.now()
    const provider = options?.provider || 'openai'
    const model = options?.model || 'gpt-4o'

    const result = await this.analyzeContent(content, analysis, { ...options, provider, model })

    const latency = Date.now() - startTime

    const usage = {
      promptTokens: Math.ceil((content.length + analysis.length) / 4),
      completionTokens: Math.ceil(result.length / 4),
      totalTokens: Math.ceil((content.length + analysis.length + result.length) / 4),
    }

    const cost = calculateCost(usage, model)

    return {
      analysis,
      result,
      content,
      model,
      provider,
      usage,
      cost,
      latency,
    }
  }

  /**
   * HTTP fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const { pathname, searchParams } = url

    try {
      // POST /ai/generate - Generate text
      if (pathname === '/ai/generate' && request.method === 'POST') {
        const body = await request.json() as any
        const { prompt, ...options } = body

        if (!prompt) {
          return Response.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const response = await this.generate(prompt, options)
        return Response.json(response)
      }

      // POST /ai/stream - Generate streaming text (SSE)
      if (pathname === '/ai/stream' && request.method === 'POST') {
        const body = await request.json() as any
        const { prompt, ...options } = body

        if (!prompt) {
          return Response.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const stream = await this.generateStream(prompt, options)

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }

      // POST /ai/embed - Generate embedding
      if (pathname === '/ai/embed' && request.method === 'POST') {
        const body = await request.json() as any
        const { text, ...options } = body

        if (!text) {
          return Response.json({ error: 'Text is required' }, { status: 400 })
        }

        const response = await this.embed(text, options)
        return Response.json(response)
      }

      // POST /ai/analyze - Analyze content
      if (pathname === '/ai/analyze' && request.method === 'POST') {
        const body = await request.json() as any
        const { content, analysis, ...options } = body

        if (!content || !analysis) {
          return Response.json({ error: 'Content and analysis are required' }, { status: 400 })
        }

        const response = await this.analyze(content, analysis, options)
        return Response.json(response)
      }

      // GET /ai/health - Health check
      if (pathname === '/ai/health' && request.method === 'GET') {
        return Response.json({
          status: 'healthy',
          providers: ['openai', 'anthropic', 'workers-ai'],
          timestamp: new Date().toISOString(),
        })
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      console.error('AI Service error:', error)
      return Response.json(
        {
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }
}

// Export types for consumers
export * from './types'
