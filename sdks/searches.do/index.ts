/**
 * searches.do - What do you want searches to .do for you?
 *
 * AI-powered search across all your data with semantic understanding.
 *
 * @see https://searches.do
 *
 * @example
 * ```typescript
 * import searches from 'searches.do'
 *
 * // Tagged template - describe what you want to find
 * const results = await searches.do`
 *   Find all support tickets about billing issues
 *   from enterprise customers in the last 30 days
 * `
 *
 * // Direct search
 * const docs = await searches.search('knowledge-base', 'how do I reset my password')
 *
 * // Get suggestions for autocomplete
 * const suggestions = await searches.suggest('products', 'wire')
 * // ['wireless headphones', 'wireless speaker', 'wire cutters']
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface SearchQuery {
  /** Search query string */
  query: string
  /** Index to search */
  index?: string
  /** Maximum results to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Filter criteria */
  filters?: Filter[]
  /** Facets to compute */
  facets?: string[]
  /** Sort order */
  sort?: SortOption[]
  /** Whether to include semantic search */
  semantic?: boolean
  /** Whether to highlight matches */
  highlight?: boolean
  /** Minimum relevance score (0-1) */
  minScore?: number
}

export interface SearchResult {
  /** Document ID */
  id: string
  /** Document content */
  content: string
  /** Relevance score (0-1) */
  score: number
  /** Document metadata */
  metadata?: Record<string, unknown>
  /** Highlighted snippets */
  highlights?: string[]
  /** Vector embedding (if requested) */
  embedding?: number[]
}

export interface SearchResponse {
  /** Search results */
  results: SearchResult[]
  /** Total matching documents */
  total: number
  /** Computed facets */
  facets?: FacetResult[]
  /** Query time in ms */
  took: number
  /** Suggestions for query refinement */
  suggestions?: string[]
}

export interface Filter {
  /** Field to filter on */
  field: string
  /** Filter operator */
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'exists' | 'range'
  /** Filter value */
  value: unknown
}

export interface Facet {
  /** Field to compute facet for */
  field: string
  /** Maximum number of values */
  limit?: number
  /** Minimum count to include */
  minCount?: number
}

export interface FacetResult {
  /** Facet field */
  field: string
  /** Facet values with counts */
  values: Array<{ value: string; count: number }>
}

export interface SortOption {
  /** Field to sort by */
  field: string
  /** Sort direction */
  order: 'asc' | 'desc'
}

export interface Suggestion {
  /** Suggested text */
  text: string
  /** Relevance score */
  score: number
  /** Number of documents matching */
  count?: number
}

export interface Index {
  /** Index name */
  name: string
  /** Number of documents */
  documentCount: number
  /** Vector dimensions (if semantic search enabled) */
  dimensions?: number
  /** Index configuration */
  config: IndexConfig
  /** Index statistics */
  stats: IndexStats
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
}

export interface IndexConfig {
  /** Whether semantic search is enabled */
  semantic?: boolean
  /** Embedding model to use */
  embeddingModel?: string
  /** Fields to index */
  fields?: FieldConfig[]
  /** Default search fields */
  searchableFields?: string[]
  /** Fields to return by default */
  displayFields?: string[]
  /** Synonyms configuration */
  synonyms?: Record<string, string[]>
  /** Stop words to ignore */
  stopWords?: string[]
}

export interface FieldConfig {
  /** Field name */
  name: string
  /** Field type */
  type: 'text' | 'keyword' | 'number' | 'date' | 'boolean' | 'geo' | 'vector'
  /** Whether field is searchable */
  searchable?: boolean
  /** Whether field is filterable */
  filterable?: boolean
  /** Whether field is sortable */
  sortable?: boolean
  /** Whether field is facetable */
  facetable?: boolean
  /** Boost factor for relevance */
  boost?: number
}

export interface IndexStats {
  /** Total documents */
  documents: number
  /** Storage size in bytes */
  sizeBytes: number
  /** Average document size */
  avgDocSize: number
  /** Number of unique terms */
  uniqueTerms: number
  /** Last indexed timestamp */
  lastIndexed?: Date
}

export interface Document {
  /** Document ID */
  id: string
  /** Document content (main searchable text) */
  content?: string
  /** Document title */
  title?: string
  /** Additional fields */
  [key: string]: unknown
}

export interface IndexResult {
  /** Number of documents indexed */
  indexed: number
  /** Number of documents failed */
  failed: number
  /** Error details for failed documents */
  errors?: Array<{ id: string; error: string }>
}

export interface DoOptions {
  /** Additional context for the search */
  context?: Record<string, unknown>
  /** Target index (if not specified in query) */
  index?: string
  /** Maximum results */
  limit?: number
  /** Filters to apply */
  filters?: Filter[]
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Client interface
export interface SearchesClient {
  /**
   * Search using natural language
   *
   * @example
   * ```typescript
   * const results = await searches.do`
   *   Find support tickets about billing
   *   from enterprise customers this month
   * `
   * ```
   */
  do: TaggedTemplate<Promise<SearchResponse>>

