/**
 * Core Graph Database Types
 *
 * Generic API for Things & Relationships
 * Used by all import scripts and graph operations
 */

/**
 * Thing - A node in the graph
 *
 * Represents any entity: occupations, skills, pages, etc.
 */
export interface Thing {
  /** Namespace (e.g., "onet.org", "en.wikipedia.org") */
  ns: string

  /** Unique identifier within namespace (e.g., "15-1252.00", "TypeScript") */
  id: string

  /** Entity type (e.g., "occupation", "skill", "page") */
  type: string

  /** Flexible structured data (JSON) */
  data?: Record<string, unknown>

  /** Extracted code/ESM (for code entities) */
  code?: string

  /** Main content (markdown, text, description) */
  content?: string

  /** Metadata (timestamps, hash, language, etc.) */
  meta?: ThingMeta
}

/**
 * Thing metadata
 */
export interface ThingMeta {
  /** SHA-256 hash for deduplication */
  hash?: string

  /** Language code (e.g., "en", "es") */
  language?: string

  /** Content length in bytes */
  length?: number

  /** Created timestamp (unix ms) */
  createdAt?: number

  /** Updated timestamp (unix ms) */
  updatedAt?: number

  /** Version counter for optimistic locking */
  version?: number

  /** Additional custom metadata */
  [key: string]: unknown
}

/**
 * Relationship - An edge in the graph
 *
 * Connects two Things with a typed relationship
 * Sorted by (toNs, toId) for efficient inbound lookups
 */
export interface Relationship {
  /** Source namespace */
  fromNs: string

  /** Source identifier */
  fromId: string

  /** Source type (optional, for context) */
  fromType?: string

  /** Relationship type/predicate (e.g., "requires_skill", "part_of") */
  predicate: string

  /** Reverse predicate name (e.g., "required_by", "contains") */
  reverse?: string

  /** Target namespace */
  toNs: string

  /** Target identifier */
  toId: string

  /** Relationship metadata (strength, weight, etc.) */
  data?: Record<string, unknown>

  /** Relationship description/content (optional) */
  content?: string

  /** Relationship metadata */
  meta?: RelationshipMeta
}

/**
 * Relationship metadata
 */
export interface RelationshipMeta {
  /** Relationship strength/weight (0-1 or custom scale) */
  strength?: number

  /** Created timestamp (unix ms) */
  createdAt?: number

  /** Valid from timestamp (unix ms) */
  validFrom?: number

  /** Valid to timestamp (unix ms, null = forever) */
  validTo?: number | null

  /** Additional custom metadata */
  [key: string]: unknown
}

/**
 * Query filter for Things
 */
export interface ThingFilter {
  ns?: string
  id?: string
  type?: string
  /** Match against data properties (JSON path queries) */
  data?: Record<string, unknown>
  /** Match against content (full-text search) */
  contentLike?: string
}

/**
 * Query filter for Relationships
 */
export interface RelationshipFilter {
  fromNs?: string
  fromId?: string
  fromType?: string
  predicate?: string
  toNs?: string
  toId?: string
  /** Minimum strength threshold */
  minStrength?: number
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
  cursor?: string
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Query result with pagination
 */
export interface QueryResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  cursor?: string
}

/**
 * Bulk operation result
 */
export interface BulkResult {
  success: number
  failed: number
  errors?: Array<{ item: unknown; error: string }>
}

/**
 * Thing with relationships (graph view)
 */
export interface ThingWithRelationships extends Thing {
  /** Outbound relationships (from this thing) */
  outbound?: Relationship[]

  /** Inbound relationships (to this thing) */
  inbound?: Relationship[]
}

/**
 * Graph traversal options
 */
export interface TraversalOptions {
  /** Maximum depth to traverse */
  maxDepth?: number

  /** Filter relationships by predicate */
  predicates?: string[]

  /** Direction to traverse */
  direction?: 'outbound' | 'inbound' | 'both'

  /** Include relationship metadata */
  includeRelationships?: boolean
}

/**
 * Graph traversal result
 */
export interface TraversalResult {
  /** Root thing */
  root: Thing

  /** Related things at each depth level */
  related: Map<number, Thing[]>

  /** All relationships in the traversal */
  relationships: Relationship[]
}
