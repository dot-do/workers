/**
 * AI Service Types
 * Worker-specific type definitions
 *
 * Core AI types are imported from foundation packages:
 * - ai-generation: Text generation types
 * - ai-embeddings: Embedding types
 * - ai-models: Model registry and pricing
 */

// Re-export core types from foundation packages
import type {
  GenerateOptions as GenOptions,
  AIProvider as AIProviderType,
  GenerateResponse as GenResponse,
  GenerateStreamChunk,
} from 'ai-generation'

import type {
  EmbeddingOptions as EmbedOptions,
  EmbeddingResponse as EmbedResponse,
} from 'ai-embeddings'

export type AIProvider = AIProviderType
export type GenerateOptions = GenOptions
export type GenerateResponse = GenResponse
export type StreamChunk = GenerateStreamChunk
export type EmbeddingOptions = EmbedOptions
export type EmbeddingResponse = EmbedResponse

// Worker-specific types (not in foundation packages)

/**
 * Extended AI Provider Interface for workers/ai service
 * Combines text generation and embedding capabilities
 */
export interface AIProviderInterface {
  // Text generation methods (from ai-generation)
  generateText(prompt: string, options?: GenerateOptions): Promise<string>
  generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream>
  getDefaultModel(): string
  calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): number

  // Embedding methods (from ai-embeddings concept)
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>
  getDefaultEmbeddingModel(): string
}

/**
 * Analysis result response
 */
export interface AnalysisResult {
  analysis: string
  result: string
  content: string
  model: string
  provider: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: number
  latency: number
}

/**
 * AI Service environment bindings
 */
export interface AIServiceEnv extends Env {
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
  OPENROUTER_API_KEY?: string
  CLOUDFLARE_ACCOUNT_ID: string
  AI: Ai
}
