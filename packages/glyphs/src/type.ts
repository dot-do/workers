/**
 * 口 (type/T) glyph - Schema/Type Definition
 *
 * A visual programming glyph for schema definition and validation.
 * The 口 character represents an empty container - a visual metaphor for a type
 * that defines the structure of data.
 *
 * Usage:
 * - Schema definition: 口({ field: Type, ... })
 * - Type inference: 口.Infer<typeof schema>
 * - Validation: schemas validate data at parse time
 * - Nested schemas: 口({ nested: 口({ ... }) })
 * - Optional fields: 口.optional(Type)
 * - Arrays: 口.array(Type) or [Type]
 * - Unions: 口.union(TypeA, TypeB)
 * - Enums: 口.enum('a', 'b', 'c')
 * - Custom validators: 口.refine(fn)
 * - ASCII alias: T
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Validation issue representing a single validation error */
export interface ValidationIssue {
  path: (string | number)[]
  message: string
  code?: string
}

/** Validation error containing all issues */
export class ValidationError extends Error {
  issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super(issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '))
    this.issues = issues
    this.name = 'ValidationError'
  }

  flatten(): { formErrors: string[]; fieldErrors: Record<string, string[]> } {
    const fieldErrors: Record<string, string[]> = {}
    const formErrors: string[] = []

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message)
      } else {
        const key = String(issue.path[0])
        if (!fieldErrors[key]) {
          fieldErrors[key] = []
        }
        fieldErrors[key].push(issue.message)
      }
    }

    return { formErrors, fieldErrors }
  }

  format(): Record<string, any> {
    const result: Record<string, any> = {}

    for (const issue of this.issues) {
      let current = result
      for (let i = 0; i < issue.path.length; i++) {
        const key = String(issue.path[i])
        if (i === issue.path.length - 1) {
          if (!current[key]) {
            current[key] = { _errors: [] }
          }
          current[key]._errors.push(issue.message)
        } else {
          if (!current[key]) {
            current[key] = {}
          }
          current = current[key]
        }
      }
    }

    return result
  }
}

/** Result of safeParse */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError }

/** Primitive type constructors */
type PrimitiveConstructor = StringConstructor | NumberConstructor | BooleanConstructor | DateConstructor

/** Schema definition shape */
type SchemaShape = Record<string, any>

/** Type to infer from a schema definition field */
type InferFieldType<T> = T extends Schema<infer U>
  ? U
  : T extends OptionalWrapper<infer U>
  ? InferFieldType<U> | undefined
  : T extends NullableWrapper<infer U>
  ? InferFieldType<U> | null
  : T extends ArraySchema<infer U>
  ? InferFieldType<U>[]
  : T extends UnionSchema<infer U>
  ? InferFieldType<U[number]>
  : T extends EnumSchema<infer U>
  ? U[number]
  : T extends LiteralSchema<infer U>
  ? U
  : T extends StringSchema
  ? string
  : T extends NumberSchema
  ? number
  : T extends BooleanSchema
  ? boolean
  : T extends DateSchema
  ? Date
  : T extends AnySchema
  ? any
  : T extends UnknownSchema
  ? unknown
  : T extends RecordSchema<infer K, infer V>
  ? Record<InferFieldType<K> extends string | number | symbol ? InferFieldType<K> : string, InferFieldType<V>>
  : T extends MapSchema<infer K, infer V>
  ? Map<InferFieldType<K>, InferFieldType<V>>
  : T extends SetSchema<infer V>
  ? Set<InferFieldType<V>>
  : T extends DefaultWrapper<infer U>
  ? InferFieldType<U>
  : T extends LazySchema<infer U>
  ? U
  : T extends InstanceOfSchema<infer U>
  ? U
  : T extends (infer U)[]
  ? InferFieldType<U>[]
  : T extends StringConstructor
  ? string
  : T extends NumberConstructor
  ? number
  : T extends BooleanConstructor
  ? boolean
  : T extends DateConstructor
  ? Date
  : T

/** Infer full type from schema shape */
type InferShape<T extends SchemaShape> = {
  [K in keyof T as T[K] extends OptionalWrapper<any> ? never : K]: InferFieldType<T[K]>
} & {
  [K in keyof T as T[K] extends OptionalWrapper<any> ? K : never]?: InferFieldType<T[K]>
}

// ============================================================================
// Schema Classes
// ============================================================================

/** Base schema interface */
interface BaseSchema<T = any> {
  readonly _type?: T
  check(data: unknown): data is T
  parse(data: unknown): T
  safeParse(data: unknown): SafeParseResult<T>
}

/** Optional field wrapper */
interface OptionalWrapper<T> {
  _optional: true
  _inner: T
}

/** Nullable field wrapper */
interface NullableWrapper<T> {
  _nullable: true
  _inner: T
}

/** Default value wrapper */
interface DefaultWrapper<T> {
  _default: true
  _inner: T
  _value: T | (() => T)
}

