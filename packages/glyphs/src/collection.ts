/**
 * 田 (collection/c) glyph - Typed Collections
 *
 * A visual programming glyph for typed collection operations.
 * The 田 character represents a grid/field - data items arranged in rows.
 *
 * Usage:
 *   const users = 田<User>('users')
 *   await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
 *   const user = await users.get('1')
 *
 * Query pattern:
 *   const active = await users.where({ status: 'active' })
 *   const cheap = await products.where({ price: { $lt: 50 } })
 *
 * ASCII alias: c
 */

// Query operators for filtering
export interface QueryOperators<T> {
  $gt?: T
  $lt?: T
  $gte?: T
  $lte?: T
  $in?: T[]
  $contains?: string
}

// Query type: either direct value or operators
export type QueryValue<T> = T | QueryOperators<T>

// Query object maps keys to query values
export type Query<T> = {
  [K in keyof T]?: QueryValue<T[K]>
}

// List options for pagination and sorting
export interface ListOptions<T> {
  limit?: number
  offset?: number
  orderBy?: keyof T
  order?: 'asc' | 'desc'
}

// Collection options
export interface CollectionOptions<T> {
  idField?: keyof T
  timestamps?: boolean
  autoId?: boolean
  storage?: StorageAdapter<T>
}

// Storage adapter interface
export interface StorageAdapter<T> {
  get: (id: string) => Promise<T | null> | T | null
  set: (id: string, item: T) => Promise<void> | void
  delete: (id: string) => Promise<boolean> | boolean
  list: () => Promise<T[]> | T[]
}

// Event types
export type CollectionEventType = 'add' | 'update' | 'delete' | 'clear'
export type CollectionEventHandler<T> = (item: T) => void
export type ClearEventHandler = () => void

// Collection interface
export interface Collection<T extends { id?: string }> {
  readonly name: string
  readonly options?: CollectionOptions<T>

  // CRUD operations
  add(item: T): Promise<T>
  get(id: string): Promise<T | null>
  getMany(ids: string[]): Promise<T[]>
  update(id: string, partial: Partial<T>): Promise<T>
  upsert(id: string, item: T): Promise<T>
  delete(id: string): Promise<T | boolean>

  // List operations
  list(options?: ListOptions<T>): Promise<T[]>
  count(): Promise<number>
  clear(): Promise<void>
  isEmpty(): Promise<boolean>
  has(id: string): Promise<boolean>
  ids(): Promise<string[]>

  // Query operations
  where(query: Query<T>): Promise<T[]>
  findOne(query: Query<T>): Promise<T | null>

  // Batch operations
  addMany(items: T[]): Promise<T[]>
  updateMany(query: Query<T>, update: Partial<T>): Promise<number>
  deleteMany(query: Query<T>): Promise<number>

  // Events
  on(event: 'add', handler: CollectionEventHandler<T>): () => void
  on(event: 'update', handler: CollectionEventHandler<T>): () => void
  on(event: 'delete', handler: CollectionEventHandler<T>): () => void
  on(event: 'clear', handler: ClearEventHandler): () => void

  // Async iteration
  [Symbol.asyncIterator](): AsyncIterator<T>
}

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Check if a value matches a query value
function matchesQueryValue<V>(value: V, queryValue: QueryValue<V>): boolean {
  if (queryValue === null || queryValue === undefined) {
    return value === queryValue
  }

  // Check if it's an operator object
  if (typeof queryValue === 'object' && queryValue !== null && !Array.isArray(queryValue)) {
    const ops = queryValue as QueryOperators<V>
    const numValue = value as unknown as number
    const strValue = value as unknown as string

    if (ops.$gt !== undefined && !(numValue > (ops.$gt as unknown as number))) return false
    if (ops.$lt !== undefined && !(numValue < (ops.$lt as unknown as number))) return false
    if (ops.$gte !== undefined && !(numValue >= (ops.$gte as unknown as number))) return false
    if (ops.$lte !== undefined && !(numValue <= (ops.$lte as unknown as number))) return false
    if (ops.$in !== undefined && !ops.$in.includes(value)) return false
    if (ops.$contains !== undefined) {
      const searchStr = ops.$contains.toLowerCase()
      const valueStr = (typeof strValue === 'string' ? strValue : String(strValue)).toLowerCase()
      if (!valueStr.includes(searchStr)) return false
    }

    return true
  }

  // Direct value comparison
  return value === queryValue
}

