import type { DatabaseAdapter, Thing } from '../types'
import { ulid } from 'ulid'

/**
 * Base adapter class providing common utilities and structure
 * All database adapters should extend this class
 */
export abstract class BaseAdapter implements DatabaseAdapter {
  abstract name: string
  abstract description: string

  // Abstract methods that must be implemented
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract migrate(): Promise<void>
  abstract clear(): Promise<void>
  abstract get(ns: string, id: string): Promise<Thing | null>
  abstract list(ns: string, limit: number, offset: number): Promise<Thing[]>
  abstract count(ns: string): Promise<number>
  abstract aggregate(ns: string, field: string): Promise<Record<string, number>>
  abstract insert(thing: Thing): Promise<void>
  abstract batchInsert(things: Thing[]): Promise<void>
  abstract update(ns: string, id: string, data: Partial<Thing>): Promise<void>
  abstract upsert(thing: Thing): Promise<void>
  abstract delete(ns: string, id: string): Promise<void>
  abstract fullTextSearch(query: string, limit: number): Promise<Thing[]>
  abstract vectorSearch(embedding: number[], limit: number): Promise<Thing[]>
  abstract hybridSearch(query: string, embedding: number[], limit: number): Promise<Thing[]>
  abstract transaction<T>(fn: () => Promise<T>): Promise<T>
  abstract estimateCost(operations: number): Promise<number>

  /**
   * Default seed implementation - can be overridden for performance
   */
  async seed(count: number): Promise<void> {
    const batchSize = 100
    const batches = Math.ceil(count / batchSize)

    for (let i = 0; i < batches; i++) {
      const batch: Thing[] = []
      const start = i * batchSize
      const end = Math.min(start + batchSize, count)

      for (let j = start; j < end; j++) {
        batch.push(this.generateThing(j))
      }

      await this.batchInsert(batch)
    }
  }

  /**
   * Generate a test Thing for seeding
   */
  protected generateThing(index: number): Thing {
    const id = ulid()
    const ns = `test/namespace-${index % 10}` // 10 different namespaces
    const type = ['article', 'product', 'user', 'comment', 'event'][index % 5]

    return {
      id: `https://${ns}/${id}`,
      ns,
      type,
      content: `This is test content for item ${index}. It contains searchable text that can be used for full-text search benchmarks. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      data: {
        index,
        category: `category-${index % 20}`,
        status: index % 3 === 0 ? 'active' : 'inactive',
        score: Math.random() * 100,
        tags: [`tag-${index % 5}`, `tag-${index % 7}`],
      },
      meta: {
        created_by: `user-${index % 50}`,
        version: 1,
      },
      embeddings: this.generateEmbedding(),
      ts: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // random date in past year
      ulid: id,
    }
  }

  /**
   * Generate a random embedding vector (768 dimensions, similar to OpenAI embeddings)
   */
  protected generateEmbedding(): number[] {
    const dims = 768
    const embedding: number[] = []
    for (let i = 0; i < dims; i++) {
      embedding.push(Math.random() * 2 - 1) // values between -1 and 1
    }
    // Normalize to unit length
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map((val) => val / magnitude)
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  protected cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Embeddings must have same length')
    let dotProduct = 0
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
    }
    return dotProduct // assuming both are already normalized
  }

  /**
   * Helper to generate namespace pattern for queries
   */
  protected nsPattern(ns: string): string {
    return `https://${ns}/%`
  }

  /**
   * Helper to format ID with namespace
   */
  protected formatId(ns: string, id: string): string {
    if (id.startsWith('https://')) return id
    return `https://${ns}/${id}`
  }

  /**
   * Helper to extract ID from formatted ID
   */
  protected extractId(formattedId: string): string {
    const parts = formattedId.split('/')
    return parts[parts.length - 1]
  }

  /**
   * Helper to extract namespace from formatted ID
   */
  protected extractNs(formattedId: string): string {
    const match = formattedId.match(/^https:\/\/([^/]+)\//)
    return match ? match[1] : ''
  }

  /**
   * Default transaction implementation (no-op)
   * Override for databases that support transactions
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn()
  }
}