/** Main Schema class */
class Schema<T = any> implements BaseSchema<T> {
  readonly _type?: T
  readonly shape: SchemaShape
  private _optionalFields: Set<string>
  private _validator?: (data: T) => boolean
  private _refinements: Array<{ fn: (data: T) => boolean; message?: string }> = []
  private _transforms: Array<(data: any) => any> = []
  private _mode: 'strip' | 'passthrough' | 'strict' = 'strip'
  private _coerce: boolean = true

  constructor(shape: SchemaShape = {}, optionalFields?: Set<string>) {
    this.shape = shape
    this._optionalFields = optionalFields || new Set()

    // Check for validator in shape
    if ('validate' in shape && typeof shape.validate === 'function') {
      this._validator = shape.validate
    }
  }

  isOptional(field: string): boolean {
    const fieldDef = this.shape[field]
    if (fieldDef && typeof fieldDef === 'object' && fieldDef._optional) {
      return true
    }
    return this._optionalFields.has(field)
  }

  check(data: unknown): data is T {
    const result = this.safeParse(data)
    return result.success
  }

  parse(data: unknown): T {
    const result = this.safeParse(data)
    if (!result.success) {
      throw result.error
    }
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<T> {
    const issues: ValidationIssue[] = []

    if (data === null || data === undefined || typeof data !== 'object') {
      issues.push({ path: [], message: 'Expected object' })
      return { success: false, error: new ValidationError(issues) }
    }

    const input = data as Record<string, unknown>
    const result: Record<string, any> = {}

    // Check for unknown fields in strict mode
    if (this._mode === 'strict') {
      for (const key of Object.keys(input)) {
        if (!(key in this.shape) && key !== 'validate') {
          issues.push({ path: [key], message: 'Unexpected field' })
        }
      }
    }

    // Validate and copy known fields
    for (const [key, fieldDef] of Object.entries(this.shape)) {
      if (key === 'validate') continue

      const value = input[key]
      const isOptional = this.isOptional(key)
      const isNullable = fieldDef && typeof fieldDef === 'object' && fieldDef._nullable

      // Handle undefined values
      if (value === undefined) {
        if (fieldDef && typeof fieldDef === 'object' && fieldDef._default) {
          const defaultVal = fieldDef._value
          result[key] = typeof defaultVal === 'function' ? defaultVal() : defaultVal
          continue
        }
        if (!isOptional) {
          issues.push({ path: [key], message: `Required field '${key}' is missing` })
        }
        continue
      }

      // Handle null values
      if (value === null) {
        if (isNullable) {
          result[key] = null
          continue
        }
        issues.push({ path: [key], message: `Field '${key}' cannot be null` })
        continue
      }

      // Validate field value
      const fieldResult = this._validateField(key, fieldDef, value, issues)
      if (fieldResult !== undefined) {
        result[key] = fieldResult
      }
    }

    // Pass through unknown fields in passthrough mode
    if (this._mode === 'passthrough') {
      for (const key of Object.keys(input)) {
        if (!(key in this.shape)) {
          result[key] = input[key]
        }
      }
    }

    // Run custom validator
    if (this._validator && issues.length === 0) {
      const firstKey = Object.keys(this.shape).find(k => k !== 'validate')
      if (firstKey && !this._validator(result[firstKey])) {
        issues.push({ path: [firstKey], message: 'Custom validation failed' })
      }
    }

    // Run refinements
    for (const refinement of this._refinements) {
      if (!refinement.fn(result as T)) {
        issues.push({ path: [], message: refinement.message || 'Refinement failed' })
      }
    }

    if (issues.length > 0) {
      return { success: false, error: new ValidationError(issues) }
    }

    // Apply transforms
    let transformed = result as T
    for (const transform of this._transforms) {
      transformed = transform(transformed)
    }

    return { success: true, data: transformed }
  }

  private _validateField(
    key: string,
    fieldDef: any,
    value: unknown,
    issues: ValidationIssue[],
    path: (string | number)[] = [key]
  ): any {
    // Handle optional wrapper
    if (fieldDef && typeof fieldDef === 'object' && fieldDef._optional) {
      return this._validateField(key, fieldDef._inner, value, issues, path)
    }

    // Handle nullable wrapper
    if (fieldDef && typeof fieldDef === 'object' && fieldDef._nullable) {
      if (value === null) return null
      return this._validateField(key, fieldDef._inner, value, issues, path)
    }

    // Handle default wrapper
    if (fieldDef && typeof fieldDef === 'object' && fieldDef._default) {
      return this._validateField(key, fieldDef._inner, value, issues, path)
    }

    // Handle array notation [Type]
    if (Array.isArray(fieldDef)) {
      if (!Array.isArray(value)) {
        issues.push({ path, message: `Expected array for '${key}'` })
        return undefined
      }
      const innerType = fieldDef[0]
      return value.map((item, i) =>
        this._validateField(key, innerType, item, issues, [...path, i])
      )
    }

    // Handle primitive constructors
    if (fieldDef === String) {
      // Note: We do NOT coerce other types to strings - this is intentional.
      // String "42" -> Number works, but Number 123 -> String should fail.
      if (typeof value !== 'string') {
        issues.push({ path, message: `Expected string for '${key}'` })
        return undefined
      }
      return value
    }

    if (fieldDef === Number) {
      if (this._coerce && typeof value === 'string') {
        const num = Number(value)
        if (!isNaN(num)) return num
      }
      if (typeof value !== 'number') {
        issues.push({ path, message: `Expected number for '${key}'` })
        return undefined
      }
      return value
    }

    if (fieldDef === Boolean) {
      if (this._coerce) {
        if (value === 'true' || value === 1) return true
        if (value === 'false' || value === 0) return false
      }
      if (typeof value !== 'boolean') {
        issues.push({ path, message: `Expected boolean for '${key}'` })
        return undefined
      }
      return value
    }

    if (fieldDef === Date) {
      if (!(value instanceof Date)) {
        issues.push({ path, message: `Expected Date for '${key}'` })
        return undefined
      }
      return value
    }

    // Handle Schema instance
    if (fieldDef instanceof Schema) {
      const nestedResult = fieldDef.safeParse(value)
      if (!nestedResult.success) {
        for (const issue of nestedResult.error.issues) {
          issues.push({ path: [...path, ...issue.path], message: issue.message })
        }
        return undefined
      }
      return nestedResult.data
    }

    // Handle schema-like objects (StringSchema, NumberSchema, etc.)
    if (fieldDef && typeof fieldDef === 'object' && typeof fieldDef.check === 'function') {
      if (typeof fieldDef.parse === 'function') {
        try {
          return fieldDef.parse(value)
        } catch (e) {
          issues.push({ path, message: `Validation failed for '${key}'` })
          return undefined
        }
      }
      if (!fieldDef.check(value)) {
        issues.push({ path, message: `Validation failed for '${key}'` })
        return undefined
      }
      return value
    }

    // Default: return as-is
    return value
  }

  // Schema transformation methods

  partial(keys?: string[]): Schema<Partial<T>> {
    const newOptional = new Set(this._optionalFields)
    if (keys) {
      for (const key of keys) {
        newOptional.add(key)
      }
    } else {
      for (const key of Object.keys(this.shape)) {
        if (key !== 'validate') {
          newOptional.add(key)
        }
      }
    }
    const schema = new Schema<Partial<T>>(this.shape, newOptional)
    return schema
  }

  required(): Schema<Required<T>> {
    const newShape: SchemaShape = {}
    for (const [key, value] of Object.entries(this.shape)) {
      if (value && typeof value === 'object' && value._optional) {
        newShape[key] = value._inner
      } else {
        newShape[key] = value
      }
    }
    return new Schema<Required<T>>(newShape, new Set())
  }

  pick<K extends keyof T>(keys: K[]): Schema<Pick<T, K>> {
    const newShape: SchemaShape = {}
    const newOptional = new Set<string>()
    for (const key of keys) {
      if (String(key) in this.shape) {
        newShape[String(key)] = this.shape[String(key)]
        if (this._optionalFields.has(String(key))) {
          newOptional.add(String(key))
        }
      }
    }
    return new Schema<Pick<T, K>>(newShape, newOptional)
  }

  omit<K extends keyof T>(keys: K[]): Schema<Omit<T, K>> {
    const keySet = new Set(keys.map(String))
    const newShape: SchemaShape = {}
    const newOptional = new Set<string>()
    for (const [key, value] of Object.entries(this.shape)) {
      if (!keySet.has(key)) {
        newShape[key] = value
        if (this._optionalFields.has(key)) {
          newOptional.add(key)
        }
      }
    }
    return new Schema<Omit<T, K>>(newShape, newOptional)
  }

  extend<U extends SchemaShape>(shape: U): Schema<T & InferShape<U>> {
    const newShape = { ...this.shape, ...shape }
    return new Schema<T & InferShape<U>>(newShape, new Set(this._optionalFields))
  }

  merge<U>(other: Schema<U>): Schema<T & U> {
    const newShape = { ...this.shape, ...other.shape }
    const newOptional = new Set([...this._optionalFields, ...other._optionalFields])
    return new Schema<T & U>(newShape, newOptional)
  }

  refine(fn: (data: T) => boolean, options?: { message?: string }): Schema<T> {
    const clone = new Schema<T>(this.shape, new Set(this._optionalFields))
    clone._refinements = [...this._refinements, { fn, message: options?.message }]
    clone._transforms = [...this._transforms]
    clone._mode = this._mode
    return clone
  }

  transform<U>(fn: (data: T) => U): Schema<U> {
    const clone = new Schema<U>(this.shape, new Set(this._optionalFields))
    clone._refinements = [...this._refinements] as any
    clone._transforms = [...this._transforms, fn]
    clone._mode = this._mode
    return clone as Schema<U>
  }

  passthrough(): Schema<T> {
    const clone = new Schema<T>(this.shape, new Set(this._optionalFields))
    clone._refinements = [...this._refinements]
    clone._transforms = [...this._transforms]
    clone._mode = 'passthrough'
    return clone
  }

  strict(): Schema<T> {
    const clone = new Schema<T>(this.shape, new Set(this._optionalFields))
    clone._refinements = [...this._refinements]
    clone._transforms = [...this._transforms]
    clone._mode = 'strict'
    return clone
  }

  brand<B>(): Schema<T & { __brand: B }> {
    return this as any
  }
}

// ============================================================================
// Primitive Schema Classes
// ============================================================================

class StringSchema implements BaseSchema<string> {
  private _refinements: Array<{ fn: (s: string) => boolean; message?: string }> = []
  private _transforms: Array<(s: string) => string> = []
  private _minLength?: number
  private _maxLength?: number

