/**
 * 目 (list/ls) glyph - List Operations
 *
 * The 目 glyph provides fluent list queries and transformations.
 * The character represents rows of items (an eye with horizontal lines) -
 * a visual metaphor for list items or rows in a table.
 *
 * Features:
 * - Query builder creation: 目(array)
 * - Filtering: .where({ field: { op: value } })
 * - Transformation: .map(fn)
 * - Ordering: .sort(key, direction)
 * - Limiting: .limit(n)
 * - Skipping: .offset(n) / .skip(n)
 * - Execution: .execute() / .toArray()
 * - Async iteration: for await (const item of 目(array))
 * - First/Last: .first() / .last()
 * - Count: .count()
 * - Aggregation: .some(), .every(), .find(), .reduce(), .groupBy()
 * - Transformations: .distinct(), .flat(), .flatMap()
 *
 * ASCII alias: ls
 */

// Type definitions for where clause operators
type ComparisonOperator<T> = {
  gt?: T
  gte?: T
  lt?: T
  lte?: T
  ne?: T
  in?: T[]
  nin?: T[]
  contains?: T extends string ? string : never
  startsWith?: T extends string ? string : never
  endsWith?: T extends string ? string : never
}

type WhereValue<T> = T | ComparisonOperator<T>

type WhereClause<T> = {
  [K in keyof T]?: WhereValue<T[K]>
} & {
  $or?: WhereClause<T>[]
} & {
  [key: string]: WhereValue<unknown> | WhereClause<T>[] | undefined
}

// Query builder interface
interface ListQuery<T, R = T> extends AsyncIterable<R> {
  where(clause: WhereClause<T>): ListQuery<T, R>
  map<U>(fn: (item: R, index: number) => U | Promise<U>): ListQuery<T, U>
  sort(key: keyof R & string, direction?: 'asc' | 'desc'): ListQuery<T, R>
  sort(comparator: (a: R, b: R) => number): ListQuery<T, R>
  sort(): ListQuery<T, R>
  limit(n: number): ListQuery<T, R>
  offset(n: number): ListQuery<T, R>
  skip(n: number): ListQuery<T, R>
  distinct(): ListQuery<T, R>
  flat<D extends number = 1>(): ListQuery<T, R extends (infer U)[] ? U : R>
  flatMap<U>(fn: (item: R, index: number) => U | U[]): ListQuery<T, U>

  // Terminal operations
  execute(): Promise<R[]>
  toArray(): Promise<R[]>
  first(): Promise<R | undefined>
  last(): Promise<R | undefined>
  count(): Promise<number>
  some(predicate: (item: R) => boolean): Promise<boolean>
  every(predicate: (item: R) => boolean): Promise<boolean>
  find(predicate: (item: R) => boolean): Promise<R | undefined>
  reduce<U>(fn: (acc: U, item: R) => U, initial: U): Promise<U>
  groupBy<K extends keyof R>(key: K): Promise<Map<R[K], R[]>>
}

// Operation types for lazy evaluation
type Operation<T, R> =
  | { type: 'where'; clause: WhereClause<T> }
  | { type: 'map'; fn: (item: unknown, index: number) => unknown }
  | { type: 'sort'; key?: string; direction?: 'asc' | 'desc'; comparator?: (a: unknown, b: unknown) => number }
  | { type: 'limit'; n: number }
  | { type: 'offset'; n: number }
  | { type: 'distinct' }
  | { type: 'flat' }
  | { type: 'flatMap'; fn: (item: unknown, index: number) => unknown }

/**
 * Get a nested property value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Check if a value matches a where condition
 */
