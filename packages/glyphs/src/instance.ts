/**
 * 回 (instance/$) - Object Instance Creation Glyph
 *
 * Creates typed instances from schema definitions.
 *
 * Visual metaphor: 回 looks like a nested box - a container within a container,
 * representing an instance (concrete value) wrapped by its type (abstract schema).
 *
 * Features:
 * - Instance creation: 回(Schema, data)
 * - Tagged template creation: 回`type ${data}`
 * - Validation on creation
 * - Immutable (deep frozen) instances
 * - Clone and update operations
 * - ASCII alias: $
 */

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
 * Deep freeze an object and all nested objects/arrays
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // Skip freezing special objects like Date, Map, Set, etc.
  if (obj instanceof Date || obj instanceof Map || obj instanceof Set) {
    return obj
  }

  // Freeze arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        deepFreeze(item)
      }
    }
    Object.freeze(obj)
    return obj
  }

  // Freeze object properties
  const propNames = Object.getOwnPropertyNames(obj)
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name]
    if (typeof value === 'object' && value !== null) {
      deepFreeze(value)
    }
  }

  return Object.freeze(obj)
}

/**
 * Deep clone an object and all nested objects/arrays
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  // Handle Map
  if (obj instanceof Map) {
    return new Map(obj) as T
  }

  // Handle Set
  if (obj instanceof Set) {
    return new Set(obj) as T
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T
  }

  // Handle plain objects
  const cloned: Record<string, unknown> = {}
  for (const key of Object.keys(obj as object)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key])
  }
  return cloned as T
}

/**
 * Run validation on schema if validate function exists
 */
function runValidation<T>(
  schema: Schema<T>,
  data: T,
  options?: InstanceOptions
): void {
  if (options?.validate === false) {
    return
  }

  if (schema.validate) {
    try {
      const result = schema.validate(data)
      if (result === false) {
        const error = new ValidationError('Validation failed')
        if (options?.onError) {
          options.onError(error)
          return
        }
        throw error
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        if (options?.onError) {
          options.onError(e)
          return
        }
        throw e
      }
      // Re-throw other errors
      throw e
    }
  }
}

/**
 * Create an instance with non-enumerable metadata
 */
function createInstanceWithMeta<T>(
  data: T,
  schema: Schema<T>,
  options?: InstanceOptions
): T & InstanceMeta<T> {
  // Deep clone data to avoid mutations
  const clonedData = deepClone(data)

  // Create the instance object from cloned data
  const instance = { ...clonedData } as T & InstanceMeta<T>

  // Define non-enumerable metadata properties
  Object.defineProperty(instance, '__schema', {
    value: schema,
    enumerable: false,
    writable: false,
    configurable: false,
  })

  Object.defineProperty(instance, '__createdAt', {
    value: Date.now(),
    enumerable: false,
    writable: false,
    configurable: false,
  })

  Object.defineProperty(instance, '__id', {
    value: generateId(),
    enumerable: false,
    writable: false,
    configurable: false,
  })

  // Deep freeze if needed
  if (options?.freeze !== false) {
    deepFreeze(instance)
  }

  return instance
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

    // Run validation
    runValidation(schema, data, options)

    return createInstanceWithMeta(data, schema, options)
  } as InstanceBuilder

  builder.from = <T>(schema: Schema<T>, data: T, options?: InstanceOptions): T & InstanceMeta<T> => {
    return builder(schema, data, options) as T & InstanceMeta<T>
  }

  builder.partial = <T>(schema: Schema<T>, data: Partial<T>, options?: InstanceOptions): Partial<T> & InstanceMeta<T> => {
    // Partial instances skip validation
    return createInstanceWithMeta(data as T, schema as Schema<T>, options) as Partial<T> & InstanceMeta<T>
  }

  builder.clone = <T>(instance: T & InstanceMeta<T>): T & InstanceMeta<T> => {
    // Get schema from instance
    const schema = instance.__schema

    // Extract data (excluding metadata - but they're non-enumerable so spread works)
    const data = { ...instance } as T

    // Deep clone the data
    const clonedData = deepClone(data)

    // Create new instance with fresh metadata
    return createInstanceWithMeta(clonedData, schema, { freeze: true })
  }

  builder.update = <T>(instance: T & InstanceMeta<T>, patch: Partial<T>): T & InstanceMeta<T> => {
    // Get schema from instance
    const schema = instance.__schema

    // Merge instance data with patch
    const mergedData = { ...instance, ...patch } as T

    // Run validation on merged data
    runValidation(schema, mergedData)

    // Create new instance with fresh metadata
    return createInstanceWithMeta(mergedData, schema, { freeze: true })
  }

  builder.validate = <T>(schema: Schema<T>, data: unknown): data is T => {
    if (data === null || data === undefined || typeof data !== 'object') {
      return false
    }

    if (schema.validate) {
      try {
        const result = schema.validate(data)
        return result !== false
      } catch {
        return false
      }
    }

    return true
  }

  builder.isInstance = <T>(value: unknown, schema?: Schema<T>): value is T & InstanceMeta<T> => {
    if (value === null || value === undefined || typeof value !== 'object') {
      return false
    }

    // Check if it has metadata properties (even though non-enumerable, they're still accessible)
    const obj = value as Record<string | symbol, unknown>

    // Get own property descriptor to check for __schema
    const schemaDesc = Object.getOwnPropertyDescriptor(obj, '__schema')
    const createdAtDesc = Object.getOwnPropertyDescriptor(obj, '__createdAt')
    const idDesc = Object.getOwnPropertyDescriptor(obj, '__id')

    if (!schemaDesc || !createdAtDesc || !idDesc) {
      return false
    }

    // If schema is provided, check if it matches
    if (schema !== undefined) {
      return obj.__schema === schema
    }

    return true
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