// Check if an item matches a query
function matchesQuery<T>(item: T, query: Query<T>): boolean {
  for (const key in query) {
    const queryValue = query[key as keyof T]
    const itemValue = item[key as keyof T]
    if (!matchesQueryValue(itemValue, queryValue as QueryValue<typeof itemValue>)) {
      return false
    }
  }
  return true
}

// Collection registry for singleton pattern
const collectionRegistry = new Map<string, Collection<any>>()

// Collection implementation
class CollectionImpl<T extends { id?: string }> implements Collection<T> {
  readonly name: string
  readonly options?: CollectionOptions<T>

  private storage: Map<string, T> = new Map()
  private eventHandlers: Map<CollectionEventType, Set<Function>> = new Map()
  private idField: keyof T

  constructor(name: string, options?: CollectionOptions<T>) {
    this.name = name
    this.options = options
    this.idField = (options?.idField as keyof T) || ('id' as keyof T)

    // Initialize event handler sets
    this.eventHandlers.set('add', new Set())
    this.eventHandlers.set('update', new Set())
    this.eventHandlers.set('delete', new Set())
    this.eventHandlers.set('clear', new Set())
  }

  private emit(event: CollectionEventType, item?: T): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        if (event === 'clear') {
          (handler as ClearEventHandler)()
        } else if (item) {
          (handler as CollectionEventHandler<T>)(item)
        }
      })
    }
  }

  private getId(item: T): string {
    const id = item[this.idField]
    return id as unknown as string
  }

  async add(item: T): Promise<T> {
    let finalItem = item

    // Auto-generate ID if configured and not provided
    if (this.options?.autoId && !this.getId(item)) {
      finalItem = { ...item, [this.idField]: generateId() } as T
    }

    const id = this.getId(finalItem)

    if (this.storage.has(id)) {
      throw new Error(`Item with id '${id}' already exists`)
    }

    this.storage.set(id, finalItem)
    this.emit('add', finalItem)
    return finalItem
  }

  async get(id: string): Promise<T | null> {
    return this.storage.get(id) ?? null
  }

  async getMany(ids: string[]): Promise<T[]> {
    const results: T[] = []
    for (const id of ids) {
      const item = this.storage.get(id)
      if (item) results.push(item)
    }
    return results
  }

  async update(id: string, partial: Partial<T>): Promise<T> {
    const existing = this.storage.get(id)
    if (!existing) {
      throw new Error(`Item with id '${id}' not found`)
    }

    const updated = { ...existing, ...partial }
    this.storage.set(id, updated)
    this.emit('update', updated)
    return updated
  }

  async upsert(id: string, item: T): Promise<T> {
    const existing = this.storage.get(id)
    if (existing) {
      const updated = { ...existing, ...item }
      this.storage.set(id, updated)
      this.emit('update', updated)
      return updated
    } else {
      this.storage.set(id, item)
      this.emit('add', item)
      return item
    }
  }

  async delete(id: string): Promise<T | boolean> {
    const item = this.storage.get(id)
    if (item) {
      this.storage.delete(id)
      this.emit('delete', item)
      return item
    }
    return true
  }

  async list(options?: ListOptions<T>): Promise<T[]> {
    let items = Array.from(this.storage.values())

    // Apply sorting
    if (options?.orderBy) {
      const orderKey = options.orderBy
      const ascending = options.order !== 'desc'
      items.sort((a, b) => {
        const aVal = a[orderKey]
        const bVal = b[orderKey]
        if (aVal < bVal) return ascending ? -1 : 1
        if (aVal > bVal) return ascending ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    if (options?.offset !== undefined) {
      items = items.slice(options.offset)
    }
    if (options?.limit !== undefined) {
      items = items.slice(0, options.limit)
    }

    return items
  }

  async count(): Promise<number> {
    return this.storage.size
  }

  async clear(): Promise<void> {
    this.storage.clear()
    this.emit('clear')
  }

  async isEmpty(): Promise<boolean> {
    return this.storage.size === 0
  }

  async has(id: string): Promise<boolean> {
    return this.storage.has(id)
  }

  async ids(): Promise<string[]> {
    return Array.from(this.storage.keys())
  }

  async where(query: Query<T>): Promise<T[]> {
    const items = Array.from(this.storage.values())
    return items.filter(item => matchesQuery(item, query))
  }

  async findOne(query: Query<T>): Promise<T | null> {
    const items = Array.from(this.storage.values())
    return items.find(item => matchesQuery(item, query)) ?? null
  }

  async addMany(items: T[]): Promise<T[]> {
    const added: T[] = []
    for (const item of items) {
      const result = await this.add(item)
      added.push(result)
    }
    return added
  }

  async updateMany(query: Query<T>, update: Partial<T>): Promise<number> {
    const items = Array.from(this.storage.values())
    let count = 0
    for (const item of items) {
      if (matchesQuery(item, query)) {
        const id = this.getId(item)
        await this.update(id, update)
        count++
      }
    }
    return count
  }

  async deleteMany(query: Query<T>): Promise<number> {
    const items = Array.from(this.storage.values())
    let count = 0
    for (const item of items) {
      if (matchesQuery(item, query)) {
        const id = this.getId(item)
        await this.delete(id)
        count++
      }
    }
    return count
  }

  on(event: 'add', handler: CollectionEventHandler<T>): () => void
  on(event: 'update', handler: CollectionEventHandler<T>): () => void
  on(event: 'delete', handler: CollectionEventHandler<T>): () => void
  on(event: 'clear', handler: ClearEventHandler): () => void
  on(event: CollectionEventType, handler: Function): () => void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.add(handler)
    }
    return () => {
      handlers?.delete(handler)
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    const items = Array.from(this.storage.values())
    let index = 0

    return {
      async next(): Promise<IteratorResult<T>> {
        if (index < items.length) {
          return { done: false, value: items[index++] }
        }
        return { done: true, value: undefined }
      }
    }
  }
}

// Tagged template handler for natural language queries
async function handleTaggedTemplate(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
  // Parse the template string to extract collection name and query
  const fullString = strings.reduce((result, str, i) => {
    return result + str + (values[i] !== undefined ? `$${i}` : '')
  }, '')

  // Simple parser: "collection where field = value"
  const match = fullString.match(/^(\w+)\s+where\s+(.+)$/i)
  if (match) {
    const [, collectionName, queryPart] = match

    // Get or create the collection
    let collection = collectionRegistry.get(collectionName)
    if (!collection) {
      collection = new CollectionImpl(collectionName)
      collectionRegistry.set(collectionName, collection)
    }

    // Parse simple equality queries: "field = value" or "field > ${value}"
    const queryMatch = queryPart.match(/(\w+)\s*(=|>|<|>=|<=)\s*(\$\d+|\w+)/)
    if (queryMatch) {
      const [, field, operator, valuePlaceholder] = queryMatch

      let value: unknown
      if (valuePlaceholder.startsWith('$')) {
        const idx = parseInt(valuePlaceholder.slice(1), 10)
        value = values[idx]
      } else if (valuePlaceholder === 'true') {
        value = true
      } else if (valuePlaceholder === 'false') {
        value = false
      } else {
        value = valuePlaceholder
      }

      const query: Record<string, unknown> = {}
      switch (operator) {
        case '=':
          query[field] = value
          break
        case '>':
          query[field] = { $gt: value }
          break
        case '<':
          query[field] = { $lt: value }
          break
        case '>=':
          query[field] = { $gte: value }
          break
        case '<=':
          query[field] = { $lte: value }
          break
      }

      return collection.where(query as Query<any>)
    }
  }

  return []
}

// Collection factory function with tagged template support
export interface CollectionFactory {
  <T extends { id?: string }>(name: string, options?: CollectionOptions<T>): Collection<T>
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>
}

// Main factory function
function createCollection<T extends { id?: string }>(
  nameOrStrings: string | TemplateStringsArray,
  optionsOrFirstValue?: CollectionOptions<T> | unknown,
  ...restValues: unknown[]
): Collection<T> | Promise<unknown[]> {
  // Check if called as tagged template literal
  if (Array.isArray(nameOrStrings) && 'raw' in nameOrStrings) {
    return handleTaggedTemplate(
      nameOrStrings as TemplateStringsArray,
      optionsOrFirstValue,
      ...restValues
    )
  }

  const name = nameOrStrings as string
  const options = optionsOrFirstValue as CollectionOptions<T> | undefined

  // Singleton pattern: return existing collection if name matches AND no new options provided
  // If options are provided, we create a new collection or use existing (but with options stored)
  if (collectionRegistry.has(name) && !options) {
    return collectionRegistry.get(name) as Collection<T>
  }

  // If options are provided, create or replace the collection
  const collection = new CollectionImpl<T>(name, options)
  collectionRegistry.set(name, collection)
  return collection
}

// Export the collection factory with proper typing
export const 田 = createCollection as CollectionFactory
export const c = 田
