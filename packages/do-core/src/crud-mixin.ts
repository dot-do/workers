/**
 * CRUD Mixin for Durable Objects
 *
 * Provides generic Create, Read, Update, Delete operations
 * for document-based storage in Durable Objects.
 *
 * @module crud-mixin
 */

import type { DOStorage } from './core'

/**
 * Options for listing documents
 */
export interface CRUDListOptions {
  /** Maximum number of documents to return */
  limit?: number
  /** Number of documents to skip */
  offset?: number
  /** Key to start listing from */
  startAfter?: string
  /** Sort order */
  reverse?: boolean
}

/**
 * Document with required id field
 */
export interface Document {
  /** Unique document identifier */
  id: string
  /** Creation timestamp (ISO string or Unix ms) */
  createdAt?: string | number
  /** Last update timestamp (ISO string or Unix ms) */
  updatedAt?: string | number
  /** Additional document fields */
  [key: string]: unknown
}

/**
 * Interface for classes that can provide storage access.
 * Implemented by DO classes that want to use CRUD operations.
 */
export interface StorageProvider {
  /** Get the storage interface for CRUD operations */
  getStorage(): DOStorage
}

/**
 * Type helper for constructors.
 * Note: TypeScript requires any[] for mixin constructors (TS2545)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

/**
 * CRUD Mixin factory function.
 *
 * Creates a mixin class that adds CRUD operations to any base class
 * that implements the StorageProvider interface.
 *
 * @example
 * ```typescript
 * class MyDO extends CRUDMixin(DOCore) {
 *   getStorage() {
 *     return this.ctx.storage
 *   }
 *
 *   async fetch(request: Request) {
 *     // Now has access to this.get(), this.create(), etc.
 *     const user = await this.get('users', '123')
 *     return Response.json(user)
 *   }
 * }
 * ```
 *
 * @param Base - The base class to extend
 * @returns A new class with CRUD operations mixed in
 */
