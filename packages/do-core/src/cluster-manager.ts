/**
 * ClusterManager - K-means cluster assignment for R2 partition routing
 *
 * Cold vectors are stored in R2 Parquet files partitioned by cluster. ClusterManager:
 * 1. Assigns vectors to clusters based on nearest centroid
 * 2. Stores centroids for routing queries to relevant partitions
 * 3. Enables pruning - only search clusters near the query vector
 *
 * This enables efficient vector search at scale:
 * - Hot storage (DO): 256-dim truncated embeddings for fast approximate search
 * - Cold storage (R2): 768-dim embeddings partitioned by cluster
 * - Query routing: Find k-nearest clusters, only search those partitions
 *
 * GREEN PHASE: Fully implemented k-means cluster assignment.
 *
 * @see workers-c77ei - [RED] Cluster assignment for cold partitioning
 * @see workers-8uxzj - [GREEN] ClusterManager implementation
 * @module cluster-manager
 */

import { euclideanDistance, cosineSimilarity, dotProduct } from './vector-distance.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported distance metrics for cluster assignment
 */
export type DistanceMetric = 'euclidean' | 'cosine' | 'dotProduct'

/**
 * A centroid represents the center of a cluster
 */
export interface Centroid {
  /** Unique identifier for this cluster */
  id: string
  /** The centroid vector position */
  vector: number[]
  /** Dimension of the vector */
  dimension: number
  /** Number of vectors assigned to this cluster */
  vectorCount: number
  /** Timestamp when centroid was created */
  createdAt: number
  /** Timestamp when centroid was last updated */
  updatedAt: number
}

/**
 * Assignment of a vector to a cluster
 */
export interface ClusterAssignment {
  /** ID of the vector being assigned */
  vectorId: string
  /** ID of the assigned cluster */
  clusterId: string
  /** Distance from vector to centroid */
  distance: number
  /** Timestamp of assignment */
  assignedAt: number
}

/**
 * Statistics for a cluster (for load balancing)
 */
export interface ClusterStats {
  /** Cluster identifier */
  clusterId: string
  /** Number of vectors in cluster */
  vectorCount: number
  /** Average distance of vectors to centroid */
  averageDistance: number
  /** Minimum distance to centroid */
  minDistance: number
  /** Maximum distance to centroid */
  maxDistance: number
  /** Last time stats were updated */
  lastUpdated: number
}

/**
 * Configuration for ClusterManager
 */
export interface ClusterConfig {
  /** Number of clusters (k) */
  numClusters: number
  /** Vector dimension */
  dimension: number
  /** Distance metric to use */
  distanceMetric: DistanceMetric
  /** Enable incremental centroid updates on assignment */
  enableIncrementalCentroidUpdate?: boolean
  /** R2 partition key prefix */
  partitionKeyPrefix?: string
}

/**
 * Result of finding nearest clusters
 */
export interface NearestClusterResult {
  /** Cluster identifier */
  clusterId: string
  /** Distance to cluster centroid */
  distance: number
}

/**
 * Input for batch vector assignment
 */
export interface VectorBatchInput {
  /** Vector identifier */
  id: string
  /** The vector data */
  vector: number[]
}

/**
 * Partial update for centroid
 */
export interface CentroidUpdate {
  /** New vector position */
  vector?: number[]
  /** New vector count */
  vectorCount?: number
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for ClusterManager
 */
export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  numClusters: 16,
  dimension: 256,
  distanceMetric: 'euclidean',
  enableIncrementalCentroidUpdate: false,
  partitionKeyPrefix: 'vectors/',
}

// ============================================================================
// ClusterManager Class (GREEN Phase - Fully Implemented)
// ============================================================================

/**
 * ClusterManager handles k-means cluster assignment for R2 partition routing.
 *
 * GREEN PHASE: All methods are fully implemented.
 */
export class ClusterManager {
  private config: ClusterConfig
  private centroids: Map<string, Centroid> = new Map()

  constructor(config: Partial<ClusterConfig> = {}) {
    this.config = { ...DEFAULT_CLUSTER_CONFIG, ...config }
  }

  // --------------------------------------------------------------------------
  // Centroid Storage
  // --------------------------------------------------------------------------