  check(data: unknown): data is string {
    if (typeof data !== 'string') return false
    if (this._minLength !== undefined && data.length < this._minLength) return false
    if (this._maxLength !== undefined && data.length > this._maxLength) return false
    for (const r of this._refinements) {
      if (!r.fn(data)) return false
    }
    return true
  }

  parse(data: unknown): string {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<string> {
    if (typeof data !== 'string') {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected string' }]) }
    }
    if (this._minLength !== undefined && data.length < this._minLength) {
      return { success: false, error: new ValidationError([{ path: [], message: `String must be at least ${this._minLength} characters` }]) }
    }
    if (this._maxLength !== undefined && data.length > this._maxLength) {
      return { success: false, error: new ValidationError([{ path: [], message: `String must be at most ${this._maxLength} characters` }]) }
    }
    for (const r of this._refinements) {
      if (!r.fn(data)) {
        return { success: false, error: new ValidationError([{ path: [], message: r.message || 'Validation failed' }]) }
      }
    }
    let result = data
    for (const t of this._transforms) {
      result = t(result)
    }
    return { success: true, data: result }
  }

  min(length: number): StringSchema {
    const clone = this._clone()
    clone._minLength = length
    return clone
  }

  max(length: number): StringSchema {
    const clone = this._clone()
    clone._maxLength = length
    return clone
  }

  email(): StringSchema {
    return this.refine((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), { message: 'Invalid email' })
  }

  url(): StringSchema {
    return this.refine((s) => {
      try {
        new URL(s)
        return true
      } catch {
        return false
      }
    }, { message: 'Invalid URL' })
  }

  regex(pattern: RegExp): StringSchema {
    return this.refine((s) => pattern.test(s), { message: `Must match pattern ${pattern}` })
  }

  uuid(): StringSchema {
    return this.refine(
      (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
      { message: 'Invalid UUID' }
    )
  }

  refine(fn: (s: string) => boolean, options?: { message?: string }): StringSchema {
    const clone = this._clone()
    clone._refinements.push({ fn, message: options?.message })
    return clone
  }

  transform(fn: (s: string) => string): StringSchema {
    const clone = this._clone()
    clone._transforms.push(fn)
    return clone
  }

  brand<B>(): StringSchema & { __brand: B } {
    return this as any
  }

  private _clone(): StringSchema {
    const clone = new StringSchema()
    clone._refinements = [...this._refinements]
    clone._transforms = [...this._transforms]
    clone._minLength = this._minLength
    clone._maxLength = this._maxLength
    return clone
  }
}

class NumberSchema implements BaseSchema<number> {
  private _refinements: Array<{ fn: (n: number) => boolean; message?: string }> = []
  private _min?: number
  private _max?: number
  private _isInt: boolean = false

  check(data: unknown): data is number {
    if (typeof data !== 'number' || isNaN(data)) return false
    if (this._min !== undefined && data < this._min) return false
    if (this._max !== undefined && data > this._max) return false
    if (this._isInt && !Number.isInteger(data)) return false
    for (const r of this._refinements) {
      if (!r.fn(data)) return false
    }
    return true
  }

  parse(data: unknown): number {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<number> {
    if (typeof data !== 'number' || isNaN(data)) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected number' }]) }
    }
    if (this._min !== undefined && data < this._min) {
      return { success: false, error: new ValidationError([{ path: [], message: `Number must be at least ${this._min}` }]) }
    }
    if (this._max !== undefined && data > this._max) {
      return { success: false, error: new ValidationError([{ path: [], message: `Number must be at most ${this._max}` }]) }
    }
    if (this._isInt && !Number.isInteger(data)) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Number must be an integer' }]) }
    }
    for (const r of this._refinements) {
      if (!r.fn(data)) {
        return { success: false, error: new ValidationError([{ path: [], message: r.message || 'Validation failed' }]) }
      }
    }
    return { success: true, data }
  }

  min(value: number): NumberSchema {
    const clone = this._clone()
    clone._min = value
    return clone
  }

  max(value: number): NumberSchema {
    const clone = this._clone()
    clone._max = value
    return clone
  }

  int(): NumberSchema {
    const clone = this._clone()
    clone._isInt = true
    return clone
  }

  positive(): NumberSchema {
    return this.refine((n) => n > 0, { message: 'Number must be positive' })
  }

  negative(): NumberSchema {
    return this.refine((n) => n < 0, { message: 'Number must be negative' })
  }

  refine(fn: (n: number) => boolean, options?: { message?: string }): NumberSchema {
    const clone = this._clone()
    clone._refinements.push({ fn, message: options?.message })
    return clone
  }

  private _clone(): NumberSchema {
    const clone = new NumberSchema()
    clone._refinements = [...this._refinements]
    clone._min = this._min
    clone._max = this._max
    clone._isInt = this._isInt
    return clone
  }
}

class BooleanSchema implements BaseSchema<boolean> {
  check(data: unknown): data is boolean {
    return typeof data === 'boolean'
  }