export function CRUDMixin<TBase extends Constructor<StorageProvider>>(Base: TBase) {
  return class extends Base {
    /**
     * Get a document by collection and id
     *
     * @param collection - The collection name (used as key prefix)
     * @param id - The document id
     * @returns The document or null if not found
     *
     * @example
     * ```typescript
     * const user = await this.get<User>('users', '123')
     * if (user) {
     *   console.log(user.name)
     * }
     * ```
     */
    async get<T extends Document>(collection: string, id: string): Promise<T | null> {
      const storage = this.getStorage()
      const key = `${collection}:${id}`
      const doc = await storage.get<T>(key)
      return doc ?? null
    }

    /**
     * Create a new document in a collection
     *
     * @param collection - The collection name
     * @param data - The document data (id will be generated if not provided)
     * @returns The created document with id and timestamps
     *
     * @example
     * ```typescript
     * const user = await this.create('users', {
     *   name: 'Alice',
     *   email: 'alice@example.com'
     * })
     * console.log(user.id) // generated UUID
     * ```
     */
    async create<T extends Partial<Document>>(
      collection: string,
      data: T
    ): Promise<T & Document> {
      const storage = this.getStorage()
      const id = data.id ?? crypto.randomUUID()
      const now = Date.now()

      const doc: T & Document = {
        ...data,
        id,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      }

      const key = `${collection}:${id}`
      await storage.put(key, doc)

      return doc
    }

    /**
     * Update an existing document
     *
     * @param collection - The collection name
     * @param id - The document id
     * @param updates - Partial document with fields to update
     * @returns The updated document or null if not found
     *
     * @example
     * ```typescript
     * const updated = await this.update('users', '123', {
     *   name: 'Alice Smith'
     * })
     * ```
     */
    async update<T extends Document>(
      collection: string,
      id: string,
      updates: Partial<T>
    ): Promise<T | null> {
      const storage = this.getStorage()
      const key = `${collection}:${id}`
      const existing = await storage.get<T>(key)

      if (!existing) {
        return null
      }

      const updated: T = {
        ...existing,
        ...updates,
        id, // Ensure id cannot be changed
        updatedAt: Date.now(),
      }

      await storage.put(key, updated)
      return updated
    }

    /**
     * Delete a document from a collection
     *
     * @param collection - The collection name
     * @param id - The document id
     * @returns true if the document was deleted, false if not found
     *
     * @example
     * ```typescript
     * const deleted = await this.delete('users', '123')
     * if (deleted) {
     *   console.log('User deleted')
     * }
     * ```
     */
    async delete(collection: string, id: string): Promise<boolean> {
      const storage = this.getStorage()
      const key = `${collection}:${id}`
      return storage.delete(key)
    }

    /**
     * List documents in a collection
     *
     * @param collection - The collection name
     * @param options - List options (limit, offset, etc.)
     * @returns Array of documents in the collection
     *
     * @example
     * ```typescript
     * // Get first 10 users
     * const users = await this.list<User>('users', { limit: 10 })
     *
     * // Get next page
     * const page2 = await this.list<User>('users', {
     *   limit: 10,
     *   startAfter: users[users.length - 1]?.id
     * })
     * ```
     */
    async list<T extends Document>(
      collection: string,
      options: CRUDListOptions = {}
    ): Promise<T[]> {
      const storage = this.getStorage()
      const { limit = 100, offset = 0, startAfter, reverse } = options

      const prefix = `${collection}:`
      const startKey = startAfter ? `${collection}:${startAfter}` : undefined

      const entries = await storage.list<T>({
        prefix,
        startAfter: startKey,
        reverse,
        limit: limit + offset, // Fetch extra for offset handling
      })

      // Convert map to array and apply offset
      const docs = Array.from(entries.values())
      return docs.slice(offset, offset + limit)
    }

    /**
     * Check if a document exists
     *
     * @param collection - The collection name
     * @param id - The document id
     * @returns true if the document exists
     *
     * @example
     * ```typescript
     * if (await this.exists('users', '123')) {
     *   // Document exists
     * }
     * ```
     */
    async exists(collection: string, id: string): Promise<boolean> {
      const doc = await this.get(collection, id)
      return doc !== null
    }

    /**
     * Count documents in a collection
     *
     * Note: This is potentially expensive for large collections
     * as it must enumerate all keys.
     *
     * @param collection - The collection name
     * @returns The number of documents in the collection
     *
     * @example
     * ```typescript
     * const userCount = await this.count('users')
     * ```
     */
    async count(collection: string): Promise<number> {
      const storage = this.getStorage()
      const prefix = `${collection}:`
      const entries = await storage.list({ prefix })
      return entries.size
    }

    /**
     * Upsert a document (create if not exists, update if exists)
     *
     * @param collection - The collection name
     * @param id - The document id
     * @param data - The document data
     * @returns The created or updated document
     *
     * @example
     * ```typescript
     * const user = await this.upsert('users', '123', {
     *   name: 'Alice',
     *   email: 'alice@example.com'
     * })
     * ```
     */
    async upsert<T extends Partial<Document>>(
      collection: string,
      id: string,
      data: T
    ): Promise<T & Document> {
      const existing = await this.get<T & Document>(collection, id)

      if (existing) {
        const updated = await this.update<T & Document>(collection, id, data as Partial<T & Document>)
        return updated!
      }

      return this.create(collection, { ...data, id })
    }

    /**
     * Delete all documents in a collection
     *
     * @param collection - The collection name
     * @returns The number of documents deleted
     *
     * @example
     * ```typescript
     * const deletedCount = await this.deleteCollection('temp-data')
     * ```
     */
    async deleteCollection(collection: string): Promise<number> {
      const storage = this.getStorage()
      const prefix = `${collection}:`
      const entries = await storage.list({ prefix })
      const keys = Array.from(entries.keys())

      if (keys.length === 0) {
        return 0
      }

      return storage.delete(keys)
    }

    /**
     * Get multiple documents by ids
     *
     * @param collection - The collection name
     * @param ids - Array of document ids
     * @returns Map of id to document (missing docs not included)
     *
     * @example
     * ```typescript
     * const users = await this.getMany<User>('users', ['1', '2', '3'])
     * for (const [id, user] of users) {
     *   console.log(id, user.name)
     * }
     * ```
     */
    async getMany<T extends Document>(
      collection: string,
      ids: string[]
    ): Promise<Map<string, T>> {
      const storage = this.getStorage()
      const keys = ids.map((id) => `${collection}:${id}`)
      const entries = await storage.get<T>(keys)

      // Re-map to use original ids instead of full keys
      const result = new Map<string, T>()
      for (const [key, value] of entries) {
        const id = key.replace(`${collection}:`, '')
        result.set(id, value)
      }

      return result
    }

    /**
     * Create multiple documents in a batch
     *
     * @param collection - The collection name
     * @param docs - Array of documents to create
     * @returns Array of created documents
     *
     * @example
     * ```typescript
     * const users = await this.createMany('users', [
     *   { name: 'Alice' },
     *   { name: 'Bob' }
     * ])
     * ```
     */
    async createMany<T extends Partial<Document>>(
      collection: string,
      docs: T[]
    ): Promise<(T & Document)[]> {
      const storage = this.getStorage()
      const now = Date.now()

      const created: (T & Document)[] = []
      const entries: Record<string, T & Document> = {}

      for (const data of docs) {
        const id = data.id ?? crypto.randomUUID()
        const doc: T & Document = {
          ...data,
          id,
          createdAt: data.createdAt ?? now,
          updatedAt: data.updatedAt ?? now,
        }

        const key = `${collection}:${id}`
        entries[key] = doc
        created.push(doc)
      }

      await storage.put(entries)
      return created
    }

    /**
     * Delete multiple documents by ids
     *
     * @param collection - The collection name
     * @param ids - Array of document ids to delete
     * @returns The number of documents deleted
     *
     * @example
     * ```typescript
     * const deletedCount = await this.deleteMany('users', ['1', '2', '3'])
     * ```
     */
    async deleteMany(collection: string, ids: string[]): Promise<number> {
      const storage = this.getStorage()
      const keys = ids.map((id) => `${collection}:${id}`)
      return storage.delete(keys)
    }
  }
}

