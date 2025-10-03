import { BaseAdapter } from './base'
import type { Thing } from '../types'

/**
 * MongoDB Atlas Data API adapter
 * Uses HTTP REST API instead of native driver (works in Cloudflare Workers)
 */
export class MongoDBAdapter extends BaseAdapter {
  name = 'MongoDB Atlas'
  description = 'Document database with vector search support'

  private apiUrl: string
  private headers: Record<string, string>

  constructor(
    private config: {
      apiKey: string
      dataSource: string
      database: string
      collection: string
    }
  ) {
    super()
    this.apiUrl = 'https://data.mongodb-api.com/app/data-XXXXX/endpoint/data/v1'
    this.headers = {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    }
  }

  async connect(): Promise<void> {
    // Test connection by listing collections
    const response = await fetch(`${this.apiUrl}/action/find`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: {},
        limit: 1,
      }),
    })

    if (!response.ok) {
      throw new Error(`MongoDB connection failed: ${response.statusText}`)
    }
  }

  async disconnect(): Promise<void> {
    // HTTP API doesn't require disconnection
  }

  async migrate(): Promise<void> {
    // Create indexes via Data API
    await this.createIndex({ ns: 1 })
    await this.createIndex({ type: 1 })
    await this.createIndex({ ts: -1 })
    // Text index for full-text search
    await this.createIndex({ content: 'text' })
    // Vector index for similarity search (Atlas Search)
    // Note: Atlas Vector Search indexes must be created via Atlas UI or Admin API
    // This is a limitation of the Data API
  }

  async clear(): Promise<void> {
    const response = await fetch(`${this.apiUrl}/action/deleteMany`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: {},
      }),
    })

    if (!response.ok) {
      throw new Error(`Clear failed: ${response.statusText}`)
    }
  }

  async get(ns: string, id: string): Promise<Thing | null> {
    const formattedId = this.formatId(ns, id)

    const response = await fetch(`${this.apiUrl}/action/findOne`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: { id: formattedId },
      }),
    })

    if (!response.ok) return null

    const result = await response.json()
    return result.document ? this.docToThing(result.document) : null
  }

  async list(ns: string, limit: number, offset: number): Promise<Thing[]> {
    const response = await fetch(`${this.apiUrl}/action/find`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: { ns },
        sort: { ts: -1 },
        limit,
        skip: offset,
      }),
    })

    if (!response.ok) throw new Error(`List failed: ${response.statusText}`)

    const result = await response.json()
    return result.documents.map((doc: any) => this.docToThing(doc))
  }

  async count(ns: string): Promise<number> {
    const response = await fetch(`${this.apiUrl}/action/aggregate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        pipeline: [{ $match: { ns } }, { $count: 'total' }],
      }),
    })

    if (!response.ok) return 0

    const result = await response.json()
    return result.documents[0]?.total ?? 0
  }

  async aggregate(ns: string, field: string): Promise<Record<string, number>> {
    const response = await fetch(`${this.apiUrl}/action/aggregate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        pipeline: [{ $match: { ns } }, { $group: { _id: '$type', count: { $sum: 1 } } }],
      }),
    })

    if (!response.ok) return {}

    const result = await response.json()
    const agg: Record<string, number> = {}
    for (const doc of result.documents) {
      agg[doc._id] = doc.count
    }
    return agg
  }

  async insert(thing: Thing): Promise<void> {
    const response = await fetch(`${this.apiUrl}/action/insertOne`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        document: this.thingToDoc(thing),
      }),
    })

    if (!response.ok) {
      throw new Error(`Insert failed: ${response.statusText}`)
    }
  }

  async batchInsert(things: Thing[]): Promise<void> {
    // MongoDB Data API supports insertMany
    const response = await fetch(`${this.apiUrl}/action/insertMany`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        documents: things.map((thing) => this.thingToDoc(thing)),
      }),
    })

    if (!response.ok) {
      throw new Error(`Batch insert failed: ${response.statusText}`)
    }
  }

  async update(ns: string, id: string, data: Partial<Thing>): Promise<void> {
    const formattedId = this.formatId(ns, id)

    const update: any = {}
    if (data.type !== undefined) update.type = data.type
    if (data.content !== undefined) update.content = data.content
    if (data.data !== undefined) update.data = data.data
    if (data.meta !== undefined) update.meta = data.meta
    if (data.embeddings !== undefined) update.embeddings = data.embeddings

    const response = await fetch(`${this.apiUrl}/action/updateOne`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: { id: formattedId },
        update: { $set: update },
      }),
    })

    if (!response.ok) {
      throw new Error(`Update failed: ${response.statusText}`)
    }
  }

  async upsert(thing: Thing): Promise<void> {
    const response = await fetch(`${this.apiUrl}/action/updateOne`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: { id: thing.id },
        update: { $set: this.thingToDoc(thing) },
        upsert: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Upsert failed: ${response.statusText}`)
    }
  }

  async delete(ns: string, id: string): Promise<void> {
    const formattedId = this.formatId(ns, id)

    const response = await fetch(`${this.apiUrl}/action/deleteOne`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: { id: formattedId },
      }),
    })

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`)
    }
  }

  async fullTextSearch(query: string, limit: number): Promise<Thing[]> {
    // Use MongoDB text search
    const response = await fetch(`${this.apiUrl}/action/find`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: { $text: { $search: query } },
        sort: { score: { $meta: 'textScore' } },
        limit,
      }),
    })

    if (!response.ok) return []

    const result = await response.json()
    return result.documents.map((doc: any) => this.docToThing(doc))
  }

  async vectorSearch(embedding: number[], limit: number): Promise<Thing[]> {
    // MongoDB Atlas Vector Search requires Atlas Search index (created via UI)
    // For Data API, we'd use aggregation with $vectorSearch stage
    // Note: This requires Atlas Search to be configured
    const response = await fetch(`${this.apiUrl}/action/aggregate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        pipeline: [
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embeddings',
              queryVector: embedding,
              numCandidates: limit * 10,
              limit,
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      // Fallback if vector search not configured
      return this.vectorSearchFallback(embedding, limit)
    }

    const result = await response.json()
    return result.documents.map((doc: any) => this.docToThing(doc))
  }

  async hybridSearch(query: string, embedding: number[], limit: number): Promise<Thing[]> {
    // Combine text search and vector search
    const textResults = await this.fullTextSearch(query, limit * 2)
    const vectorResults = await this.vectorSearch(embedding, limit * 2)

    // Merge and re-rank
    const combined = new Map<string, { thing: Thing; textRank: number; vectorRank: number }>()

    textResults.forEach((thing, index) => {
      combined.set(thing.id, { thing, textRank: index, vectorRank: Infinity })
    })

    vectorResults.forEach((thing, index) => {
      const existing = combined.get(thing.id)
      if (existing) {
        existing.vectorRank = index
      } else {
        combined.set(thing.id, { thing, textRank: Infinity, vectorRank: index })
      }
    })

    const scored = Array.from(combined.values()).map((item) => {
      const textScore = item.textRank === Infinity ? 0 : 1 - item.textRank / textResults.length
      const vectorScore = item.vectorRank === Infinity ? 0 : 1 - item.vectorRank / vectorResults.length
      const hybridScore = textScore * 0.3 + vectorScore * 0.7
      return { thing: item.thing, hybridScore }
    })

    return scored
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, limit)
      .map((item) => item.thing)
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // MongoDB Data API doesn't support transactions
    // Would need native driver for multi-document transactions
    return fn()
  }

  async estimateCost(operations: number): Promise<number> {
    // MongoDB Atlas pricing: ~$0.10/million reads, ~$1/million writes
    // Average: ~$0.40 per million mixed operations (estimate)
    const costPerMillionOps = 0.4
    return (operations / 1_000_000) * costPerMillionOps
  }

  private async createIndex(index: any): Promise<void> {
    // Note: Data API doesn't support createIndex directly
    // Indexes must be created via MongoDB shell, Compass, or Admin API
    // This is a no-op placeholder
  }

  private thingToDoc(thing: Thing): any {
    return {
      id: thing.id,
      ns: thing.ns,
      type: thing.type,
      content: thing.content,
      data: thing.data,
      meta: thing.meta,
      embeddings: thing.embeddings,
      ts: thing.ts.toISOString(),
      ulid: thing.ulid,
    }
  }

  private docToThing(doc: any): Thing {
    return {
      id: doc.id,
      ns: doc.ns,
      type: doc.type,
      content: doc.content,
      data: doc.data,
      meta: doc.meta,
      embeddings: doc.embeddings,
      ts: new Date(doc.ts),
      ulid: doc.ulid,
    }
  }

  private async vectorSearchFallback(embedding: number[], limit: number): Promise<Thing[]> {
    // Fallback: fetch all and compute similarity in-memory
    const response = await fetch(`${this.apiUrl}/action/find`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        dataSource: this.config.dataSource,
        database: this.config.database,
        collection: this.config.collection,
        filter: {},
      }),
    })

    if (!response.ok) return []

    const result = await response.json()
    const all = result.documents.map((doc: any) => this.docToThing(doc))

    const withDistance = all
      .map((thing: Thing) => {
        const distance = thing.embeddings ? this.euclideanDistance(embedding, thing.embeddings) : Infinity
        return { thing, distance }
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)

    return withDistance.map((item) => item.thing)
  }

  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity
    let sum = 0
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2
    }
    return Math.sqrt(sum)
  }
}
