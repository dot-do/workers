/**
 * CRUD Mixin for Durable Objects
 *
 * Provides generic Create, Read, Update, Delete operations
 * for document-based storage in Durable Objects.
 *
 * @module crud-mixin
 */
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
export function CRUDMixin(Base) {
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
        async get(collection, id) {
            const storage = this.getStorage();
            const key = `${collection}:${id}`;
            const doc = await storage.get(key);
            return doc ?? null;
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
        async create(collection, data) {
            const storage = this.getStorage();
            const id = data.id ?? crypto.randomUUID();
            const now = Date.now();
            const doc = {
                ...data,
                id,
                createdAt: data.createdAt ?? now,
                updatedAt: data.updatedAt ?? now,
            };
            const key = `${collection}:${id}`;
            await storage.put(key, doc);
            return doc;
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
        async update(collection, id, updates) {
            const storage = this.getStorage();
            const key = `${collection}:${id}`;
            const existing = await storage.get(key);
            if (!existing) {
                return null;
            }
            const updated = {
                ...existing,
                ...updates,
                id, // Ensure id cannot be changed
                updatedAt: Date.now(),
            };
            await storage.put(key, updated);
            return updated;
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
        async delete(collection, id) {
            const storage = this.getStorage();
            const key = `${collection}:${id}`;
            return storage.delete(key);
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
        async list(collection, options = {}) {
            const storage = this.getStorage();
            const { limit = 100, offset = 0, startAfter, reverse } = options;
            const prefix = `${collection}:`;
            const startKey = startAfter ? `${collection}:${startAfter}` : undefined;
            const entries = await storage.list({
                prefix,
                startAfter: startKey,
                reverse,
                limit: limit + offset, // Fetch extra for offset handling
            });
            // Convert map to array and apply offset
            const docs = Array.from(entries.values());
            return docs.slice(offset, offset + limit);
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
        async exists(collection, id) {
            const doc = await this.get(collection, id);
            return doc !== null;
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
        async count(collection) {
            const storage = this.getStorage();
            const prefix = `${collection}:`;
            const entries = await storage.list({ prefix });
            return entries.size;
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
        async upsert(collection, id, data) {
            const existing = await this.get(collection, id);
            if (existing) {
                const updated = await this.update(collection, id, data);
                return updated;
            }
            return this.create(collection, { ...data, id });
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
        async deleteCollection(collection) {
            const storage = this.getStorage();
            const prefix = `${collection}:`;
            const entries = await storage.list({ prefix });
            const keys = Array.from(entries.keys());
            if (keys.length === 0) {
                return 0;
            }
            return storage.delete(keys);
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
        async getMany(collection, ids) {
            const storage = this.getStorage();
            const keys = ids.map((id) => `${collection}:${id}`);
            const entries = await storage.get(keys);
            // Re-map to use original ids instead of full keys
            const result = new Map();
            for (const [key, value] of entries) {
                const id = key.replace(`${collection}:`, '');
                result.set(id, value);
            }
            return result;
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
        async createMany(collection, docs) {
            const storage = this.getStorage();
            const now = Date.now();
            const created = [];
            const entries = {};
            for (const data of docs) {
                const id = data.id ?? crypto.randomUUID();
                const doc = {
                    ...data,
                    id,
                    createdAt: data.createdAt ?? now,
                    updatedAt: data.updatedAt ?? now,
                };
                const key = `${collection}:${id}`;
                entries[key] = doc;
                created.push(doc);
            }
            await storage.put(entries);
            return created;
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
        async deleteMany(collection, ids) {
            const storage = this.getStorage();
            const keys = ids.map((id) => `${collection}:${id}`);
            return storage.delete(keys);
        }
    };
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
export class CRUDBase {
    async get(collection, id) {
        const storage = this.getStorage();
        const key = `${collection}:${id}`;
        const doc = await storage.get(key);
        return doc ?? null;
    }
    async create(collection, data) {
        const storage = this.getStorage();
        const id = data.id ?? crypto.randomUUID();
        const now = Date.now();
        const doc = {
            ...data,
            id,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        };
        const key = `${collection}:${id}`;
        await storage.put(key, doc);
        return doc;
    }
    async update(collection, id, updates) {
        const storage = this.getStorage();
        const key = `${collection}:${id}`;
        const existing = await storage.get(key);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
            id,
            updatedAt: Date.now(),
        };
        await storage.put(key, updated);
        return updated;
    }
    async delete(collection, id) {
        const storage = this.getStorage();
        const key = `${collection}:${id}`;
        return storage.delete(key);
    }
    async list(collection, options = {}) {
        const storage = this.getStorage();
        const { limit = 100, offset = 0, startAfter, reverse } = options;
        const prefix = `${collection}:`;
        const startKey = startAfter ? `${collection}:${startAfter}` : undefined;
        const entries = await storage.list({
            prefix,
            startAfter: startKey,
            reverse,
            limit: limit + offset,
        });
        const docs = Array.from(entries.values());
        return docs.slice(offset, offset + limit);
    }
    async exists(collection, id) {
        const doc = await this.get(collection, id);
        return doc !== null;
    }
    async count(collection) {
        const storage = this.getStorage();
        const prefix = `${collection}:`;
        const entries = await storage.list({ prefix });
        return entries.size;
    }
    async upsert(collection, id, data) {
        const existing = await this.get(collection, id);
        if (existing) {
            const updated = await this.update(collection, id, data);
            return updated;
        }
        return this.create(collection, { ...data, id });
    }
    async deleteCollection(collection) {
        const storage = this.getStorage();
        const prefix = `${collection}:`;
        const entries = await storage.list({ prefix });
        const keys = Array.from(entries.keys());
        if (keys.length === 0) {
            return 0;
        }
        return storage.delete(keys);
    }
    async getMany(collection, ids) {
        const storage = this.getStorage();
        const keys = ids.map((id) => `${collection}:${id}`);
        const entries = await storage.get(keys);
        const result = new Map();
        for (const [key, value] of entries) {
            const id = key.replace(`${collection}:`, '');
            result.set(id, value);
        }
        return result;
    }
    async createMany(collection, docs) {
        const storage = this.getStorage();
        const now = Date.now();
        const created = [];
        const entries = {};
        for (const data of docs) {
            const id = data.id ?? crypto.randomUUID();
            const doc = {
                ...data,
                id,
                createdAt: data.createdAt ?? now,
                updatedAt: data.updatedAt ?? now,
            };
            const key = `${collection}:${id}`;
            entries[key] = doc;
            created.push(doc);
        }
        await storage.put(entries);
        return created;
    }
    async deleteMany(collection, ids) {
        const storage = this.getStorage();
        const keys = ids.map((id) => `${collection}:${id}`);
        return storage.delete(keys);
    }
}