  /**
   * Search an index
   *
   * @example
   * ```typescript
   * const results = await searches.search('products', 'wireless headphones', {
   *   limit: 10,
   *   filters: [{ field: 'inStock', op: 'eq', value: true }]
   * })
   * ```
   */
  search(index: string, query: string, options?: {
    limit?: number
    offset?: number
    filters?: Filter[]
    facets?: string[]
    sort?: SortOption[]
    semantic?: boolean
    highlight?: boolean
    minScore?: number
  }): Promise<SearchResponse>

  /**
   * Index documents
   *
   * @example
   * ```typescript
   * await searches.index('products', [
   *   { id: 'p1', content: 'Wireless headphones', price: 99 },
   *   { id: 'p2', content: 'Bluetooth speaker', price: 49 }
   * ])
   * ```
   */
  index(indexName: string, documents: Document[]): Promise<IndexResult>

  /**
   * Get autocomplete suggestions
   *
   * @example
   * ```typescript
   * const suggestions = await searches.suggest('products', 'wire')
   * // ['wireless headphones', 'wireless speaker', 'wire cutters']
   * ```
   */
  suggest(index: string, prefix: string, options?: {
    limit?: number
    fuzzy?: boolean
    fields?: string[]
  }): Promise<Suggestion[]>

  /**
   * Get facet values for filtering
   *
   * @example
   * ```typescript
   * const facets = await searches.facets('products', ['category', 'brand'])
   * // { category: [{ value: 'electronics', count: 150 }], ... }
   * ```
   */
  facets(index: string, fields: string[], options?: {
    query?: string
    filters?: Filter[]
    limit?: number
  }): Promise<Record<string, FacetResult>>

  /**
   * Get available filter values
   *
   * @example
   * ```typescript
   * const filters = await searches.filters('products')
   * // { category: ['electronics', 'home'], brand: ['Sony', 'Apple'] }
   * ```
   */
  filters(index: string, options?: {
    fields?: string[]
    limit?: number
  }): Promise<Record<string, string[]>>

  /**
   * Configure an index
   *
   * @example
   * ```typescript
   * await searches.configure('products', {
   *   semantic: true,
   *   fields: [
   *     { name: 'title', type: 'text', searchable: true, boost: 2 },
   *     { name: 'description', type: 'text', searchable: true },
   *     { name: 'price', type: 'number', filterable: true, sortable: true }
   *   ]
   * })
   * ```
   */
  configure(index: string, config: IndexConfig): Promise<Index>

  /**
   * Reindex all documents
   *
   * @example
   * ```typescript
   * await searches.reindex('products')
   * ```
   */
  reindex(index: string): Promise<{ status: 'started' | 'completed'; documentsProcessed?: number }>

  // Index management

  /**
   * Create a new index
   */
  createIndex(name: string, config?: IndexConfig): Promise<Index>

  /**
   * Get index details
   */
  getIndex(name: string): Promise<Index>

  /**
   * List all indexes
   */
  listIndexes(): Promise<Index[]>

  /**
   * Delete an index
   */
  deleteIndex(name: string): Promise<void>

  // Document operations

  /**
   * Get a document by ID
   */
  get(index: string, id: string): Promise<Document | null>

  /**
   * Delete documents
   */
  delete(index: string, ids: string[]): Promise<{ deleted: number }>

  /**
   * Update a document
   */
  update(index: string, id: string, updates: Partial<Document>): Promise<Document>

  // Vector operations

  /**
   * Generate embedding for text
   */
  embed(text: string): Promise<number[]>

  /**
   * Generate embeddings for multiple texts
   */
  embedBatch(texts: string[]): Promise<number[][]>

  /**
   * Search by vector
   */
  searchVector(index: string, vector: number[], options?: {
    limit?: number
    filters?: Filter[]
    minScore?: number
  }): Promise<SearchResult[]>

  // Analytics

  /**
   * Get search analytics
   */
  analytics(index: string, options?: {
    startDate?: Date
    endDate?: Date
  }): Promise<{
    totalSearches: number
    avgResultsReturned: number
    avgLatencyMs: number
    topQueries: Array<{ query: string; count: number }>
    zeroResultQueries: Array<{ query: string; count: number }>
  }>
}

/**
 * Create a configured searches client
 */
export function Searches(options?: ClientOptions): SearchesClient {
  return createClient<SearchesClient>('https://searches.do', options)
}

/**
 * Default searches client
 */
export const searches: SearchesClient = Searches({
  apiKey: typeof process !== 'undefined' ? (process.env?.SEARCHES_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default searches

export type { ClientOptions } from 'rpc.do'