  parse(data: unknown): boolean {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<boolean> {
    if (typeof data !== 'boolean') {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected boolean' }]) }
    }
    return { success: true, data }
  }
}

class DateSchema implements BaseSchema<Date> {
  check(data: unknown): data is Date {
    return data instanceof Date && !isNaN(data.getTime())
  }

  parse(data: unknown): Date {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<Date> {
    if (!(data instanceof Date) || isNaN(data.getTime())) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected Date' }]) }
    }
    return { success: true, data }
  }
}

class AnySchema implements BaseSchema<any> {
  check(data: unknown): data is any {
    return true
  }

  parse(data: unknown): any {
    return data
  }

  safeParse(data: unknown): SafeParseResult<any> {
    return { success: true, data }
  }
}

class UnknownSchema implements BaseSchema<unknown> {
  check(data: unknown): data is unknown {
    return true
  }

  parse(data: unknown): unknown {
    return data
  }

  safeParse(data: unknown): SafeParseResult<unknown> {
    return { success: true, data }
  }
}

// ============================================================================
// Composite Schema Classes
// ============================================================================

class ArraySchema<T> implements BaseSchema<T[]> {
  private _inner: any
  private _minLength?: number
  private _maxLength?: number
  private _nonempty: boolean = false

  constructor(inner: any) {
    this._inner = inner
  }

