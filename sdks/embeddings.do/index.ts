/**
 * embeddings.do - Embedding SDK with intelligent caching for text embeddings
 *
 * Provides text embeddings with automatic caching for duplicate texts,
 * reducing API calls and improving performance.
 *
 * @see https://embeddings.do
 *
 * @example
 * ```typescript
 * import { embeddings } from 'embeddings.do'
 *
 * // Single text embedding
 * const result = await embeddings.embed('Hello, world!')
 * console.log(result.embedding) // [0.1, 0.2, ...]
 * console.log(result.cached) // false (first call) or true (subsequent)
 *
 * // Batch embeddings (deduplicates automatically)
 * const batch = await embeddings.embedBatch(['Hello', 'World', 'Hello'])
 * // 'Hello' only embedded once, result reused for duplicate
 *
 * // Compute similarity between texts
 * const similarity = await embeddings.similarity('Hello', 'Hi there')
 * console.log(similarity.score) // 0.85
 *
 * // Check cache statistics
 * const stats = await embeddings.cacheStats()
 * console.log(stats.hitRate) // 0.667
 *
 * // With custom options
 * import { Embeddings } from 'embeddings.do'
 * const custom = Embeddings({ apiKey: 'xxx' })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// =============================================================================
// Types
// =============================================================================

/**
 * Request for a single text embedding
 */
export interface EmbeddingRequest {
  /** Text to embed */
  text: string
  /** Embedding model to use */
  model?: string
  /** Output dimensions (for models that support it) */
  dimensions?: number
  /** Skip cache and force fresh embedding */
  skipCache?: boolean
}

/**
 * Response containing a single embedding
 */
export interface EmbeddingResponse {
  /** Vector embedding */
  embedding: number[]
  /** Model used for embedding */
  model: string
  /** Token usage for billing */
  usage: {
    tokens: number
  }
  /** Whether this result came from cache */
  cached: boolean
}

/**
 * Request for batch text embeddings
 */
export interface BatchEmbeddingRequest {
  /** Texts to embed */
  texts: string[]
  /** Embedding model to use */
  model?: string
  /** Output dimensions (for models that support it) */
  dimensions?: number
  /** Skip cache and force fresh embeddings */
  skipCache?: boolean
}

/**
 * Response containing batch embeddings
 */
export interface BatchEmbeddingResponse {
  /** Vector embeddings (same order as input texts) */
  embeddings: number[][]
  /** Model used for embedding */
  model: string
  /** Token usage for billing (only counts non-cached) */
  usage: {
    tokens: number
  }
  /** Per-text cache status (same order as input texts) */
  cached: boolean[]
}

/**
 * Similarity computation result
 */
export interface SimilarityResult {
  /** Cosine similarity score (0-1, higher = more similar) */
  score: number
  /** Euclidean distance (optional) */
  distance?: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number
  /** Number of cache misses */
  misses: number
  /** Hit rate (hits / total) */
  hitRate: number
  /** Total cached embeddings */
  size: number
}

/**
 * Result of clearing cache
 */
export interface ClearCacheResult {
  /** Number of entries cleared */
  cleared: number
}

// =============================================================================
// Client Interface
// =============================================================================

/**
 * Embeddings client with caching support
 */
export interface EmbeddingsClient {
  /**
   * Generate embedding for a single text
   *
   * Results are automatically cached. Subsequent calls with the same text
   * will return cached results with `cached: true` and `usage.tokens: 0`.
   *
   * @example
   * ```typescript
   * // Simple usage
   * const result = await embeddings.embed('Hello, world!')
   *
   * // With options
   * const result = await embeddings.embed({
   *   text: 'Hello, world!',
   *   model: 'text-embedding-3-large',
   *   dimensions: 3072
   * })
   * ```
   */
  embed(text: string | EmbeddingRequest): Promise<EmbeddingResponse>

