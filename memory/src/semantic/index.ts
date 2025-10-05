/**
 * Semantic Memory System - Vector search over memories
 *
 * Features:
 * - Semantic search (find similar memories)
 * - Memory clustering (group related concepts)
 * - Cross-session retrieval
 * - Relevance ranking
 */

import type { Env, Memory, SemanticSearchResult, MemoryQuery } from '../types'

export class SemanticMemory {
  constructor(private env: Env) {}

  /**
   * Search memories semantically
   */
  async search(query: MemoryQuery): Promise<SemanticSearchResult[]> {
    const { query: queryText, sessionId, type, timeRange, limit = 10, minImportance = 0 } = query

    // Generate query embedding
    const embedding = await this.generateEmbedding(queryText)

    // Build filter
    const filter: any = {}
    if (sessionId) filter.sessionId = sessionId
    if (type) filter.type = type

    // Search Vectorize
    const results = await this.env.VECTORIZE.query(embedding, {
      topK: limit * 2, // Over-fetch for filtering
      filter,
      returnMetadata: true
    })

    // Filter and rank results
    const memories: SemanticSearchResult[] = results.matches
      .filter(match => {
        const timestamp = match.metadata.timestamp
        const importance = match.metadata.importance || 0

        // Apply time range filter
        if (timeRange && (timestamp < timeRange.start || timestamp > timeRange.end)) {
          return false
        }

        // Apply importance filter
        if (importance < minImportance) {
          return false
        }

        return true
      })
      .map(match => ({
        memory: match.metadata as Memory,
        similarity: match.score,
        relevance: this.calculateRelevance(
          match.score,
          match.metadata.timestamp,
          match.metadata.importance || 0.5,
          match.metadata.accessCount || 0
        )
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)

    // Update access stats
    await this.updateAccessStats(memories.map(m => m.memory.id))

    return memories
  }

  /**
   * Find similar memories to a given memory
   */
  async findSimilar(memoryId: string, limit: number = 5): Promise<SemanticSearchResult[]> {
    // Get the memory
    const memory = await this.getMemory(memoryId)
    if (!memory) {
      throw new Error(`Memory ${memoryId} not found`)
    }

    // Search using the memory's embedding
    const results = await this.env.VECTORIZE.query(memory.embedding!, {
      topK: limit + 1, // +1 to exclude self
      filter: {
        sessionId: memory.sessionId
      }
    })

    // Filter out self and map to results
    return results.matches
      .filter(match => match.id !== memoryId)
      .slice(0, limit)
      .map(match => ({
        memory: match.metadata as Memory,
        similarity: match.score,
        relevance: match.score // For similar memories, similarity is relevance
      }))
  }

  /**
   * Cluster memories by semantic similarity
   */
  async clusterMemories(sessionId: string, numClusters: number = 5): Promise<Map<number, Memory[]>> {
    // Get all memories for session
    const memories = await this.getSessionMemories(sessionId)

    if (memories.length === 0) {
      return new Map()
    }

    // Simple k-means clustering on embeddings
    const clusters = this.kMeansClustering(
      memories.map(m => m.embedding!),
      numClusters
    )

    // Group memories by cluster
    const clusterMap = new Map<number, Memory[]>()
    clusters.forEach((clusterId, idx) => {
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, [])
      }
      clusterMap.get(clusterId)!.push(memories[idx])
    })

    return clusterMap
  }

  /**
   * Get memories by entity
   */
  async getMemoriesByEntity(entityId: string, limit: number = 20): Promise<Memory[]> {
    // Query D1 for memories containing this entity
    const results = await this.env.DB.prepare(`
      SELECT m.* FROM memories m
      JOIN memory_entities me ON m.id = me.memory_id
      WHERE me.entity_id = ?
      ORDER BY m.timestamp DESC
      LIMIT ?
    `).bind(entityId, limit).all()

    return results.results as Memory[]
  }

  /**
   * Get memories by time period
   */
  async getMemoriesByTimePeriod(sessionId: string, start: number, end: number): Promise<Memory[]> {
    const results = await this.env.DB.prepare(`
      SELECT * FROM memories
      WHERE session_id = ?
        AND timestamp >= ?
        AND timestamp <= ?
      ORDER BY timestamp DESC
    `).bind(sessionId, start, end).all()

    return results.results as Memory[]
  }

