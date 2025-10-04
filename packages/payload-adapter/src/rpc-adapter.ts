import type { DatabaseAdapter, CollectionSlug, GlobalSlug } from 'payload'
import type { DbWorkerRPC, PayloadAdapterConfig } from './types'

/**
 * Payload database adapter that uses RPC to communicate with db worker
 *
 * This adapter translates Payload's database operations into RPC calls
 * to the db worker, which stores data in the `things` table using
 * composite keys (ns, type, id).
 */
export function createRpcAdapter(config: PayloadAdapterConfig): DatabaseAdapter {
  const { rpc } = config
  if (!rpc || !rpc.dbWorker) {
    throw new Error('RPC configuration required for RPC adapter')
  }

  const db: DbWorkerRPC = rpc.dbWorker
  const namespace = rpc.namespace || 'payload'

  return {
    name: 'payload-rpc-adapter',

    /**
     * Create a new document in a collection
     */
    async create({ collection, data, req }) {
      const id = data.id || generateId()
      const type = collection

      await db.createThing({
        ns: namespace,
        id,
        type,
        content: JSON.stringify(data),
        data: data,
        visibility: 'private', // Default for Payload collections
      })

      return {
        ...data,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },

    /**
     * Find documents in a collection
     */
    async find({ collection, where, limit, page, sort, req }) {
      const offset = page ? (page - 1) * (limit || 10) : 0

      const result = await db.queryThings({
        ns: namespace,
        type: collection,
        limit: limit || 10,
        offset,
        orderBy: sort ? Object.keys(sort)[0] : 'createdAt',
        orderDir: sort ? (Object.values(sort)[0] as 'asc' | 'desc') : 'desc',
        where: convertWhereClause(where),
      })

      return {
        docs: result.items.map(parseThingToDoc),
        totalDocs: result.total,
        limit: limit || 10,
        page: page || 1,
        totalPages: Math.ceil(result.total / (limit || 10)),
        hasNextPage: result.hasMore,
        hasPrevPage: page ? page > 1 : false,
      }
    },

    /**
     * Find a single document by ID
     */
    async findOne({ collection, where, req }) {
      const id = where?.id?.equals
      if (!id) {
        throw new Error('ID required for findOne')
      }

      const thing = await db.getThing({
        ns: namespace,
        id: String(id),
      })

      if (!thing) return null

      return parseThingToDoc(thing)
    },

    /**
     * Find a document by ID
     */
    async findByID({ collection, id, req }) {
      const thing = await db.getThing({
        ns: namespace,
        id: String(id),
      })

      if (!thing) return null

      return parseThingToDoc(thing)
    },

    /**
     * Update a document by ID
     */
    async updateOne({ collection, id, data, req }) {
      await db.updateThing({
        ns: namespace,
        id: String(id),
        data: data,
        content: JSON.stringify(data),
      })

      return {
        ...data,
        id,
        updatedAt: new Date().toISOString(),
      }
    },

    /**
     * Update multiple documents
     */
    async updateMany({ collection, where, data, req }) {
      // Find matching documents first
      const result = await db.queryThings({
        ns: namespace,
        type: collection,
        where: convertWhereClause(where),
      })

      // Update each document
      const updates = result.items.map((item) =>
        db.updateThing({
          ns: namespace,
          id: item.id,
          data: { ...item.data, ...data },
          content: JSON.stringify({ ...item.data, ...data }),
        })
      )

      await Promise.all(updates)

      return {
        docs: result.items.map((item) => ({
          ...item.data,
          ...data,
          id: item.id,
          updatedAt: new Date().toISOString(),
        })),
      }
    },

    /**
     * Delete a document by ID
     */
    async deleteOne({ collection, id, req }) {
      const thing = await db.getThing({
        ns: namespace,
        id: String(id),
      })

      if (!thing) return null

      await db.deleteThing({
        ns: namespace,
        id: String(id),
      })

      return parseThingToDoc(thing)
    },

    /**
     * Delete multiple documents
     */
    async deleteMany({ collection, where, req }) {
      const result = await db.queryThings({
        ns: namespace,
        type: collection,
        where: convertWhereClause(where),
      })

      const deletes = result.items.map((item) =>
        db.deleteThing({
          ns: namespace,
          id: item.id,
        })
      )

      await Promise.all(deletes)

      return {
        docs: result.items.map(parseThingToDoc),
      }
    },

    /**
     * Count documents in a collection
     */
    async count({ collection, where, req }) {
      const result = await db.queryThings({
        ns: namespace,
        type: collection,
        where: convertWhereClause(where),
        limit: 1, // Only need count, not docs
      })

      return result.total
    },

    /**
     * Create a new version of a document (for Payload versions feature)
     */
    async createVersion({ collection, parentID, versionData, req }) {
      // Store version as a separate thing with type suffix
      const versionId = `${parentID}__v${Date.now()}`

      await db.createThing({
        ns: namespace,
        id: versionId,
        type: `${collection}__versions`,
        content: JSON.stringify(versionData),
        data: { ...versionData, parent: parentID },
        visibility: 'private',
      })

      return {
        ...versionData,
        id: versionId,
        parent: parentID,
        createdAt: new Date().toISOString(),
      }
    },

    /**
     * Find versions of a document
     */
    async findVersions({ collection, where, limit, page, sort, req }) {
      const result = await db.queryThings({
        ns: namespace,
        type: `${collection}__versions`,
        where: convertWhereClause(where),
        limit: limit || 10,
        offset: page ? (page - 1) * (limit || 10) : 0,
      })

      return {
        docs: result.items.map(parseThingToDoc),
        totalDocs: result.total,
        limit: limit || 10,
        page: page || 1,
        totalPages: Math.ceil(result.total / (limit || 10)),
        hasNextPage: result.hasMore,
        hasPrevPage: page ? page > 1 : false,
      }
    },

    /**
     * Begin a transaction (RPC doesn't support transactions, so this is a no-op)
     */
    async beginTransaction(req) {
      return req // Pass through
    },

    /**
     * Commit a transaction (no-op for RPC)
     */
    async commitTransaction(req) {
      return
    },

    /**
     * Rollback a transaction (no-op for RPC)
     */
    async rollbackTransaction(req) {
      return
    },

    /**
     * Initialize the database connection
     */
    async init() {
      console.log('Payload RPC adapter initialized')
      console.log(`Namespace: ${namespace}`)
    },

    /**
     * Destroy the database connection
     */
    async destroy() {
      console.log('Payload RPC adapter destroyed')
    },
  } as DatabaseAdapter
}

/**
 * Parse a `thing` from db worker to Payload document format
 */
function parseThingToDoc(thing: any): any {
  return {
    ...thing.data,
    id: thing.id,
    createdAt: thing.created_at,
    updatedAt: thing.updated_at,
  }
}

/**
 * Convert Payload where clause to db worker query format
 */
function convertWhereClause(where?: any): any {
  if (!where) return undefined

  // Simple conversion - expand as needed
  const converted: any = {}

  for (const [key, value] of Object.entries(where)) {
    if (typeof value === 'object' && value !== null) {
      // Handle operators like { equals, not, in, etc }
      if ('equals' in value) {
        converted[key] = value.equals
      } else if ('not' in value) {
        converted[`${key}_not`] = value.not
      } else if ('in' in value) {
        converted[`${key}_in`] = value.in
      } else if ('like' in value) {
        converted[`${key}_like`] = value.like
      }
    } else {
      converted[key] = value
    }
  }

  return converted
}

/**
 * Generate a unique ID for a document
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
