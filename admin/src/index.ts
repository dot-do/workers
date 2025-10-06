import { WorkerEntrypoint } from 'cloudflare:workers'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '../../../admin/src/payload.config'

interface Env {
  // Bindings
  AUTH_SERVICE: any // Auth service for RBAC
  DATABASE_URI: string
  PAYLOAD_SECRET: string

  // Cloudflare AI
  AI: Ai

  // Optional bindings
  CLICKHOUSE_URL?: string
  CLICKHOUSE_USERNAME?: string
  CLICKHOUSE_PASSWORD?: string
}

interface VectorSearchOptions {
  collection: string
  query: string
  limit?: number
  threshold?: number
  filters?: Record<string, any>
}

interface VectorSearchResult {
  id: string
  score: number
  document: any
}

/**
 * Admin Service - Payload RPC Interface with Vector Search
 *
 * Provides admin-only access to Payload CMS via Workers RPC.
 * Includes vector search capabilities using Cloudflare Workers AI (Gemma 300M).
 */
export class AdminService extends WorkerEntrypoint<Env> {
  private payloadInstance: Payload | null = null

  /**
   * Get or initialize Payload instance
   */
  private async getPayload(): Promise<Payload> {
    if (!this.payloadInstance) {
      this.payloadInstance = await getPayload({ config })
    }
    return this.payloadInstance
  }

  /**
   * Validate admin authentication
   */
  private async validateAdmin(userToken: string): Promise<any> {
    try {
      const user = await this.env.AUTH_SERVICE.validateToken(userToken)
      if (user.role !== 'admin') {
        throw new Error('Admin access required')
      }
      return user
    } catch (error) {
      throw new Error('Unauthorized: Admin access required')
    }
  }

  /**
   * Generate text embeddings using Cloudflare Workers AI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: [text],
      })

      return response.data[0]
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  /**
   * Semantic search across collection using vector embeddings
   */
  async vectorSearch(
    options: VectorSearchOptions,
    userToken: string
  ): Promise<VectorSearchResult[]> {
    await this.validateAdmin(userToken)

    const { collection, query, limit = 10, threshold = 0.7, filters = {} } = options

    try {
      const payload = await this.getPayload()

      // Generate embedding for search query
      const queryEmbedding = await this.generateEmbedding(query)

      // Get all documents from collection (with filters)
      const { docs } = await payload.find({
        collection,
        where: filters,
        limit: 1000, // Max to compare
      })

      // Generate embeddings for each document and calculate similarity
      const results: VectorSearchResult[] = []

      for (const doc of docs) {
        // Create searchable text from document
        const searchText = this.extractSearchableText(doc, collection)

        // Generate embedding
        const docEmbedding = await this.generateEmbedding(searchText)

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding)

        if (similarity >= threshold) {
          results.push({
            id: doc.id,
            score: similarity,
            document: doc,
          })
        }
      }

      // Sort by score descending and limit
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    } catch (error) {
      console.error('Vector search error:', error)
      throw new Error(`Vector search failed: ${error.message}`)
    }
  }

  /**
   * Extract searchable text from document based on collection type
   */
  private extractSearchableText(doc: any, collection: string): string {
    const parts: string[] = []

    // Common fields
    if (doc.name) parts.push(doc.name)
    if (doc.title) parts.push(doc.title)
    if (doc.description) parts.push(doc.description)

    // Collection-specific fields
    switch (collection) {
      case 'agents':
        if (doc.role) parts.push(doc.role)
        if (doc.systemPrompt) parts.push(doc.systemPrompt)
        if (doc.capabilities) parts.push(...doc.capabilities.map((c: any) => c.capability))
        break

      case 'products':
      case 'commerceServices':
        if (doc.features) parts.push(...doc.features.map((f: any) => f.feature))
        break

      case 'blogPosts':
      case 'landingPages':
        if (doc.content) parts.push(JSON.stringify(doc.content))
        if (doc.excerpt) parts.push(doc.excerpt)
        break

      case 'functions':
        if (doc.inputSchema) parts.push(JSON.stringify(doc.inputSchema))
        if (doc.outputSchema) parts.push(JSON.stringify(doc.outputSchema))
        break
    }

    // MDX content if available
    if (doc.mdxContent) parts.push(doc.mdxContent)

    return parts.filter(Boolean).join(' ')
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (normA * normB)
  }

  /**
   * Query collection (standard Payload find)
   */
  async queryCollection(
    collection: string,
    query: any,
    userToken: string
  ): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    return await payload.find({ collection, ...query })
  }

  /**
   * Get single document by ID
   */
  async getDocument(
    collection: string,
    id: string,
    userToken: string
  ): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    return await payload.findByID({ collection, id })
  }

  /**
   * Create document
   */
  async createDocument(
    collection: string,
    data: any,
    userToken: string
  ): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    return await payload.create({ collection, data })
  }

  /**
   * Update document
   */
  async updateDocument(
    collection: string,
    id: string,
    data: any,
    userToken: string
  ): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    return await payload.update({ collection, id, data })
  }

  /**
   * Delete document
   */
  async deleteDocument(
    collection: string,
    id: string,
    userToken: string
  ): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    return await payload.delete({ collection, id })
  }

  /**
   * Get global
   */
  async getGlobal(slug: string, userToken: string): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    return await payload.findGlobal({ slug })
  }

  /**
   * Update global
   */
  async updateGlobal(slug: string, data: any, userToken: string): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    return await payload.updateGlobal({ slug, data })
  }

  /**
   * Bulk operations
   */
  async bulkCreate(
    collection: string,
    docs: any[],
    userToken: string
  ): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    const results = []

    for (const data of docs) {
      const result = await payload.create({ collection, data })
      results.push(result)
    }

    return results
  }

  async bulkUpdate(
    collection: string,
    updates: Array<{ id: string; data: any }>,
    userToken: string
  ): Promise<any> {
    await this.validateAdmin(userToken)

    const payload = await this.getPayload()
    const results = []

    for (const { id, data } of updates) {
      const result = await payload.update({ collection, id, data })
      results.push(result)
    }

    return results
  }
}

// Export for Workers RPC
export default {
  fetch: () => new Response('Admin Worker - RPC only (no HTTP access)', { status: 403 }),
}
