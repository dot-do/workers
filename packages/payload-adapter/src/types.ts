import type { CollectionConfig, FieldBase } from 'payload'

/**
 * Configuration options for the Payload adapter
 */
export interface PayloadAdapterConfig {
  /**
   * Database backend type
   */
  type: 'sqlite' | 'd1' | 'durable' | 'rpc'

  /**
   * SQLite-specific configuration
   */
  sqlite?: {
    url?: string
    syncUrl?: string
    authToken?: string
  }

  /**
   * D1-specific configuration
   */
  d1?: {
    binding: any // D1Database
  }

  /**
   * Durable Objects configuration (Cloudflare-native SQLite)
   */
  durable?: {
    binding: any // DurableObjectNamespace
    namespace?: string // Default: 'default'
  }

  /**
   * RPC-specific configuration (connects to db worker)
   */
  rpc?: {
    dbWorker: any // WorkerEntrypoint
    namespace?: string // Default: 'payload'
  }

  /**
   * MDX collection directories to scan
   */
  collectionDirs?: string[]

  /**
   * Enable vector embeddings support
   */
  enableVectors?: boolean

  /**
   * Vector dimensions for embeddings
   */
  vectorDimensions?: number
}

/**
 * MDX collection frontmatter schema
 */
export interface MDXCollectionFrontmatter {
  name: string
  slug: string
  access?: {
    read?: boolean | string
    create?: boolean | string
    update?: boolean | string
    delete?: boolean | string
  }
  fields: MDXField[]
  admin?: {
    useAsTitle?: string
    defaultColumns?: string[]
    group?: string
    description?: string
  }
  hooks?: {
    beforeChange?: string[]
    afterChange?: string[]
    beforeRead?: string[]
    afterRead?: string[]
    beforeDelete?: string[]
    afterDelete?: string[]
  }
  timestamps?: boolean
}

/**
 * MDX field definition
 */
export interface MDXField {
  name: string
  type: string
  label?: string
  required?: boolean
  unique?: boolean
  defaultValue?: any
  admin?: {
    position?: 'sidebar' | 'main'
    description?: string
    placeholder?: string
    condition?: string
  }
  // For relationship fields
  relationTo?: string | string[]
  hasMany?: boolean
  // For array fields
  fields?: MDXField[]
  minRows?: number
  maxRows?: number
  // For select/radio fields
  options?: Array<string | { label: string; value: string }>
  // For text fields
  minLength?: number
  maxLength?: number
  // For number fields
  min?: number
  max?: number
  // For blocks/richText
  blocks?: any[]
  // Validation
  validate?: string
}

/**
 * Parsed collection result
 */
export interface ParsedCollection {
  config: CollectionConfig
  mdxSource: string
  filePath: string
}

/**
 * RPC database interface
 * Matches the db worker's RPC methods
 */
export interface DbWorkerRPC {
  // Things CRUD
  createThing(params: {
    ns: string
    id: string
    type: string
    content: string
    data: any
    visibility?: 'public' | 'private' | 'unlisted'
  }): Promise<any>

  updateThing(params: {
    ns: string
    id: string
    data?: any
    content?: string
    visibility?: 'public' | 'private' | 'unlisted'
  }): Promise<any>

  deleteThing(params: { ns: string; id: string }): Promise<boolean>

  getThing(params: { ns: string; id: string }): Promise<any>

  queryThings(params: {
    ns?: string
    type?: string
    limit?: number
    offset?: number
    orderBy?: string
    orderDir?: 'asc' | 'desc'
    where?: any
  }): Promise<{
    items: any[]
    total: number
    hasMore: boolean
  }>

  // Search
  searchThings(params: {
    query: string
    ns?: string
    type?: string
    limit?: number
    useVector?: boolean
    useFts?: boolean
  }): Promise<any[]>
}
