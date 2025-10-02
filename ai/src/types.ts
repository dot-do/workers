/**
 * AI Service Types
 * Comprehensive type definitions for multi-provider AI service
 */

export type AIProvider = 'openai' | 'anthropic' | 'workers-ai'

export interface GenerateOptions {
  provider?: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  fallback?: boolean
  stream?: boolean
  systemPrompt?: string
}

export interface GenerateResponse {
  text: string
  model: string
  provider: AIProvider
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: number
  latency: number
}

export interface StreamChunk {
  delta: string
  done: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface EmbeddingOptions {
  provider?: AIProvider
  model?: string
  dimensions?: number
}

export interface EmbeddingResponse {
  embedding: number[]
  model: string
  provider: AIProvider
  usage: {
    promptTokens: number
    totalTokens: number
  }
  cost?: number
  latency: number
}

export interface AnalysisResult {
  analysis: string
  result: string
  content: string
  model: string
  provider: AIProvider
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: number
  latency: number
}

export interface AIServiceEnv extends Env {
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
  OPENROUTER_API_KEY?: string
  CLOUDFLARE_ACCOUNT_ID: string
  AI: Ai
}

/**
 * Provider interface - all providers must implement this
 */
export interface AIProviderInterface {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>
  generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream>
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>
  getDefaultModel(): string
  getDefaultEmbeddingModel(): string
  calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): number
}

/**
 * Model pricing per 1M tokens (in USD)
 */
export interface ModelPricing {
  input: number
  output: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI GPT-5
  'gpt-5': { input: 15.0, output: 60.0 },
  'gpt-5-mini': { input: 2.0, output: 8.0 },
  'gpt-5-nano': { input: 0.5, output: 2.0 },

  // OpenAI GPT-4
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },

  // Anthropic Claude
  'claude-sonnet-4.5': { input: 3.0, output: 15.0 },
  'claude-4.5-sonnet': { input: 3.0, output: 15.0 },
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-haiku-4': { input: 0.25, output: 1.25 },

  // Workers AI (free/very low cost)
  '@cf/meta/llama-3.1-8b-instruct': { input: 0.0, output: 0.0 },
  '@cf/google/embeddinggemma-300m': { input: 0.0, output: 0.0 },
  '@cf/baai/bge-base-en-v1.5': { input: 0.0, output: 0.0 },

  // OpenAI Embeddings
  'text-embedding-3-small': { input: 0.02, output: 0.0 },
  'text-embedding-3-large': { input: 0.13, output: 0.0 },
  'text-embedding-ada-002': { input: 0.10, output: 0.0 },
}

/**
 * Calculate cost based on token usage and model
 */
export function calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0

  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output

  return inputCost + outputCost
}
