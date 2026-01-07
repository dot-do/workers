/**
 * nouns.do - Name your world. Let AI understand it.
 *
 * Define business entities and their relationships that AI can
 * understand and operate on.
 *
 * @see https://nouns.do
 *
 * @example
 * ```typescript
 * import nouns from 'nouns.do'
 *
 * // Tagged template - describe your domain
 * const schema = await nouns.do`
 *   A Customer has many Orders.
 *   An Order belongs to a Customer and has many LineItems.
 *   A LineItem references a Product.
 *   A Product has a name, price, and inventory count.
 * `
 *
 * // Programmatic definition
 * const Customer = nouns.define('Customer', {
 *   fields: {
 *     name: { type: 'string', required: true },
 *     email: { type: 'string', unique: true },
 *     tier: { type: 'enum', values: ['free', 'pro', 'enterprise'] }
 *   },
 *   relationships: {
 *     orders: { type: 'hasMany', target: 'Order' }
 *   }
 * })
 *
 * // Create and query instances
 * const customer = await nouns.instances('Customer').create({
 *   name: 'Alice',
 *   email: 'alice@example.com'
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'enum'
  | 'reference'

export interface Field {
  name: string
  type: FieldType
  required?: boolean
  unique?: boolean
  default?: unknown
  values?: string[] // For enum type
  target?: string // For reference type
  description?: string
}

export type RelationshipType =
  | 'hasOne'
  | 'hasMany'
  | 'belongsTo'
  | 'manyToMany'

export interface Relationship {
  name: string
  type: RelationshipType
  target: string
  through?: string // For manyToMany
  foreignKey?: string
  inverse?: string
  description?: string
}

export interface Noun {
  id: string
  name: string
  pluralName?: string
  description?: string
  fields: Field[]
  relationships: Relationship[]
  indexes?: Array<{ fields: string[]; unique?: boolean }>
  createdAt: Date
  updatedAt: Date
}

export interface Schema {
  id: string
  name: string
  description?: string
  nouns: Noun[]
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface Instance {
  id: string
  nounId: string
  nounName: string
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ValidationResult {
  valid: boolean
  errors: Array<{
    field: string
    message: string
    value?: unknown
  }>
}

export interface MigrationPlan {
  id: string
  fromVersion: number
  toVersion: number
  operations: MigrationOperation[]
  status: 'pending' | 'applied' | 'failed'
  createdAt: Date
  appliedAt?: Date
}

export interface MigrationOperation {
  type: 'addField' | 'removeField' | 'modifyField' | 'addNoun' | 'removeNoun' | 'addRelationship' | 'removeRelationship'
  noun: string
  field?: string
  details?: Record<string, unknown>
}

export interface DoOptions {
  context?: Record<string, unknown>
  schemaId?: string
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

// Field definition helpers
export interface FieldDefinition {
  type: FieldType
  required?: boolean
  unique?: boolean
  default?: unknown
  values?: string[]
  target?: string
  description?: string
}

export interface RelationshipDefinition {
  type: RelationshipType
  target: string
  through?: string
  foreignKey?: string
  inverse?: string
  description?: string
}

export interface NounDefinition {
  fields: Record<string, FieldDefinition>
  relationships?: Record<string, RelationshipDefinition>
  indexes?: Array<{ fields: string[]; unique?: boolean }>
  description?: string
}

// Instance operations interface
export interface InstanceOperations {
  create(data: Record<string, unknown>): Promise<Instance>
  get(id: string): Promise<Instance>
  list(options?: {
    filter?: Record<string, unknown>
    limit?: number
    offset?: number
    orderBy?: string
    order?: 'asc' | 'desc'
  }): Promise<Instance[]>
  update(id: string, data: Record<string, unknown>): Promise<Instance>
  delete(id: string): Promise<void>
  count(filter?: Record<string, unknown>): Promise<number>
}

// Client interface
export interface NounsClient {
  /**
   * Define a schema from natural language
   *
   * @example
   * ```typescript
   * const schema = await nouns.do`
   *   A Customer has a name, email, and tier.
   *   An Order belongs to a Customer and has a total and status.
   *   A Product has a name, price, and inventory count.
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Schema>>

  /**
   * Define a noun programmatically
   *
   * @example
   * ```typescript
   * const Customer = await nouns.define('Customer', {
   *   fields: {
   *     name: { type: 'string', required: true },
   *     email: { type: 'string', unique: true },
   *     tier: { type: 'enum', values: ['free', 'pro', 'enterprise'] }
   *   },
   *   relationships: {
   *     orders: { type: 'hasMany', target: 'Order' }
   *   }
   * })
   * ```
   */
  define(name: string, definition: NounDefinition): Promise<Noun>

  /**
   * Get a noun definition
   */
  get(name: string): Promise<Noun>

  /**
   * List all nouns
   */
  list(): Promise<Noun[]>

  /**
   * Update a noun definition
   */
  update(name: string, updates: Partial<NounDefinition>): Promise<Noun>

  /**
   * Delete a noun
   */
  delete(name: string): Promise<void>

  /**
   * Get instance operations for a noun
   *
   * @example
   * ```typescript
   * const customers = nouns.instances('Customer')
   * const alice = await customers.create({ name: 'Alice', email: 'alice@example.com' })
   * const allCustomers = await customers.list({ filter: { tier: 'pro' } })
   * ```
   */
  instances(nounName: string): InstanceOperations

  /**
   * Get relationships for a noun
   */
  relationships(nounName: string): Promise<Relationship[]>

  /**
   * Add a relationship between nouns
   */
  relate(
    sourceName: string,
    relationshipName: string,
    definition: RelationshipDefinition
  ): Promise<Relationship>

  /**
   * Validate data against a noun schema
   */
  validate(nounName: string, data: Record<string, unknown>): Promise<ValidationResult>

  /**
   * Create a migration plan between schema versions
   */
  migrate(options: {
    from?: number
    to?: number
    preview?: boolean
  }): Promise<MigrationPlan>

  /**
   * Apply a pending migration
   */
  applyMigration(migrationId: string): Promise<MigrationPlan>

  /**
   * Get the current schema
   */
  schema(): Promise<Schema>

  /**
   * Export the schema to different formats
   */
  export(format: 'json' | 'typescript' | 'graphql' | 'sql'): Promise<string>

  /**
   * Import a schema from various formats
   */
  import(schema: string, format: 'json' | 'typescript' | 'graphql' | 'sql'): Promise<Schema>
}

/**
 * Create a configured Nouns client
 *
 * @example
 * ```typescript
 * import { Nouns } from 'nouns.do'
 * const nouns = Nouns({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Nouns(options?: ClientOptions): NounsClient {
  return createClient<NounsClient>('nouns', options)
}

/**
 * Default Nouns client instance
 *
 * For Workers environment, import 'rpc.do/env' first to configure API keys
 * from environment variables automatically.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { nouns } from 'nouns.do'
 *
 * await nouns.define('Customer', { fields: { name: { type: 'string' } } })
 * ```
 */
export const nouns: NounsClient = Nouns()

// Named exports
export { Nouns, nouns }

// Default export = camelCase instance
export default nouns

export type { ClientOptions } from 'rpc.do'