function matchesCondition(value: unknown, condition: unknown): boolean {
  // Direct equality check
  if (typeof condition !== 'object' || condition === null || Array.isArray(condition)) {
    return value === condition
  }

  // Operator-based conditions
  const ops = condition as ComparisonOperator<unknown>

  if ('gt' in ops && ops.gt !== undefined) {
    if (typeof value !== 'number' || value <= (ops.gt as number)) return false
  }
  if ('gte' in ops && ops.gte !== undefined) {
    if (typeof value !== 'number' || value < (ops.gte as number)) return false
  }
  if ('lt' in ops && ops.lt !== undefined) {
    if (typeof value !== 'number' || value >= (ops.lt as number)) return false
  }
  if ('lte' in ops && ops.lte !== undefined) {
    if (typeof value !== 'number' || value > (ops.lte as number)) return false
  }
  if ('ne' in ops && ops.ne !== undefined) {
    if (value === ops.ne) return false
  }
  if ('in' in ops && ops.in !== undefined) {
    if (!ops.in.includes(value)) return false
  }
  if ('nin' in ops && ops.nin !== undefined) {
    if (ops.nin.includes(value)) return false
  }
  if ('contains' in ops && ops.contains !== undefined) {
    if (typeof value !== 'string' || !value.includes(ops.contains as string)) return false
  }
  if ('startsWith' in ops && ops.startsWith !== undefined) {
    if (typeof value !== 'string' || !value.startsWith(ops.startsWith as string)) return false
  }
  if ('endsWith' in ops && ops.endsWith !== undefined) {
    if (typeof value !== 'string' || !value.endsWith(ops.endsWith as string)) return false
  }

  return true
}

/**
 * Check if an item matches a where clause
 */
function matchesWhere<T>(item: T, clause: WhereClause<T>): boolean {
  // Handle $or conditions
  if ('$or' in clause && clause.$or) {
    const orConditions = clause.$or
    const orMatches = orConditions.some(orClause => matchesWhere(item, orClause))
    if (!orMatches) return false
  }

  // Check all other conditions (AND)
  for (const [key, condition] of Object.entries(clause)) {
    if (key === '$or') continue
    if (condition === undefined) continue

    const value = getNestedValue(item, key)
    if (!matchesCondition(value, condition)) {
      return false
    }
  }

  return true
}

/**
 * Create a list query builder
 */
class ListQueryBuilder<T, R = T> implements ListQuery<T, R> {
  private data: readonly T[]
  private operations: Operation<T, R>[]

  constructor(data: readonly T[], operations: Operation<T, R>[] = []) {
    // Make a defensive copy
    this.data = [...data]
    this.operations = operations
  }

