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
 * Combines text generation, image generation, speech generation, and embedding capabilities
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

  // Image generation methods (optional - not all providers support images)
  generateImage?(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResponse>
  getDefaultImageModel?(): string

  // Speech generation methods (optional - not all providers support speech)
  generateSpeech?(text: string, options?: SpeechGenerationOptions): Promise<ArrayBuffer>
  getDefaultSpeechModel?(): string
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
 * Image generation options
 */
export interface ImageGenerationOptions {
  provider?: AIProvider
  model?: string
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '256x256'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  n?: number // Number of images to generate (1-10)
  responseFormat?: 'url' | 'b64_json'
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
  images: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
  model: string
  provider: string
  cost?: number
  latency: number
  usage?: {
    requests: number
  }
}

/**
 * Speech generation options
 */
export interface SpeechGenerationOptions {
  provider?: AIProvider
  model?: 'tts-1' | 'tts-1-hd' | string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number // 0.25 to 4.0
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav'
}

/**
 * Speech generation response
 */
export interface SpeechGenerationResponse {
  audio: ArrayBuffer
  audioUrl?: string // R2 URL for the uploaded audio
  model: string
  provider: string
  voice: string
  format: string
  cost?: number
  latency: number
  usage?: {
    characters: number
  }
}

/**
 * List generation options
 */
export interface ListOptions extends GenerateOptions {
  count?: number // Number of items in list (default: 10)
  format?: 'json' | 'markdown' | 'plain'
  criteria?: string[] // Optional filtering criteria
}

/**
 * List generation response
 */
export interface ListResponse {
  items: string[]
  count: number
  topic: string
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
 * Research options
 */
export interface ResearchOptions extends GenerateOptions {
  depth?: 'shallow' | 'medium' | 'deep'
  sources?: number // Number of sources to synthesize (default: 5)
  format?: 'summary' | 'detailed' | 'outline'
}

/**
 * Research response
 */
export interface ResearchResponse {
  summary: string
  findings: string[]
  sources: Array<{
    title: string
    content: string
    relevance: number
  }>
  topic: string
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
 * Code generation options
 */
export interface CodeOptions extends GenerateOptions {
  language?: string // e.g., 'typescript', 'python', 'rust'
  framework?: string // e.g., 'react', 'fastapi', 'actix'
  style?: 'minimal' | 'production' | 'documented'
  includeTests?: boolean
}

/**
 * Code generation response
 */
export interface CodeResponse {
  code: string
  language: string
  explanation: string
  tests?: string
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
  MEDIA_BUCKET: R2Bucket
  AI_QUEUE: Queue
}

/**
 * Background job types
 */
export type BackgroundJobType = 'generate' | 'analyze' | 'embed' | 'generateImage' | 'generateSpeech' | 'list' | 'research' | 'code'

/**
 * Background job request
 */
export interface BackgroundJobRequest {
  id: string
  type: BackgroundJobType
  input: any
  options?: any
  createdAt: number
}

/**
 * Background job result
 */
export interface BackgroundJobResult {
  id: string
  type: BackgroundJobType
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: any
  error?: string
  createdAt: number
  completedAt?: number
}

/**
 * Batch request
 */
export interface BatchRequest {
  requests: Array<{
    id: string
    type: BackgroundJobType
    input: any
    options?: any
  }>
}