  check(data: unknown): data is T[] {
    if (!Array.isArray(data)) return false
    if (this._nonempty && data.length === 0) return false
    if (this._minLength !== undefined && data.length < this._minLength) return false
    if (this._maxLength !== undefined && data.length > this._maxLength) return false

    for (const item of data) {
      if (!this._checkItem(item)) return false
    }
    return true
  }

  private _checkItem(item: unknown): boolean {
    if (this._inner === String) return typeof item === 'string'
    if (this._inner === Number) return typeof item === 'number'
    if (this._inner === Boolean) return typeof item === 'boolean'
    if (this._inner === Date) return item instanceof Date
    if (this._inner && typeof this._inner.check === 'function') {
      return this._inner.check(item)
    }
    return true
  }

  parse(data: unknown): T[] {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<T[]> {
    if (!Array.isArray(data)) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected array' }]) }
    }
    if (this._nonempty && data.length === 0) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Array must not be empty' }]) }
    }
    if (this._minLength !== undefined && data.length < this._minLength) {
      return { success: false, error: new ValidationError([{ path: [], message: `Array must have at least ${this._minLength} items` }]) }
    }
    if (this._maxLength !== undefined && data.length > this._maxLength) {
      return { success: false, error: new ValidationError([{ path: [], message: `Array must have at most ${this._maxLength} items` }]) }
    }

    const issues: ValidationIssue[] = []
    const result: T[] = []

    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      if (this._inner && typeof this._inner.safeParse === 'function') {
        const itemResult = this._inner.safeParse(item)
        if (itemResult.success) {
          result.push(itemResult.data)
        } else {
          for (const issue of itemResult.error.issues) {
            issues.push({ path: [i, ...issue.path], message: issue.message })
          }
        }
      } else if (this._inner === String) {
        if (typeof item === 'string') {
          result.push(item as T)
        } else {
          issues.push({ path: [i], message: 'Expected string' })
        }
      } else if (this._inner === Number) {
        if (typeof item === 'number') {
          result.push(item as T)
        } else {
          issues.push({ path: [i], message: 'Expected number' })
        }
      } else if (this._inner === Boolean) {
        if (typeof item === 'boolean') {
          result.push(item as T)
        } else {
          issues.push({ path: [i], message: 'Expected boolean' })
        }
      } else if (this._inner === Date) {
        if (item instanceof Date) {
          result.push(item as T)
        } else {
          issues.push({ path: [i], message: 'Expected Date' })
        }
      } else {
        result.push(item as T)
      }
    }

    if (issues.length > 0) {
      return { success: false, error: new ValidationError(issues) }
    }
    return { success: true, data: result }
  }

  min(length: number): ArraySchema<T> {
    const clone = new ArraySchema<T>(this._inner)
    clone._minLength = length
    clone._maxLength = this._maxLength
    clone._nonempty = this._nonempty
    return clone
  }