  /**
   * Generate embeddings for multiple texts
   *
   * Automatically deduplicates identical texts and caches results.
   * The response maintains the original order of texts.
   *
   * @example
   * ```typescript
   * // Simple usage
   * const result = await embeddings.embedBatch(['Hello', 'World', 'Hello'])
   * // 'Hello' only embedded once, cached for second occurrence
   *
   * // With options
   * const result = await embeddings.embedBatch({
   *   texts: ['Hello', 'World'],
   *   model: 'text-embedding-3-large'
   * })
   * ```
   */
  embedBatch(texts: string[] | BatchEmbeddingRequest): Promise<BatchEmbeddingResponse>

  /**
   * Compute similarity between two texts or embeddings
   *
   * Accepts either text strings (will be embedded) or pre-computed embeddings.
   *
   * @example
   * ```typescript
   * // Between two texts
   * const result = await embeddings.similarity('Hello', 'Hi there')
   * console.log(result.score) // 0.85
   *
   * // Between pre-computed embeddings
   * const result = await embeddings.similarity([0.1, 0.2], [0.2, 0.3])
   * ```
   */
  similarity(a: string | number[], b: string | number[]): Promise<SimilarityResult>

  /**
   * Get cached embedding only (no API call if not cached)
   *
   * Returns the cached embedding if available, or null if not cached.
   * Useful for checking cache without triggering an API call.
   *
   * @example
   * ```typescript
   * const cached = await embeddings.cached('Hello, world!')
   * if (cached) {
   *   console.log('Found in cache:', cached.embedding)
   * } else {
   *   console.log('Not cached, need to embed')
   * }
   * ```
   */
  cached(text: string): Promise<EmbeddingResponse | null>

  /**
   * Get cache statistics
   *
   * Returns information about cache hits, misses, and hit rate.
   *
   * @example
   * ```typescript
   * const stats = await embeddings.cacheStats()
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`)
   * console.log(`Cached embeddings: ${stats.size}`)
   * ```
   */
  cacheStats(): Promise<CacheStats>

  /**
   * Clear the embedding cache
   *
   * Optionally accepts a pattern to clear only matching entries.
   *
   * @example
   * ```typescript
   * // Clear all
   * const result = await embeddings.clearCache()
   * console.log(`Cleared ${result.cleared} entries`)
   *
   * // Clear by pattern
   * const result = await embeddings.clearCache('prefix:*')
   * ```
   */
  clearCache(pattern?: string): Promise<ClearCacheResult>

  /**
   * List available embedding models
   *
   * @example
   * ```typescript
   * const models = await embeddings.models()
   * // ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002']
   * ```
   */
  models(): Promise<string[]>
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a configured embeddings client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { Embeddings } from 'embeddings.do'
 *
 * // With custom API key
 * const embeddings = Embeddings({ apiKey: 'xxx' })
 *
 * // With custom base URL
 * const embeddings = Embeddings({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Embeddings(options?: ClientOptions): EmbeddingsClient {
  return createClient<EmbeddingsClient>('https://embeddings.do', options)
}

// =============================================================================
// Default Instance
// =============================================================================

/**
 * Default embeddings client instance (camelCase)
 *
 * For Workers environment, import 'rpc.do/env' first to enable
 * automatic environment variable resolution.
 *
 * @example
 * ```typescript
 * // Direct usage (API key from environment)
 * import { embeddings } from 'embeddings.do'
 * const result = await embeddings.embed('Hello, world!')
 *
 * // In Cloudflare Workers
 * import 'rpc.do/env'
 * import { embeddings } from 'embeddings.do'
 * ```
 */
export const embeddings: EmbeddingsClient = Embeddings()

// =============================================================================
// Exports
// =============================================================================

// Named exports
export { Embeddings, embeddings }

// Default export = camelCase instance
export default embeddings

// Re-export types from rpc.do
export type { ClientOptions } from 'rpc.do'