  /**
   * Get memory importance distribution
   */
  async getImportanceDistribution(sessionId: string): Promise<Map<string, number>> {
    const results = await this.env.DB.prepare(`
      SELECT
        CASE
          WHEN importance >= 0.8 THEN 'critical'
          WHEN importance >= 0.6 THEN 'high'
          WHEN importance >= 0.4 THEN 'medium'
          WHEN importance >= 0.2 THEN 'low'
          ELSE 'trivial'
        END as category,
        COUNT(*) as count
      FROM memories
      WHERE session_id = ?
      GROUP BY category
    `).bind(sessionId).all()

    const distribution = new Map<string, number>()
    results.results.forEach((row: any) => {
      distribution.set(row.category, row.count)
    })

    return distribution
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(
    similarity: number,
    timestamp: number,
    importance: number,
    accessCount: number
  ): number {
    // Recency decay (exponential over 30 days)
    const ageMs = Date.now() - timestamp
    const recencyScore = Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 30))

    // Access frequency boost (logarithmic)
    const accessScore = Math.log10(accessCount + 1) / 3 // Max ~0.33

    // Weighted combination
    return (
      similarity * 0.4 +
      importance * 0.3 +
      recencyScore * 0.2 +
      accessScore * 0.1
    )
  }

  /**
   * Generate embedding using Workers AI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.env.AI.run(this.env.EMBEDDING_MODEL, {
      text: [text]
    })
    return response.data[0]
  }

  /**
   * Get memory by ID
   */
  private async getMemory(memoryId: string): Promise<Memory | null> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM memories WHERE id = ?'
    ).bind(memoryId).first()

    if (!result) return null

    // Get embedding from Vectorize
    const vectorResult = await this.env.VECTORIZE.getByIds([memoryId])
    const embedding = vectorResult.length > 0 ? vectorResult[0].values : undefined

    return {
      ...result,
      embedding
    } as Memory
  }

  /**
   * Get all memories for a session
   */
  private async getSessionMemories(sessionId: string): Promise<Memory[]> {
    const results = await this.env.DB.prepare(
      'SELECT * FROM memories WHERE session_id = ? ORDER BY timestamp DESC'
    ).bind(sessionId).all()

    // Get embeddings from Vectorize
    const ids = results.results.map((r: any) => r.id)
    const vectors = await this.env.VECTORIZE.getByIds(ids)

    const vectorMap = new Map(vectors.map(v => [v.id, v.values]))

    return results.results.map((r: any) => ({
      ...r,
      embedding: vectorMap.get(r.id)
    })) as Memory[]
  }

  /**
   * Update access statistics
   */
  private async updateAccessStats(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return

    const now = Date.now()

    // Batch update in D1
    const updates = memoryIds.map(id =>
      this.env.DB.prepare(`
        UPDATE memories
        SET access_count = access_count + 1,
            last_accessed = ?
        WHERE id = ?
      `).bind(now, id)
    )

    await this.env.DB.batch(updates)
  }

  /**
   * Simple k-means clustering
   */
  private kMeansClustering(vectors: number[][], k: number, maxIterations: number = 10): number[] {
    if (vectors.length === 0) return []
    if (vectors.length <= k) {
      return vectors.map((_, i) => i)
    }

    const n = vectors.length
    const dim = vectors[0].length

    // Initialize centroids randomly
    const centroids: number[][] = []
    const shuffled = [...Array(n)].map((_, i) => i).sort(() => Math.random() - 0.5)
    for (let i = 0; i < k; i++) {
      centroids.push([...vectors[shuffled[i]]])
    }

    let assignments = new Array(n).fill(0)

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign each vector to nearest centroid
      const newAssignments = vectors.map(vec => {
        let minDist = Infinity
        let minIdx = 0

        for (let j = 0; j < k; j++) {
          const dist = this.euclideanDistance(vec, centroids[j])
          if (dist < minDist) {
            minDist = dist
            minIdx = j
          }
        }

        return minIdx
      })

      // Check convergence
      if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) {
        break
      }

      assignments = newAssignments

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterVectors = vectors.filter((_, i) => assignments[i] === j)
        if (clusterVectors.length > 0) {
          centroids[j] = this.meanVector(clusterVectors)
        }
      }
    }

    return assignments
  }

  /**
   * Calculate euclidean distance between vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    )
  }

  /**
   * Calculate mean of vectors
   */
  private meanVector(vectors: number[][]): number[] {
    const n = vectors.length
    const dim = vectors[0].length
    const mean = new Array(dim).fill(0)

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        mean[i] += vec[i]
      }
    }

    return mean.map(v => v / n)
  }
}