  where(clause: WhereClause<T>): ListQuery<T, R> {
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'where', clause },
    ])
  }

  map<U>(fn: (item: R, index: number) => U | Promise<U>): ListQuery<T, U> {
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'map', fn: fn as (item: unknown, index: number) => unknown },
    ]) as unknown as ListQuery<T, U>
  }

  sort(keyOrComparator?: string | ((a: R, b: R) => number), direction?: 'asc' | 'desc'): ListQuery<T, R> {
    if (typeof keyOrComparator === 'function') {
      return new ListQueryBuilder(this.data, [
        ...this.operations,
        { type: 'sort', comparator: keyOrComparator as (a: unknown, b: unknown) => number },
      ])
    }
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'sort', key: keyOrComparator, direction: direction || 'asc' },
    ])
  }

  limit(n: number): ListQuery<T, R> {
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'limit', n },
    ])
  }

  offset(n: number): ListQuery<T, R> {
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'offset', n },
    ])
  }

  skip(n: number): ListQuery<T, R> {
    return this.offset(n)
  }

  distinct(): ListQuery<T, R> {
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'distinct' },
    ])
  }

  flat<D extends number = 1>(): ListQuery<T, R extends (infer U)[] ? U : R> {
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'flat' },
    ]) as unknown as ListQuery<T, R extends (infer U)[] ? U : R>
  }

  flatMap<U>(fn: (item: R, index: number) => U | U[]): ListQuery<T, U> {
    return new ListQueryBuilder(this.data, [
      ...this.operations,
      { type: 'flatMap', fn: fn as (item: unknown, index: number) => unknown },
    ]) as unknown as ListQuery<T, U>
  }

  private async executeOperations(): Promise<R[]> {
    let result: unknown[] = [...this.data]
    let sortOp: { key?: string; direction?: 'asc' | 'desc'; comparator?: (a: unknown, b: unknown) => number } | null = null
    let limitOp: number | null = null
    let offsetOp: number | null = null

    // Process operations in order, but defer sort/limit/offset to the end
    for (const op of this.operations) {
      switch (op.type) {
        case 'where':
          result = result.filter(item => matchesWhere(item, op.clause as WhereClause<unknown>))
          break
        case 'map':
          // Support async mappers
          result = await Promise.all(result.map((item, index) => op.fn(item, index)))
          break
        case 'sort':
          // Defer sort operation
          sortOp = { key: op.key, direction: op.direction, comparator: op.comparator }
          break
        case 'limit':
          limitOp = op.n
          break
        case 'offset':
          offsetOp = op.n
          break
        case 'distinct':
          result = [...new Set(result)]
          break
        case 'flat':
          result = result.flat()
          break
        case 'flatMap':
          result = (await Promise.all(result.map((item, index) => op.fn(item, index)))).flat()
          break
      }
    }

    // Apply sort if present
    if (sortOp) {
      if (sortOp.comparator) {
        result = [...result].sort(sortOp.comparator)
      } else if (sortOp.key) {
        const key = sortOp.key
        const direction = sortOp.direction || 'asc'
        result = [...result].sort((a, b) => {
          const aVal = getNestedValue(a, key)
          const bVal = getNestedValue(b, key)
          if (aVal === bVal) return 0
          if (aVal === undefined || aVal === null) return 1
          if (bVal === undefined || bVal === null) return -1
          const comparison = aVal < bVal ? -1 : 1
          return direction === 'asc' ? comparison : -comparison
        })
      } else {
        // Sort without key - use default comparison
        result = [...result].sort((a, b) => {
          if (a === b) return 0
          if (a === undefined || a === null) return 1
          if (b === undefined || b === null) return -1
          return a < b ? -1 : 1
        })
      }
    }

    // Apply offset then limit
    if (offsetOp !== null) {
      result = result.slice(offsetOp)
    }
    if (limitOp !== null) {
      result = result.slice(0, limitOp)
    }

    return result as R[]
  }

  async execute(): Promise<R[]> {
    return this.executeOperations()
  }

  async toArray(): Promise<R[]> {
    return this.execute()
  }

  async first(): Promise<R | undefined> {
    const result = await this.limit(1).execute()
    return result[0]
  }

  async last(): Promise<R | undefined> {
    const result = await this.execute()
    return result[result.length - 1]
  }

  async count(): Promise<number> {
    const result = await this.execute()
    return result.length
  }

  async some(predicate: (item: R) => boolean): Promise<boolean> {
    const result = await this.execute()
    return result.some(predicate)
  }

  async every(predicate: (item: R) => boolean): Promise<boolean> {
    const result = await this.execute()
    return result.every(predicate)
  }

  async find(predicate: (item: R) => boolean): Promise<R | undefined> {
    const result = await this.execute()
    return result.find(predicate)
  }

  async reduce<U>(fn: (acc: U, item: R) => U, initial: U): Promise<U> {
    const result = await this.execute()
    return result.reduce(fn, initial)
  }

  async groupBy<K extends keyof R>(key: K): Promise<Map<R[K], R[]>> {
    const result = await this.execute()
    const map = new Map<R[K], R[]>()
    for (const item of result) {
      const groupKey = item[key]
      const existing = map.get(groupKey)
      if (existing) {
        existing.push(item)
      } else {
        map.set(groupKey, [item])
      }
    }
    return map
  }

  async *[Symbol.asyncIterator](): AsyncIterator<R> {
    const result = await this.execute()
    for (const item of result) {
      yield item
    }
  }
}

/**
 * 目 - Create a list query builder from an array
 *
 * @param data - The array to query
 * @returns A fluent query builder for list operations
 *
 * @example
 * ```typescript
 * const users = await 目(allUsers)
 *   .where({ active: true })
 *   .sort('name')
 *   .limit(10)
 *   .execute()
 * ```
 */
export function 目<T>(data: readonly T[]): ListQuery<T, T> {
  return new ListQueryBuilder(data)
}

/**
 * ASCII alias for 目 (list operations)
 */
export const ls = 目
