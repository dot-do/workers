/**
 * database.as - What do you want your database to be?
 *
 * Define database schemas with semantic types, relationships,
 * and natural language understanding.
 *
 * @see https://database.as
 *
 * @example
 * ```typescript
 * import { database } from 'database.as'
 *
 * // Define with tagged template
 * const crm = await database.as`
 *   A CRM database with Leads, Companies, and Deals.
 *   Leads belong to Companies and can have multiple Deals.
 *   Track lead score, company size, and deal value.
 * `
 *
 * // Or use the schema builder
 * const blog = database.schema({
 *   Post: {
 *     title: 'string',
 *     content: 'markdown',
 *     author: 'Author.posts',
 *     tags: ['Tag.posts'],
 *   },
 *   Author: {
 *     name: 'string',
 *     email: 'string',
 *   },
 *   Tag: {
 *     name: 'string',
 *   }
 * })
 *
 * // Define with semantic Nouns
 * const ecommerce = database.define({
 *   Product: {
 *     singular: 'product',
 *     plural: 'products',
 *     properties: {
 *       name: { type: 'string', description: 'Product name' },
 *       price: { type: 'number', description: 'Price in cents' },
 *     },
 *     relationships: {
 *       category: { type: 'Category', backref: 'products' },
 *     },
 *     actions: ['create', 'update', 'delete', 'publish'],
 *   }
 * })
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Re-export core types from ai-database
export type {
  DatabaseSchema,
  EntitySchema,
  FieldDefinition,
  PrimitiveType,
  Noun,
  NounProperty,
  NounRelationship,
  Verb,
  TypeMeta,
} from 'ai-database'

// Types
export interface SchemaDefinition {
  id: string
  name: string
  description?: string
  /** Simple schema format */
  schema?: Record<string, Record<string, string>>
  /** Semantic Noun definitions */
  nouns?: Record<string, NounDefinition>
  /** Connection string or provider */
  provider?: string
  createdAt: Date
  updatedAt: Date
}

export interface NounDefinition {
  singular: string
  plural: string
  description?: string
  properties?: Record<string, {
    type: string
    description?: string
    optional?: boolean
    default?: unknown
  }>
  relationships?: Record<string, {
    type: string
    backref?: string
    description?: string
  }>
  actions?: string[]
  events?: string[]
}

// Schema builder for fluent API
export interface SchemaBuilder {
  /** Schema definition */
  definition: SchemaDefinition

  /** Add an entity type */
  entity(name: string, fields: Record<string, string>): SchemaBuilder

  /** Add a noun with semantic definition */
  noun(name: string, definition: NounDefinition): SchemaBuilder

  /** Add a relationship */
  relate(from: string, to: string, options?: { backref?: string; type?: string }): SchemaBuilder

  /** Set provider/connection */
  provider(connectionString: string): SchemaBuilder

  /** Add authorization rules */
  authorize(rules: Record<string, string[]>): SchemaBuilder

  /** Deploy the schema */
  deploy(): Promise<SchemaDefinition>

  /** Validate the schema */
  validate(): Promise<{ valid: boolean; errors?: string[] }>

  /** Generate TypeScript types */
  types(): Promise<string>

  /** Generate migration SQL */
  migration(): Promise<string>
}

// Client interface
export interface DatabaseAsClient {
  /**
   * Create a database schema from natural language
   *
   * @example
   * ```typescript
   * const schema = await database.as`
   *   An e-commerce database with Products, Categories,
   *   Orders, and Customers. Orders have line items.
   * `
   * ```
   */
  as: TaggedTemplate<Promise<SchemaDefinition>>

  /**
   * Create schema from object definition
   *
   * @example
   * ```typescript
   * const schema = database.schema({
   *   User: { name: 'string', email: 'string' },
   *   Post: { title: 'string', author: 'User.posts' }
   * })
   * ```
   */
  schema(definition: Record<string, Record<string, string>>): SchemaBuilder

  /**
   * Create schema from semantic Noun definitions
   *
   * @example
   * ```typescript
   * const schema = database.define({
   *   User: {
   *     singular: 'user',
   *     plural: 'users',
   *     properties: { name: { type: 'string' } }
   *   }
   * })
   * ```
   */
  define(nouns: Record<string, NounDefinition>): SchemaBuilder

  /**
   * Get a schema by ID or name
   */
  get(nameOrId: string): Promise<SchemaDefinition>

  /**
   * List all schemas
   */
  list(): Promise<SchemaDefinition[]>

  /**
   * Update a schema
   */
  update(nameOrId: string, updates: Partial<SchemaDefinition>): Promise<SchemaDefinition>

  /**
   * Delete a schema
   */
  delete(nameOrId: string): Promise<void>

  /**
   * Clone a schema
   */
  clone(nameOrId: string, newName: string): Promise<SchemaDefinition>

  /**
   * Import schema from various sources
   */
  import: {
    /** Import from Prisma schema */
    prisma(schema: string): Promise<SchemaBuilder>
    /** Import from Drizzle schema */
    drizzle(schema: string): Promise<SchemaBuilder>
    /** Import from SQL */
    sql(ddl: string): Promise<SchemaBuilder>
    /** Import from JSON Schema */
    jsonSchema(schema: object): Promise<SchemaBuilder>
    /** Import from OpenAPI */
    openapi(spec: object): Promise<SchemaBuilder>
  }

  /**
   * Export schema to various formats
   */
  export: {
    /** Export to Prisma schema */
    prisma(nameOrId: string): Promise<string>
    /** Export to Drizzle schema */
    drizzle(nameOrId: string): Promise<string>
    /** Export to SQL DDL */
    sql(nameOrId: string, dialect?: 'postgres' | 'mysql' | 'sqlite'): Promise<string>
    /** Export to TypeScript types */
    typescript(nameOrId: string): Promise<string>
    /** Export to JSON Schema */
    jsonSchema(nameOrId: string): Promise<object>
  }

  /**
   * Generate schema from existing data
   */
  infer(data: unknown[] | string): Promise<SchemaBuilder>

  /**
   * Pre-built schema templates
   */
  templates: {
    /** CRM schema */
    crm(): SchemaBuilder
    /** Blog/CMS schema */
    blog(): SchemaBuilder
    /** E-commerce schema */
    ecommerce(): SchemaBuilder
    /** SaaS multi-tenant schema */
    saas(): SchemaBuilder
    /** Project management schema */
    project(): SchemaBuilder
  }
}

/**
 * Create a configured database.as client
 */
export function DatabaseAs(options?: ClientOptions): DatabaseAsClient {
  return createClient<DatabaseAsClient>('https://database.as', options)
}

/**
 * Default database.as client
 */
export const database: DatabaseAsClient = DatabaseAs()

export default database

// Re-export schema definition helpers from ai-database
export { defineNoun, defineVerb, nounToSchema, Verbs } from 'ai-database'

export type { ClientOptions } from 'rpc.do'