  max(length: number): ArraySchema<T> {
    const clone = new ArraySchema<T>(this._inner)
    clone._minLength = this._minLength
    clone._maxLength = length
    clone._nonempty = this._nonempty
    return clone
  }

  nonempty(): ArraySchema<T> {
    const clone = new ArraySchema<T>(this._inner)
    clone._minLength = this._minLength
    clone._maxLength = this._maxLength
    clone._nonempty = true
    return clone
  }
}

class UnionSchema<T extends any[]> implements BaseSchema<T[number]> {
  readonly _union: T

  constructor(types: T) {
    this._union = types
  }

  check(data: unknown): data is T[number] {
    for (const type of this._union) {
      if (this._checkType(type, data)) return true
    }
    return false
  }

  private _checkType(type: any, data: unknown): boolean {
    if (type === String) return typeof data === 'string'
    if (type === Number) return typeof data === 'number'
    if (type === Boolean) return typeof data === 'boolean'
    if (type === Date) return data instanceof Date
    if (type && typeof type.check === 'function') return type.check(data)
    return false
  }

  parse(data: unknown): T[number] {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<T[number]> {
    for (const type of this._union) {
      if (type && typeof type.safeParse === 'function') {
        const result = type.safeParse(data)
        if (result.success) return result
      } else if (this._checkType(type, data)) {
        return { success: true, data: data as T[number] }
      }
    }
    return { success: false, error: new ValidationError([{ path: [], message: 'Value does not match any union member' }]) }
  }
}

class EnumSchema<T extends readonly string[]> implements BaseSchema<T[number]> {
  readonly values: T

  constructor(values: T) {
    this.values = values
  }

  check(data: unknown): data is T[number] {
    return typeof data === 'string' && (this.values as readonly string[]).includes(data)
  }

  parse(data: unknown): T[number] {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<T[number]> {
    if (!this.check(data)) {
      return { success: false, error: new ValidationError([{ path: [], message: `Expected one of: ${this.values.join(', ')}` }]) }
    }
    return { success: true, data }
  }
}

class LiteralSchema<T extends string | number | boolean> implements BaseSchema<T> {
  readonly value: T

  constructor(value: T) {
    this.value = value
  }

  check(data: unknown): data is T {
    return data === this.value
  }

  parse(data: unknown): T {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<T> {
    if (data !== this.value) {
      return { success: false, error: new ValidationError([{ path: [], message: `Expected literal value: ${this.value}` }]) }
    }
    return { success: true, data: data as T }
  }
}

class DiscriminatedUnionSchema<T extends Schema<any>[]> implements BaseSchema<any> {
  private _discriminator: string
  private _options: T

  constructor(discriminator: string, options: T) {
    this._discriminator = discriminator
    this._options = options
  }

  check(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false
    const discriminatorValue = (data as Record<string, unknown>)[this._discriminator]

    for (const option of this._options) {
      const literalDef = option.shape[this._discriminator]
      if (literalDef && literalDef.value === discriminatorValue) {
        return option.check(data)
      }
    }
    return false
  }

  parse(data: unknown): any {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<any> {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected object' }]) }
    }

    const discriminatorValue = (data as Record<string, unknown>)[this._discriminator]

    for (const option of this._options) {
      const literalDef = option.shape[this._discriminator]
      if (literalDef && literalDef.value === discriminatorValue) {
        return option.safeParse(data)
      }
    }

    return { success: false, error: new ValidationError([{ path: [this._discriminator], message: `Invalid discriminator value: ${discriminatorValue}` }]) }
  }
}

class LazySchema<T> implements BaseSchema<T> {
  private _getter: () => BaseSchema<T>
  private _cached?: BaseSchema<T>

  constructor(getter: () => BaseSchema<T>) {
    this._getter = getter
  }

  private _getSchema(): BaseSchema<T> {
    if (!this._cached) {
      this._cached = this._getter()
    }
    return this._cached
  }

  check(data: unknown): data is T {
    return this._getSchema().check(data)
  }

  parse(data: unknown): T {
    return this._getSchema().parse(data)
  }

  safeParse(data: unknown): SafeParseResult<T> {
    return this._getSchema().safeParse(data)
  }
}

class InstanceOfSchema<T> implements BaseSchema<T> {
  private _class: new (...args: any[]) => T

  constructor(cls: new (...args: any[]) => T) {
    this._class = cls
  }

  check(data: unknown): data is T {
    return data instanceof this._class
  }

  parse(data: unknown): T {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<T> {
    if (!(data instanceof this._class)) {
      return { success: false, error: new ValidationError([{ path: [], message: `Expected instance of ${this._class.name}` }]) }
    }
    return { success: true, data }
  }
}

class RecordSchema<K, V> implements BaseSchema<Record<string, V>> {
  private _keySchema: any
  private _valueSchema: any

  constructor(keyOrValue: any, valueSchema?: any) {
    if (valueSchema !== undefined) {
      this._keySchema = keyOrValue
      this._valueSchema = valueSchema
    } else {
      this._keySchema = null
      this._valueSchema = keyOrValue
    }
  }

