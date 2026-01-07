/**
 * searches.do - Vector Search and RAG SDK
 *
 * @example
 * ```typescript
 * import { searches } from 'searches.do'
 *
 * // Index documents
 * await searches.index('my-index', [
 *   { id: 'doc1', content: 'Hello world', metadata: { type: 'greeting' } }
 * ])
 *
 * // Semantic search
 * const results = await searches.search('my-index', 'hello', { limit: 10 })
 * ```
 */

import { createClient, type ClientOptions } from '@dotdo/rpc-client'

// Types
export interface Document {
  id: string
  content: string
  metadata?: Record<string, unknown>
  embedding?: number[]
}

export interface SearchResult {
  id: string
  content: string
  metadata?: Record<string, unknown>
  score: number
}

export interface Index {
  name: string
  documentCount: number
  dimensions: number
  createdAt: Date
}

// Client interface
export interface SearchesClient {
  // Index management
  createIndex(name: string, options?: { dimensions?: number }): Promise<Index>
  deleteIndex(name: string): Promise<void>
  listIndexes(): Promise<Index[]>
  getIndex(name: string): Promise<Index>

  // Document operations
  index(indexName: string, documents: Document[]): Promise<{ indexed: number }>
  delete(indexName: string, ids: string[]): Promise<{ deleted: number }>
  get(indexName: string, id: string): Promise<Document | null>

  // Search
  search(indexName: string, query: string, options?: { limit?: number; filter?: Record<string, unknown> }): Promise<SearchResult[]>
  searchVector(indexName: string, vector: number[], options?: { limit?: number; filter?: Record<string, unknown> }): Promise<SearchResult[]>

  // RAG helpers
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

export function Searches(options?: ClientOptions): SearchesClient {
  return createClient<SearchesClient>('https://searches.do', options)
}

export const searches: SearchesClient = Searches({
  apiKey: typeof process !== 'undefined' ? process.env?.SEARCHES_API_KEY : undefined,
})

export type { ClientOptions } from '@dotdo/rpc-client'
