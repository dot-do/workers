/**
 * llm.do - AI Gateway SDK
 *
 * Strongly-typed client for the llm.do AI Gateway.
 *
 * @example
 * ```typescript
 * import { llm } from 'llm.do'
 *
 * const response = await llm.complete({
 *   model: 'claude-3-opus',
 *   prompt: 'Hello!'
 * })
 *
 * // Or with custom options
 * import { createLLM } from 'llm.do'
 * const myLLM = createLLM({ apiKey: 'xxx' })
 * ```
 */

import { createClient, type ClientOptions } from '@dotdo/rpc-client'

// Types
export interface CompletionOptions {
  /** Model to use (claude-3-opus, gpt-4, etc.) */
  model: string
  /** Simple prompt (for non-chat completions) */
  prompt?: string
  /** Chat messages */
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Temperature (0-2) */
  temperature?: number
  /** Use customer's own API key (stored in Vault) */
  apiKey?: string
}

export interface CompletionResponse {
  /** Generated content */
  content: string
  /** Model used */
  model: string
  /** Token usage */
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamOptions extends CompletionOptions {
  stream: true
}

export interface UsageRecord {
  customerId: string
  tokens: number
  model: string
  timestamp: Date
}

export interface UsageSummary {
  totalTokens: number
  totalCost: number
  byModel: Record<string, { tokens: number; cost: number }>
}

// Client interface
export interface LLMClient {
  /**
   * Generate a completion - automatically metered and billed
   */
  complete(options: CompletionOptions): Promise<CompletionResponse>

  /**
   * Stream a completion - usage tracked on completion
   */
  stream(options: StreamOptions): Promise<ReadableStream<string>>

  /**
   * List available models
   */
  models(): Promise<string[]>

  /**
   * Get usage for billing
   */
  usage(customerId: string, period?: { start: Date; end: Date }): Promise<UsageSummary>

  /**
   * Chat completion (convenience method)
   */
  chat(messages: Array<{ role: string; content: string }>, options?: Partial<CompletionOptions>): Promise<CompletionResponse>
}

/**
 * Create a configured LLM client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { LLM } from 'llm.do'
 * const myLLM = LLM({ apiKey: 'xxx' })
 * ```
 */
export function LLM(options?: ClientOptions): LLMClient {
  return createClient<LLMClient>('https://llm.do', options)
}

/**
 * Default LLM client instance (camelCase)
 * Uses environment variable LLM_API_KEY if available
 *
 * @example
 * ```typescript
 * import { llm } from 'llm.do'
 * await llm.complete({ model: 'claude-3-opus', prompt: '...' })
 * ```
 */
export const llm: LLMClient = LLM({
  apiKey: typeof process !== 'undefined' ? process.env?.LLM_API_KEY : undefined,
})

// Legacy alias
export const createLLM = LLM

// Re-export types
export type { ClientOptions } from '@dotdo/rpc-client'