  check(data: unknown): data is Record<string, V> {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false

    for (const [key, value] of Object.entries(data)) {
      if (this._keySchema && typeof this._keySchema.check === 'function') {
        if (!this._keySchema.check(key)) return false
      }
      if (!this._checkValue(value)) return false
    }
    return true
  }

  private _checkValue(value: unknown): boolean {
    if (this._valueSchema === String) return typeof value === 'string'
    if (this._valueSchema === Number) return typeof value === 'number'
    if (this._valueSchema === Boolean) return typeof value === 'boolean'
    if (this._valueSchema && typeof this._valueSchema.check === 'function') {
      return this._valueSchema.check(value)
    }
    return true
  }

  parse(data: unknown): Record<string, V> {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<Record<string, V>> {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected object' }]) }
    }

    const issues: ValidationIssue[] = []
    const result: Record<string, V> = {}

    for (const [key, value] of Object.entries(data)) {
      if (!this._checkValue(value)) {
        issues.push({ path: [key], message: 'Invalid value type' })
      } else {
        result[key] = value as V
      }
    }

    if (issues.length > 0) {
      return { success: false, error: new ValidationError(issues) }
    }
    return { success: true, data: result }
  }
}

class MapSchema<K, V> implements BaseSchema<Map<K, V>> {
  private _keySchema: any
  private _valueSchema: any

  constructor(keySchema: any, valueSchema: any) {
    this._keySchema = keySchema
    this._valueSchema = valueSchema
  }

  check(data: unknown): data is Map<K, V> {
    if (!(data instanceof Map)) return false

    for (const [key, value] of data) {
      if (this._keySchema && typeof this._keySchema.check === 'function') {
        if (!this._keySchema.check(key)) return false
      }
      if (this._valueSchema && typeof this._valueSchema.check === 'function') {
        if (!this._valueSchema.check(value)) return false
      }
    }
    return true
  }

  parse(data: unknown): Map<K, V> {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<Map<K, V>> {
    if (!(data instanceof Map)) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected Map' }]) }
    }
    return { success: true, data: data as Map<K, V> }
  }
}

class SetSchema<V> implements BaseSchema<Set<V>> {
  private _valueSchema: any

  constructor(valueSchema: any) {
    this._valueSchema = valueSchema
  }

  check(data: unknown): data is Set<V> {
    if (!(data instanceof Set)) return false

    for (const value of data) {
      if (this._valueSchema && typeof this._valueSchema.check === 'function') {
        if (!this._valueSchema.check(value)) return false
      }
    }
    return true
  }

  parse(data: unknown): Set<V> {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<Set<V>> {
    if (!(data instanceof Set)) {
      return { success: false, error: new ValidationError([{ path: [], message: 'Expected Set' }]) }
    }
    return { success: true, data: data as Set<V> }
  }
}

// ============================================================================
// Coercion Schemas
// ============================================================================

class CoerceNumberSchema implements BaseSchema<number> {
  check(data: unknown): data is number {
    if (typeof data === 'number' && !isNaN(data)) return true
    if (typeof data === 'string') {
      const num = Number(data)
      return !isNaN(num)
    }
    return false
  }

  parse(data: unknown): number {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<number> {
    if (typeof data === 'number' && !isNaN(data)) {
      return { success: true, data }
    }
    if (typeof data === 'string') {
      const num = Number(data)
      if (!isNaN(num)) {
        return { success: true, data: num }
      }
    }
    return { success: false, error: new ValidationError([{ path: [], message: 'Cannot coerce to number' }]) }
  }
}

class CoerceBooleanSchema implements BaseSchema<boolean> {
  check(data: unknown): data is boolean {
    if (typeof data === 'boolean') return true
    if (data === 'true' || data === 'false') return true
    if (data === 1 || data === 0) return true
    return false
  }

  parse(data: unknown): boolean {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<boolean> {
    if (typeof data === 'boolean') {
      return { success: true, data }
    }
    if (data === 'true' || data === 1) {
      return { success: true, data: true }
    }
    if (data === 'false' || data === 0) {
      return { success: true, data: false }
    }
    return { success: false, error: new ValidationError([{ path: [], message: 'Cannot coerce to boolean' }]) }
  }
}

class CoerceDateSchema implements BaseSchema<Date> {
  check(data: unknown): data is Date {
    if (data instanceof Date && !isNaN(data.getTime())) return true
    if (typeof data === 'string') {
      const date = new Date(data)
      return !isNaN(date.getTime())
    }
    return false
  }

  parse(data: unknown): Date {
    const result = this.safeParse(data)
    if (!result.success) throw result.error
    return result.data
  }