/**
 * Abstract base class alternative for CRUD operations.
 *
 * Use this if you prefer classical inheritance over mixins.
 *
 * @example
 * ```typescript
 * class MyDO extends CRUDBase {
 *   protected ctx: DOState
 *
 *   constructor(ctx: DOState, env: Env) {
 *     super()
 *     this.ctx = ctx
 *   }
 *
 *   getStorage() {
 *     return this.ctx.storage
 *   }
 * }
 * ```
 */
export abstract class CRUDBase implements StorageProvider {
  /** Implement to provide storage access */
  abstract getStorage(): DOStorage

  async get<T extends Document>(collection: string, id: string): Promise<T | null> {
    const storage = this.getStorage()
    const key = `${collection}:${id}`
    const doc = await storage.get<T>(key)
    return doc ?? null
  }

  async create<T extends Partial<Document>>(
    collection: string,
    data: T
  ): Promise<T & Document> {
    const storage = this.getStorage()
    const id = data.id ?? crypto.randomUUID()
    const now = Date.now()

    const doc: T & Document = {
      ...data,
      id,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    }

    const key = `${collection}:${id}`
    await storage.put(key, doc)

    return doc
  }

  async update<T extends Document>(
    collection: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    const storage = this.getStorage()
    const key = `${collection}:${id}`
    const existing = await storage.get<T>(key)

    if (!existing) {
      return null
    }

    const updated: T = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    }

    await storage.put(key, updated)
    return updated
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const storage = this.getStorage()
    const key = `${collection}:${id}`
    return storage.delete(key)
  }

  async list<T extends Document>(
    collection: string,
    options: CRUDListOptions = {}
  ): Promise<T[]> {
    const storage = this.getStorage()
    const { limit = 100, offset = 0, startAfter, reverse } = options

    const prefix = `${collection}:`
    const startKey = startAfter ? `${collection}:${startAfter}` : undefined

    const entries = await storage.list<T>({
      prefix,
      startAfter: startKey,
      reverse,
      limit: limit + offset,
    })

    const docs = Array.from(entries.values())
    return docs.slice(offset, offset + limit)
  }

  async exists(collection: string, id: string): Promise<boolean> {
    const doc = await this.get(collection, id)
    return doc !== null
  }

  async count(collection: string): Promise<number> {
    const storage = this.getStorage()
    const prefix = `${collection}:`
    const entries = await storage.list({ prefix })
    return entries.size
  }

  async upsert<T extends Partial<Document>>(
    collection: string,
    id: string,
    data: T
  ): Promise<T & Document> {
    const existing = await this.get<T & Document>(collection, id)

    if (existing) {
      const updated = await this.update<T & Document>(collection, id, data as Partial<T & Document>)
      return updated!
    }

    return this.create(collection, { ...data, id })
  }

  async deleteCollection(collection: string): Promise<number> {
    const storage = this.getStorage()
    const prefix = `${collection}:`
    const entries = await storage.list({ prefix })
    const keys = Array.from(entries.keys())

    if (keys.length === 0) {
      return 0
    }

    return storage.delete(keys)
  }

  async getMany<T extends Document>(
    collection: string,
    ids: string[]
  ): Promise<Map<string, T>> {
    const storage = this.getStorage()
    const keys = ids.map((id) => `${collection}:${id}`)
    const entries = await storage.get<T>(keys)

    const result = new Map<string, T>()
    for (const [key, value] of entries) {
      const id = key.replace(`${collection}:`, '')
      result.set(id, value)
    }

    return result
  }

  async createMany<T extends Partial<Document>>(
    collection: string,
    docs: T[]
  ): Promise<(T & Document)[]> {
    const storage = this.getStorage()
    const now = Date.now()

    const created: (T & Document)[] = []
    const entries: Record<string, T & Document> = {}

    for (const data of docs) {
      const id = data.id ?? crypto.randomUUID()
      const doc: T & Document = {
        ...data,
        id,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      }

      const key = `${collection}:${id}`
      entries[key] = doc
      created.push(doc)
    }

    await storage.put(entries)
    return created
  }

  async deleteMany(collection: string, ids: string[]): Promise<number> {
    const storage = this.getStorage()
    const keys = ids.map((id) => `${collection}:${id}`)
    return storage.delete(keys)
  }
}