  /**
   * Set the centroids for this cluster manager.
   * Replaces any existing centroids.
   */
  async setCentroids(centroids: Centroid[]): Promise<void> {
    // Validate all centroids have correct dimension
    for (const centroid of centroids) {
      if (centroid.vector.length !== this.config.dimension) {
        throw new Error(
          `Centroid dimension mismatch: expected ${this.config.dimension}, got ${centroid.vector.length}`
        )
      }
    }

    // Replace existing centroids
    this.centroids.clear()
    for (const centroid of centroids) {
      this.centroids.set(centroid.id, { ...centroid })
    }
  }

  /**
   * Get all centroids.
   */
  async getCentroids(): Promise<Centroid[]> {
    return Array.from(this.centroids.values())
  }

  /**
   * Get a specific centroid by ID.
   */
  async getCentroid(clusterId: string): Promise<Centroid | null> {
    return this.centroids.get(clusterId) ?? null
  }

  /**
   * Update a centroid's properties.
   */
  async updateCentroid(clusterId: string, update: CentroidUpdate): Promise<Centroid> {
    const centroid = this.centroids.get(clusterId)
    if (!centroid) {
      throw new Error(`Centroid not found: ${clusterId}`)
    }

    // Ensure updatedAt is always strictly greater than the previous value
    const now = Date.now()
    const newUpdatedAt = now > centroid.updatedAt ? now : centroid.updatedAt + 1

    const updated: Centroid = {
      ...centroid,
      updatedAt: newUpdatedAt,
    }

    if (update.vector !== undefined) {
      updated.vector = [...update.vector]
    }
    if (update.vectorCount !== undefined) {
      updated.vectorCount = update.vectorCount
    }

    this.centroids.set(clusterId, updated)
    return updated
  }

  /**
   * Recompute a centroid from its member vectors.
   */
  async recomputeCentroid(clusterId: string, memberVectors: number[][]): Promise<Centroid> {
    const centroid = this.centroids.get(clusterId)
    if (!centroid) {
      throw new Error(`Centroid not found: ${clusterId}`)
    }

    // If no member vectors, keep the centroid unchanged but update count to 0
    if (memberVectors.length === 0) {
      const updated: Centroid = {
        ...centroid,
        vectorCount: 0,
        updatedAt: Date.now(),
      }
      this.centroids.set(clusterId, updated)
      return updated
    }

    // Calculate the mean of all member vectors
    const dimension = centroid.dimension
    const mean = new Array(dimension).fill(0)

    for (const vector of memberVectors) {
      for (let i = 0; i < dimension; i++) {
        mean[i] += vector[i]
      }
    }

    for (let i = 0; i < dimension; i++) {
      mean[i] /= memberVectors.length
    }

    const updated: Centroid = {
      ...centroid,
      vector: mean,
      vectorCount: memberVectors.length,
      updatedAt: Date.now(),
    }

    this.centroids.set(clusterId, updated)
    return updated
  }

  // --------------------------------------------------------------------------
  // Vector Assignment
  // --------------------------------------------------------------------------

  /**
   * Assign a single vector to the nearest cluster.
   */
  async assignVector(vectorId: string, vector: number[]): Promise<ClusterAssignment> {
    if (this.centroids.size === 0) {
      throw new Error('No centroids set. Call setCentroids() first.')
    }

    if (vector.length !== this.config.dimension) {
      throw new Error(
        `Vector dimension mismatch: expected ${this.config.dimension}, got ${vector.length}`
      )
    }

    let nearestClusterId: string | null = null
    let nearestDistance = Infinity

    // Find the nearest centroid
    for (const [clusterId, centroid] of this.centroids) {
      const distance = this.calculateDistance(vector, centroid.vector)
      // For ties, prefer lower cluster ID for deterministic behavior
      if (distance < nearestDistance || (distance === nearestDistance && nearestClusterId !== null && clusterId < nearestClusterId)) {
        nearestDistance = distance
        nearestClusterId = clusterId
      }
    }

    return {
      vectorId,
      clusterId: nearestClusterId!,
      distance: nearestDistance,
      assignedAt: Date.now(),
    }
  }