  safeParse(data: unknown): SafeParseResult<Date> {
    if (data instanceof Date && !isNaN(data.getTime())) {
      return { success: true, data }
    }
    if (typeof data === 'string') {
      const date = new Date(data)
      if (!isNaN(date.getTime())) {
        return { success: true, data: date }
      }
    }
    return { success: false, error: new ValidationError([{ path: [], message: 'Cannot coerce to Date' }]) }
  }
}

// ============================================================================
// Main 口 function and namespace
// ============================================================================

/**
 * Create a schema definition
 */
function createSchema<T extends SchemaShape>(shape: T): Schema<InferShape<T>>
function createSchema<T extends PrimitiveConstructor>(type: T): PrimitiveSchema<T>
function createSchema(shapeOrType: any): any {
  // Handle primitive constructors directly
  if (shapeOrType === String) {
    return new StringSchema()
  }
  if (shapeOrType === Number) {
    return new NumberSchema()
  }
  if (shapeOrType === Boolean) {
    return new BooleanSchema()
  }
  if (shapeOrType === Date) {
    return new DateSchema()
  }

  // Handle object shapes
  return new Schema(shapeOrType)
}

type PrimitiveSchema<T> =
  T extends StringConstructor ? StringSchema :
  T extends NumberConstructor ? NumberSchema :
  T extends BooleanConstructor ? BooleanSchema :
  T extends DateConstructor ? DateSchema :
  never

// Create the 口 function with all static methods
interface TypeFunction {
  <T extends SchemaShape>(shape: T): Schema<InferShape<T>>
  <T extends PrimitiveConstructor>(type: T): PrimitiveSchema<T>

  // Type helpers
  Infer: InferHelper
  Schema: typeof Schema

  // Primitive types
  string(): StringSchema
  number(): NumberSchema
  boolean(): BooleanSchema
  date(): DateSchema
  any(): AnySchema
  unknown(): UnknownSchema

  // Composite types
  array<T>(inner: T): ArraySchema<InferFieldType<T>>
  union<T extends any[]>(...types: T): UnionSchema<T>
  enum<T extends string[]>(...values: T): EnumSchema<T>
  literal<T extends string | number | boolean>(value: T): LiteralSchema<T>
  discriminatedUnion<T extends Schema<any>[]>(discriminator: string, options: T): DiscriminatedUnionSchema<T>
  lazy<T>(getter: () => BaseSchema<T>): LazySchema<T>
  instanceof<T>(cls: new (...args: any[]) => T): InstanceOfSchema<T>
  record<V>(valueSchema: V): RecordSchema<string, InferFieldType<V>>
  record<K, V>(keySchema: K, valueSchema: V): RecordSchema<InferFieldType<K>, InferFieldType<V>>
  map<K, V>(keySchema: K, valueSchema: V): MapSchema<InferFieldType<K>, InferFieldType<V>>
  set<V>(valueSchema: V): SetSchema<InferFieldType<V>>

  // Modifiers
  optional<T>(inner: T): OptionalWrapper<T>
  nullable<T>(inner: T): NullableWrapper<T>
  default<T>(value: T | (() => T)): DefaultWrapper<typeof String>

  // Coercion
  coerce: {
    number(): CoerceNumberSchema
    boolean(): CoerceBooleanSchema
    date(): CoerceDateSchema
  }
}

// Type inference helper
type InferHelper = {
  <S extends Schema<any>>(schema: S): S extends Schema<infer T> ? T : never
}

// Create the main function
const 口 = Object.assign(createSchema, {
  // Static methods
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  date: () => new DateSchema(),
  any: () => new AnySchema(),
  unknown: () => new UnknownSchema(),

  array: <T>(inner: T) => new ArraySchema<InferFieldType<T>>(inner),
  union: <T extends any[]>(...types: T) => new UnionSchema(types),
  enum: <T extends string[]>(...values: T) => new EnumSchema(values),
  literal: <T extends string | number | boolean>(value: T) => new LiteralSchema(value),
  discriminatedUnion: <T extends Schema<any>[]>(discriminator: string, options: T) =>
    new DiscriminatedUnionSchema(discriminator, options),
  lazy: <T>(getter: () => BaseSchema<T>) => new LazySchema(getter),
  instanceof: <T>(cls: new (...args: any[]) => T) => new InstanceOfSchema(cls),
  record: (keyOrValue: any, valueSchema?: any) => new RecordSchema(keyOrValue, valueSchema),
  map: <K, V>(keySchema: K, valueSchema: V) => new MapSchema(keySchema, valueSchema),
  set: <V>(valueSchema: V) => new SetSchema(valueSchema),

  optional: <T>(inner: T): OptionalWrapper<T> => ({ _optional: true, _inner: inner }),
  nullable: <T>(inner: T): NullableWrapper<T> => ({ _nullable: true, _inner: inner }),
  default: <T>(value: T | (() => T)): DefaultWrapper<typeof String> => ({
    _default: true,
    _inner: String,
    _value: value as any,
  }),

  coerce: {
    number: () => new CoerceNumberSchema(),
    boolean: () => new CoerceBooleanSchema(),
    date: () => new CoerceDateSchema(),
  },

  // Reference to Schema class
  Schema,
}) as TypeFunction

// Export T as alias for 口
export const T = 口
export { 口 }

// Export types
export type { Schema, ValidationIssue, SafeParseResult }
