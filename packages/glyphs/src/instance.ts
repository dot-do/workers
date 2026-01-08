/**
 * 回 (instance/$) - Object Instance Creation Glyph
 *
 * Stub file for RED phase TDD.
 * This file provides the minimal exports needed for tests to run and fail.
 * The actual implementation will be done in the GREEN phase.
 *
 * Visual metaphor: 回 looks like a nested box - a container within a container,
 * representing an instance (concrete value) wrapped by its type (abstract schema).
 */

// Placeholder types for documentation purposes

/**
 * A schema/type definition created with 口 (type glyph)
 */
export interface Schema<T = unknown> {
  readonly _type: T
  readonly _schema: Record<string, unknown>
  readonly validate?: (value: unknown) => boolean
}

/**
 * Options for instance creation
 */
export interface InstanceOptions {
  /** Whether to freeze the instance (default: true) */
  freeze?: boolean
  /** Whether to perform validation (default: true) */
  validate?: boolean
  /** Custom error handler for validation failures */
  onError?: (error: ValidationError) => void
}

/**
 * Validation error thrown when instance data doesn't match schema
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly expected?: string,
    public readonly received?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Instance metadata attached to created instances
 */
export interface InstanceMeta<T> {
  readonly __schema: Schema<T>
  readonly __createdAt: number
  readonly __id: string
}

/**
 * Type utility to infer the type from a schema
 */
export type Infer<S extends Schema> = S extends Schema<infer T> ? T : never

/**
 * The instance builder function type
 *
 * Usage:
 * - 回(Schema, data) - Create instance from schema and data
 * - 回`type ${data}` - Create instance via tagged template
 * - 回.from(Schema, data) - Explicit factory method
 * - 回.partial(Schema, data) - Create partial instance
 * - 回.clone(instance) - Clone an existing instance
 * - 回.update(instance, patch) - Create updated instance
 */
export interface InstanceBuilder {
  // Main signature: create instance from schema and data
  <T>(schema: Schema<T>, data: T, options?: InstanceOptions): T & InstanceMeta<T>

  // Tagged template signature
  (strings: TemplateStringsArray, ...values: unknown[]): unknown

  // Factory methods
  from<T>(schema: Schema<T>, data: T, options?: InstanceOptions): T & InstanceMeta<T>
  partial<T>(schema: Schema<T>, data: Partial<T>, options?: InstanceOptions): Partial<T> & InstanceMeta<T>
  clone<T>(instance: T & InstanceMeta<T>): T & InstanceMeta<T>
  update<T>(instance: T & InstanceMeta<T>, patch: Partial<T>): T & InstanceMeta<T>

  // Validation methods
  validate<T>(schema: Schema<T>, data: unknown): data is T
  isInstance<T>(value: unknown, schema?: Schema<T>): value is T & InstanceMeta<T>

  // Batch operations
  many<T>(schema: Schema<T>, items: T[], options?: InstanceOptions): Array<T & InstanceMeta<T>>

  // Schema access from instance
  schemaOf<T>(instance: T & InstanceMeta<T>): Schema<T>
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Create the instance builder for GREEN phase.
 */
function createInstanceBuilder(): InstanceBuilder {
  const builder = function<T>(
    schemaOrStrings: Schema<T> | TemplateStringsArray,
    dataOrValue?: T | unknown,
    options?: InstanceOptions
  ): (T & InstanceMeta<T>) | unknown {
    // Check if called as tagged template
    if (Array.isArray(schemaOrStrings) && 'raw' in schemaOrStrings) {
      const strings = schemaOrStrings as TemplateStringsArray
      const values = [dataOrValue, ...(options ? [options] : [])].filter(v => v !== undefined)
      const input = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')
      return { __input: input, __timestamp: Date.now() }
    }

    // Schema + data call
    const schema = schemaOrStrings as Schema<T>
    const data = dataOrValue as T
    const opts = options || {}

    const instance = {
      ...data,
      __schema: schema,
      __createdAt: Date.now(),
      __id: generateId(),
    } as T & InstanceMeta<T>

    if (opts.freeze !== false) {
      Object.freeze(instance)
    }

    return instance
  } as InstanceBuilder

  builder.from = <T>(schema: Schema<T>, data: T, options?: InstanceOptions): T & InstanceMeta<T> => {
    return builder(schema, data, options) as T & InstanceMeta<T>
  }

  builder.partial = <T>(schema: Schema<T>, data: Partial<T>, options?: InstanceOptions): Partial<T> & InstanceMeta<T> => {
    const instance = {
      ...data,
      __schema: schema,
      __createdAt: Date.now(),
      __id: generateId(),
    } as Partial<T> & InstanceMeta<T>

    if (options?.freeze !== false) {
      Object.freeze(instance)
    }

    return instance
  }

  builder.clone = <T>(instance: T & InstanceMeta<T>): T & InstanceMeta<T> => {
    const { __schema, __createdAt, __id, ...rest } = instance as Record<string, unknown>
    return {
      ...rest,
      __schema,
      __createdAt: Date.now(),
      __id: generateId(),
    } as T & InstanceMeta<T>
  }

  builder.update = <T>(instance: T & InstanceMeta<T>, patch: Partial<T>): T & InstanceMeta<T> => {
    const { __schema, ...rest } = instance as Record<string, unknown>
    return {
      ...rest,
      ...patch,
      __schema,
      __createdAt: Date.now(),
      __id: generateId(),
    } as T & InstanceMeta<T>
  }

  builder.validate = <T>(_schema: Schema<T>, data: unknown): data is T => {
    return data !== null && data !== undefined && typeof data === 'object'
  }

  builder.isInstance = <T>(value: unknown, _schema?: Schema<T>): value is T & InstanceMeta<T> => {
    if (value === null || value === undefined || typeof value !== 'object') return false
    const obj = value as Record<string, unknown>
    return '__schema' in obj && '__createdAt' in obj && '__id' in obj
  }

  builder.many = <T>(schema: Schema<T>, items: T[], options?: InstanceOptions): Array<T & InstanceMeta<T>> => {
    return items.map(item => builder(schema, item, options) as T & InstanceMeta<T>)
  }

  builder.schemaOf = <T>(instance: T & InstanceMeta<T>): Schema<T> => {
    return instance.__schema
  }

  return builder
}

export const 回: InstanceBuilder = createInstanceBuilder()
export const $: InstanceBuilder = 回