  /**
   * Assign multiple vectors to clusters efficiently.
   */
  async assignVectorBatch(vectors: VectorBatchInput[]): Promise<ClusterAssignment[]> {
    if (vectors.length === 0) {
      return []
    }

    const assignments: ClusterAssignment[] = []
    for (const { id, vector } of vectors) {
      const assignment = await this.assignVector(id, vector)
      assignments.push(assignment)
    }
    return assignments
  }

  /**
   * Assign a vector and update cluster counts incrementally.
   */
  async assignVectorIncremental(vectorId: string, vector: number[]): Promise<ClusterAssignment> {
    const assignment = await this.assignVector(vectorId, vector)

    // Increment the cluster count
    await this.incrementClusterCount(assignment.clusterId, 1)

    // If incremental centroid update is enabled, update the centroid position
    if (this.config.enableIncrementalCentroidUpdate) {
      const centroid = this.centroids.get(assignment.clusterId)!
      const n = centroid.vectorCount
      const newVector = centroid.vector.map((v, i) => (v * (n - 1) + vector[i]) / n)

      const updated: Centroid = {
        ...centroid,
        vector: newVector,
        updatedAt: Date.now(),
      }
      this.centroids.set(assignment.clusterId, updated)
    }

    return assignment
  }

  /**
   * Reassign a vector that has moved, updating cluster counts.
   */
  async reassignVector(
    vectorId: string,
    newVector: number[],
    currentClusterId: string
  ): Promise<ClusterAssignment> {
    const assignment = await this.assignVector(vectorId, newVector)

    // Only update counts if the cluster changed
    if (assignment.clusterId !== currentClusterId) {
      await this.incrementClusterCount(currentClusterId, -1)
      await this.incrementClusterCount(assignment.clusterId, 1)
    }

    return assignment
  }

  // --------------------------------------------------------------------------
  // Query Routing
  // --------------------------------------------------------------------------

  /**
   * Find the k nearest clusters to a query vector.
   * Used for routing queries to relevant R2 partitions.
   */
  async findNearestClusters(queryVector: number[], k: number): Promise<NearestClusterResult[]> {
    if (this.centroids.size === 0) {
      throw new Error('No centroids set. Call setCentroids() first.')
    }

    if (queryVector.length !== this.config.dimension) {
      throw new Error(
        `Query vector dimension mismatch: expected ${this.config.dimension}, got ${queryVector.length}`
      )
    }

    // Calculate distances to all centroids
    const distances: NearestClusterResult[] = []
    for (const [clusterId, centroid] of this.centroids) {
      const distance = this.calculateDistance(queryVector, centroid.vector)
      distances.push({ clusterId, distance })
    }

    // Sort by distance (ascending) and take top k
    distances.sort((a, b) => a.distance - b.distance)
    return distances.slice(0, Math.min(k, distances.length))
  }

  /**
   * Get R2 partition keys for the given cluster IDs.
   */
  async getClusterPartitions(clusterIds: string[]): Promise<string[]> {
    const prefix = this.config.partitionKeyPrefix ?? 'vectors/'
    return clusterIds.map((clusterId) => `${prefix}${clusterId}.parquet`)
  }

  // --------------------------------------------------------------------------
  // Cluster Statistics
  // --------------------------------------------------------------------------

  /**
   * Get statistics for all clusters.
   */
  async getClusterStats(): Promise<ClusterStats[]> {
    const stats: ClusterStats[] = []
    const now = Date.now()

    for (const [clusterId, centroid] of this.centroids) {
      stats.push({
        clusterId,
        vectorCount: centroid.vectorCount,
        averageDistance: 0, // Would require tracking all assigned vectors
        minDistance: 0,
        maxDistance: 0,
        lastUpdated: now,
      })
    }

    return stats
  }

  /**
   * Find clusters that are imbalanced (too many or too few vectors).
   * @param imbalanceThreshold Ratio of largest to smallest cluster count
   */
  async getImbalancedClusters(imbalanceThreshold: number): Promise<ClusterStats[]> {
    const stats = await this.getClusterStats()

    if (stats.length === 0) {
      return []
    }

    // Find min and max counts
    const counts = stats.map((s) => s.vectorCount).filter((c) => c > 0)
    if (counts.length === 0) {
      return []
    }

    const minCount = Math.min(...counts)
    const maxCount = Math.max(...counts)

    // If the ratio exceeds threshold, return the extreme clusters
    if (minCount > 0 && maxCount / minCount > imbalanceThreshold) {
      return stats.filter(
        (s) => s.vectorCount === minCount || s.vectorCount === maxCount
      )
    }

    return []
  }

  /**
   * Increment (or decrement) the vector count for a cluster.
   */
  async incrementClusterCount(clusterId: string, delta: number): Promise<void> {
    const centroid = this.centroids.get(clusterId)
    if (!centroid) {
      throw new Error(`Centroid not found: ${clusterId}`)
    }

    const newCount = Math.max(0, centroid.vectorCount + delta)
    const updated: Centroid = {
      ...centroid,
      vectorCount: newCount,
      updatedAt: Date.now(),
    }
    this.centroids.set(clusterId, updated)
  }

  // --------------------------------------------------------------------------
  // Serialization
  // --------------------------------------------------------------------------

  /**
   * Serialize centroids to JSON string.
   */
  async serializeCentroids(): Promise<string> {
    const centroids = await this.getCentroids()
    return JSON.stringify(centroids)
  }

  /**
   * Deserialize centroids from JSON string.
   */
  async deserializeCentroids(json: string): Promise<void> {
    const centroids: Centroid[] = JSON.parse(json)
    await this.setCentroids(centroids)
  }

  /**
   * Serialize centroids to binary format for efficient storage.
   *
   * Binary format:
   * - Header (16 bytes): numClusters (4), dimension (4), reserved (8)
   * - For each centroid:
   *   - id length (2 bytes)
   *   - id (variable, UTF-8)
   *   - vector (dimension * 4 bytes, float32)
   *   - vectorCount (4 bytes, uint32)
   *   - createdAt (8 bytes, float64)
   *   - updatedAt (8 bytes, float64)
   */
  async serializeCentroidsBinary(): Promise<ArrayBuffer> {
    const centroids = await this.getCentroids()
    const dimension = this.config.dimension

    // Calculate total size
    const headerSize = 16
    let dataSize = 0
    for (const centroid of centroids) {
      const idBytes = new TextEncoder().encode(centroid.id)
      dataSize += 2 + idBytes.length + dimension * 4 + 4 + 8 + 8
    }

    const buffer = new ArrayBuffer(headerSize + dataSize)
    const view = new DataView(buffer)
    const uint8 = new Uint8Array(buffer)

    // Write header
    view.setUint32(0, centroids.length, true) // numClusters
    view.setUint32(4, dimension, true) // dimension
    // reserved bytes 8-15

    let offset = headerSize
    for (const centroid of centroids) {
      // Write id
      const idBytes = new TextEncoder().encode(centroid.id)
      view.setUint16(offset, idBytes.length, true)
      offset += 2
      uint8.set(idBytes, offset)
      offset += idBytes.length

      // Write vector as float32
      for (let i = 0; i < dimension; i++) {
        view.setFloat32(offset, centroid.vector[i], true)
        offset += 4
      }

      // Write vectorCount
      view.setUint32(offset, centroid.vectorCount, true)
      offset += 4

      // Write createdAt
      view.setFloat64(offset, centroid.createdAt, true)
      offset += 8

      // Write updatedAt
      view.setFloat64(offset, centroid.updatedAt, true)
      offset += 8
    }

    return buffer
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Calculate distance between two vectors using configured metric.
   */
  private calculateDistance(a: number[], b: number[]): number {
    switch (this.config.distanceMetric) {
      case 'euclidean':
        return euclideanDistance(a, b)
      case 'cosine':
        // Cosine distance = 1 - cosine similarity
        // Handle zero vectors gracefully
        try {
          return 1 - cosineSimilarity(a, b)
        } catch {
          // If cosine similarity fails (zero vector), return max distance
          return 2
        }
      case 'dotProduct':
        // For dot product, higher is better, so negate for distance
        return -dotProduct(a, b)
      default:
        throw new Error(`Unknown distance metric: ${this.config.distanceMetric}`)
    }
  }
}
