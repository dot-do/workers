/**
 * ClusterManager Tests [RED Phase - TDD]
 *
 * Tests for k-means cluster assignment enabling R2 partition routing.
 * These tests define the expected behavior before implementation.
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
 * @see workers-c77ei - [RED] Cluster assignment for cold partitioning
 * @module cluster-manager.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ClusterManager,
  type Centroid,
  type ClusterAssignment,
  type ClusterStats,
  type ClusterConfig,
  DEFAULT_CLUSTER_CONFIG,
} from '../src/cluster-manager.js'
import { euclideanDistance, cosineSimilarity, type VectorInput } from '../src/vector-distance.js'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock vector with specified dimension
 */
function createMockVector(dimension: number, seed: number = 0): number[] {
  const vector: number[] = new Array(dimension)
  for (let i = 0; i < dimension; i++) {
    // Use a deterministic pseudo-random pattern based on seed
    vector[i] = Math.sin(seed * 0.1 + i * 0.01) * 0.5
  }
  return vector
}

/**
 * Create a normalized mock vector
 */
function createNormalizedVector(dimension: number, seed: number = 0): number[] {
  const vector = createMockVector(dimension, seed)
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  return vector.map((v) => v / magnitude)
}

/**
 * Create a vector near a given centroid (with small deterministic perturbation)
 */
function createVectorNearCentroid(centroid: number[], perturbation: number = 0.1, seed: number = 0): number[] {
  // Create a deterministic perturbation by scaling the vector slightly
  // and adding a small orthogonal component based on seed
  // This keeps the vector close to the original direction
  const scale = 1.0 + perturbation * Math.sin(seed)
  const perturbed = centroid.map((v, i) => {
    // Scale the vector and add a tiny orthogonal perturbation
    const ortho = Math.cos(seed + i * 0.01) * perturbation * 0.1
    return v * scale + ortho
  })
  // Normalize to keep the vector on the unit sphere (if the centroid was normalized)
  return normalize(perturbed)
}

/**
 * Normalize a vector to unit length
 */
function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return vector
  return vector.map((v) => v / magnitude)
}

// ============================================================================
// Type Definition Tests
// ============================================================================

describe('ClusterManager', () => {
  describe('Type Definitions', () => {
    it('should export Centroid type with required fields', () => {
      // A centroid represents the center of a cluster
      const centroid: Centroid = {
        id: 'cluster-0',
        vector: [0.1, 0.2, 0.3],
        dimension: 3,
        vectorCount: 100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(centroid.id).toBe('cluster-0')
      expect(centroid.vector).toHaveLength(3)
      expect(centroid.dimension).toBe(3)
      expect(centroid.vectorCount).toBe(100)
    })

    it('should export ClusterAssignment type with required fields', () => {
      // Assignment maps a vector ID to its cluster
      const assignment: ClusterAssignment = {
        vectorId: 'vec-123',
        clusterId: 'cluster-0',
        distance: 0.15,
        assignedAt: Date.now(),
      }

      expect(assignment.vectorId).toBe('vec-123')
      expect(assignment.clusterId).toBe('cluster-0')
      expect(assignment.distance).toBe(0.15)
    })

    it('should export ClusterStats type for load balancing', () => {
      // Stats help with load balancing across partitions
      const stats: ClusterStats = {
        clusterId: 'cluster-0',
        vectorCount: 1000,
        averageDistance: 0.25,
        minDistance: 0.05,
        maxDistance: 0.45,
        lastUpdated: Date.now(),
      }

      expect(stats.clusterId).toBe('cluster-0')
      expect(stats.vectorCount).toBe(1000)
      expect(stats.averageDistance).toBe(0.25)
    })

    it('should export ClusterConfig with sensible defaults', () => {
      expect(DEFAULT_CLUSTER_CONFIG).toBeDefined()
      expect(DEFAULT_CLUSTER_CONFIG.numClusters).toBeGreaterThan(0)
      expect(DEFAULT_CLUSTER_CONFIG.dimension).toBeGreaterThan(0)
      expect(DEFAULT_CLUSTER_CONFIG.distanceMetric).toBeDefined()
    })
  })

  // ============================================================================
  // Core Cluster Assignment Tests
  // ============================================================================

  describe('Cluster Assignment', () => {
    let manager: ClusterManager

    beforeEach(() => {
      manager = new ClusterManager({
        numClusters: 4,
        dimension: 256,
        distanceMetric: 'euclidean',
      })
    })

    describe('assignVector()', () => {
      it('should assign vector to nearest centroid', async () => {
        // Set up centroids at known positions
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: normalize(createMockVector(256, 0)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: normalize(createMockVector(256, 100)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-2', vector: normalize(createMockVector(256, 200)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-3', vector: normalize(createMockVector(256, 300)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        // Create a vector near cluster-1
        const vector = createVectorNearCentroid(centroids[1].vector, 0.05, 1)

        const assignment = await manager.assignVector('vec-123', vector)

        expect(assignment).toBeDefined()
        expect(assignment.vectorId).toBe('vec-123')
        expect(assignment.clusterId).toBe('cluster-1')
        expect(assignment.distance).toBeGreaterThanOrEqual(0)
      })

      it('should handle vectors equidistant from multiple centroids deterministically', async () => {
        // Edge case: when a vector is equidistant from multiple centroids,
        // the assignment should be deterministic (e.g., prefer lower cluster ID)
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: [1, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: [-1, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        const smallManager = new ClusterManager({ numClusters: 2, dimension: 3, distanceMetric: 'euclidean' })
        await smallManager.setCentroids(centroids)

        // Vector at origin is equidistant from both
        const vector = [0, 0, 0]

        const assignment1 = await smallManager.assignVector('vec-1', vector)
        const assignment2 = await smallManager.assignVector('vec-2', vector)

        // Should be deterministic
        expect(assignment1.clusterId).toBe(assignment2.clusterId)
      })

      it('should throw error when no centroids are set', async () => {
        const emptyManager = new ClusterManager({ numClusters: 4, dimension: 256, distanceMetric: 'euclidean' })
        const vector = createMockVector(256)

        await expect(emptyManager.assignVector('vec-123', vector)).rejects.toThrow()
      })

      it('should throw error for dimension mismatch', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]
        await manager.setCentroids(centroids)

        // Vector has wrong dimension
        const wrongDimVector = createMockVector(128)

        await expect(manager.assignVector('vec-123', wrongDimVector)).rejects.toThrow(/dimension/i)
      })
    })

    describe('assignVectorBatch()', () => {
      it('should assign multiple vectors efficiently', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: normalize(createMockVector(256, 0)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: normalize(createMockVector(256, 100)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-2', vector: normalize(createMockVector(256, 200)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-3', vector: normalize(createMockVector(256, 300)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        const vectors = [
          { id: 'vec-1', vector: createVectorNearCentroid(centroids[0].vector, 0.05, 0) },
          { id: 'vec-2', vector: createVectorNearCentroid(centroids[1].vector, 0.05, 1) },
          { id: 'vec-3', vector: createVectorNearCentroid(centroids[2].vector, 0.05, 2) },
          { id: 'vec-4', vector: createVectorNearCentroid(centroids[3].vector, 0.05, 3) },
        ]

        const assignments = await manager.assignVectorBatch(vectors)

        expect(assignments).toHaveLength(4)
        expect(assignments[0].clusterId).toBe('cluster-0')
        expect(assignments[1].clusterId).toBe('cluster-1')
        expect(assignments[2].clusterId).toBe('cluster-2')
        expect(assignments[3].clusterId).toBe('cluster-3')
      })

      it('should handle empty batch', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]
        await manager.setCentroids(centroids)

        const assignments = await manager.assignVectorBatch([])

        expect(assignments).toHaveLength(0)
      })
    })
  })

  // ============================================================================
  // Centroid Storage Tests
  // ============================================================================

  describe('Centroid Storage', () => {
    let manager: ClusterManager

    beforeEach(() => {
      manager = new ClusterManager({
        numClusters: 4,
        dimension: 256,
        distanceMetric: 'euclidean',
      })
    })

    describe('setCentroids()', () => {
      it('should store and retrieve centroids', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256, 0), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: createMockVector(256, 100), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        const retrieved = await manager.getCentroids()

        expect(retrieved).toHaveLength(2)
        expect(retrieved[0].id).toBe('cluster-0')
        expect(retrieved[1].id).toBe('cluster-1')
      })

      it('should validate centroid dimensions match config', async () => {
        const wrongDimCentroid: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(128), dimension: 128, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await expect(manager.setCentroids(wrongDimCentroid)).rejects.toThrow(/dimension/i)
      })

      it('should replace existing centroids', async () => {
        const oldCentroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256, 0), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        const newCentroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256, 999), dimension: 256, vectorCount: 200, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(oldCentroids)
        await manager.setCentroids(newCentroids)

        const retrieved = await manager.getCentroids()

        expect(retrieved).toHaveLength(1)
        expect(retrieved[0].vectorCount).toBe(200)
      })
    })

    describe('getCentroid()', () => {
      it('should retrieve a specific centroid by ID', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256, 0), dimension: 256, vectorCount: 50, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: createMockVector(256, 100), dimension: 256, vectorCount: 75, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        const centroid = await manager.getCentroid('cluster-1')

        expect(centroid).toBeDefined()
        expect(centroid?.id).toBe('cluster-1')
        expect(centroid?.vectorCount).toBe(75)
      })

      it('should return null for non-existent centroid', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        const centroid = await manager.getCentroid('cluster-999')

        expect(centroid).toBeNull()
      })
    })
  })

  // ============================================================================
  // Query Routing Tests
  // ============================================================================

  describe('Query Routing', () => {
    let manager: ClusterManager

    beforeEach(() => {
      manager = new ClusterManager({
        numClusters: 8,
        dimension: 256,
        distanceMetric: 'euclidean',
      })
    })

    describe('findNearestClusters()', () => {
      it('should find k-nearest clusters to query vector', async () => {
        // Set up 8 well-separated centroids
        const centroids: Centroid[] = Array.from({ length: 8 }, (_, i) => ({
          id: `cluster-${i}`,
          vector: normalize(createMockVector(256, i * 50)),
          dimension: 256,
          vectorCount: 100,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }))

        await manager.setCentroids(centroids)

        // Query vector near cluster-2
        const queryVector = createVectorNearCentroid(centroids[2].vector, 0.05, 2)

        const nearestClusters = await manager.findNearestClusters(queryVector, 3)

        expect(nearestClusters).toHaveLength(3)
        // Cluster-2 should be closest
        expect(nearestClusters[0].clusterId).toBe('cluster-2')
        // Should be sorted by distance (ascending)
        expect(nearestClusters[0].distance).toBeLessThanOrEqual(nearestClusters[1].distance)
        expect(nearestClusters[1].distance).toBeLessThanOrEqual(nearestClusters[2].distance)
      })

      it('should return all clusters if k > numClusters', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256, 0), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: createMockVector(256, 100), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        const smallManager = new ClusterManager({ numClusters: 2, dimension: 256, distanceMetric: 'euclidean' })
        await smallManager.setCentroids(centroids)

        const queryVector = createMockVector(256, 50)
        const nearestClusters = await smallManager.findNearestClusters(queryVector, 10)

        // Should return all 2 clusters, not error
        expect(nearestClusters).toHaveLength(2)
      })

      it('should throw error for dimension mismatch', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]
        await manager.setCentroids(centroids)

        const wrongDimQuery = createMockVector(128)

        await expect(manager.findNearestClusters(wrongDimQuery, 3)).rejects.toThrow(/dimension/i)
      })

      it('should support cosine distance metric', async () => {
        const cosineManager = new ClusterManager({
          numClusters: 4,
          dimension: 256,
          distanceMetric: 'cosine',
        })

        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: normalize(createMockVector(256, 0)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: normalize(createMockVector(256, 100)), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await cosineManager.setCentroids(centroids)

        const queryVector = normalize(createMockVector(256, 5)) // Near cluster-0
        const nearestClusters = await cosineManager.findNearestClusters(queryVector, 1)

        expect(nearestClusters).toHaveLength(1)
        expect(nearestClusters[0].clusterId).toBe('cluster-0')
      })
    })

    describe('getClusterPartitions()', () => {
      it('should return R2 partition keys for given cluster IDs', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: createMockVector(256), dimension: 256, vectorCount: 200, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        const partitions = await manager.getClusterPartitions(['cluster-0', 'cluster-1'])

        expect(partitions).toHaveLength(2)
        // Partitions should be R2 keys like 'vectors/cluster-0.parquet'
        expect(partitions[0]).toContain('cluster-0')
        expect(partitions[1]).toContain('cluster-1')
      })
    })
  })

  // ============================================================================
  // Centroid Updates / Rebalancing Tests
  // ============================================================================

  describe('Centroid Updates (Rebalancing)', () => {
    let manager: ClusterManager

    beforeEach(() => {
      manager = new ClusterManager({
        numClusters: 4,
        dimension: 256,
        distanceMetric: 'euclidean',
      })
    })

    describe('updateCentroid()', () => {
      it('should handle centroid updates (rebalancing)', async () => {
        const initialCentroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256, 0), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(initialCentroids)

        // Simulate rebalancing - centroid position shifts
        const newVector = createMockVector(256, 10) // Slightly different
        const updatedCentroid = await manager.updateCentroid('cluster-0', {
          vector: newVector,
          vectorCount: 150,
        })

        expect(updatedCentroid).toBeDefined()
        expect(updatedCentroid.vectorCount).toBe(150)
        expect(updatedCentroid.updatedAt).toBeGreaterThan(initialCentroids[0].updatedAt)
      })

      it('should throw error for non-existent centroid', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        await expect(
          manager.updateCentroid('cluster-999', { vectorCount: 100 })
        ).rejects.toThrow(/not found/i)
      })
    })

    describe('recomputeCentroid()', () => {
      it('should recompute centroid from member vectors', async () => {
        const initialCentroid: Centroid = {
          id: 'cluster-0',
          vector: createMockVector(256, 0),
          dimension: 256,
          vectorCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        await manager.setCentroids([initialCentroid])

        // Vectors that are members of this cluster
        const memberVectors = [
          createMockVector(256, 1),
          createMockVector(256, 2),
          createMockVector(256, 3),
        ]

        const newCentroid = await manager.recomputeCentroid('cluster-0', memberVectors)

        expect(newCentroid).toBeDefined()
        expect(newCentroid.vectorCount).toBe(3)
        // New centroid should be the mean of member vectors
        expect(newCentroid.vector).toHaveLength(256)
      })

      it('should handle empty member list', async () => {
        const initialCentroid: Centroid = {
          id: 'cluster-0',
          vector: createMockVector(256, 0),
          dimension: 256,
          vectorCount: 10,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        await manager.setCentroids([initialCentroid])

        // Empty cluster - centroid should remain unchanged
        const newCentroid = await manager.recomputeCentroid('cluster-0', [])

        expect(newCentroid).toBeDefined()
        expect(newCentroid.vectorCount).toBe(0)
        // Vector should remain unchanged when no members
        expect(newCentroid.vector).toEqual(initialCentroid.vector)
      })
    })
  })

  // ============================================================================
  // Cluster Size Tracking Tests
  // ============================================================================

  describe('Cluster Size Tracking', () => {
    let manager: ClusterManager

    beforeEach(() => {
      manager = new ClusterManager({
        numClusters: 4,
        dimension: 256,
        distanceMetric: 'euclidean',
      })
    })

    describe('getClusterStats()', () => {
      it('should track cluster sizes for load balancing', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256, 0), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: createMockVector(256, 100), dimension: 256, vectorCount: 500, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-2', vector: createMockVector(256, 200), dimension: 256, vectorCount: 200, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        const stats = await manager.getClusterStats()

        expect(stats).toHaveLength(3)
        expect(stats.find((s) => s.clusterId === 'cluster-0')?.vectorCount).toBe(100)
        expect(stats.find((s) => s.clusterId === 'cluster-1')?.vectorCount).toBe(500)
        expect(stats.find((s) => s.clusterId === 'cluster-2')?.vectorCount).toBe(200)
      })

      it('should identify unbalanced clusters', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 10, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: createMockVector(256), dimension: 256, vectorCount: 10000, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        const imbalanced = await manager.getImbalancedClusters(10) // threshold: 10x imbalance

        expect(imbalanced).toBeDefined()
        // cluster-1 has 1000x more vectors than cluster-0
        expect(imbalanced.length).toBeGreaterThan(0)
      })
    })

    describe('incrementClusterCount()', () => {
      it('should increment vector count for a cluster', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        await manager.incrementClusterCount('cluster-0', 5)

        const centroid = await manager.getCentroid('cluster-0')
        expect(centroid?.vectorCount).toBe(105)
      })

      it('should decrement vector count when negative delta', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        await manager.incrementClusterCount('cluster-0', -10)

        const centroid = await manager.getCentroid('cluster-0')
        expect(centroid?.vectorCount).toBe(90)
      })

      it('should not allow negative vector count', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: createMockVector(256), dimension: 256, vectorCount: 5, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        await manager.incrementClusterCount('cluster-0', -10)

        const centroid = await manager.getCentroid('cluster-0')
        // Should clamp to 0, not go negative
        expect(centroid?.vectorCount).toBe(0)
      })
    })
  })

  // ============================================================================
  // Incremental Cluster Assignment Tests
  // ============================================================================

  describe('Incremental Cluster Assignment', () => {
    let manager: ClusterManager

    beforeEach(() => {
      manager = new ClusterManager({
        numClusters: 4,
        dimension: 256,
        distanceMetric: 'euclidean',
      })
    })

    describe('assignVectorIncremental()', () => {
      it('should support incremental cluster assignment', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: normalize(createMockVector(256, 0)), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: normalize(createMockVector(256, 100)), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        // New vector arrives, assign and update counts
        const vector = createVectorNearCentroid(centroids[0].vector, 0.05, 0)
        const assignment = await manager.assignVectorIncremental('vec-new', vector)

        expect(assignment.clusterId).toBe('cluster-0')

        // Cluster count should be updated
        const centroid = await manager.getCentroid('cluster-0')
        expect(centroid?.vectorCount).toBe(101)
      })

      it('should update running centroid mean for incremental assignment', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: [1, 0, 0], dimension: 3, vectorCount: 1, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        const smallManager = new ClusterManager({
          numClusters: 1,
          dimension: 3,
          distanceMetric: 'euclidean',
          enableIncrementalCentroidUpdate: true,
        })

        await smallManager.setCentroids(centroids)

        // Add a vector that will shift the centroid
        const newVector = [0, 1, 0]
        await smallManager.assignVectorIncremental('vec-1', newVector)

        const updatedCentroid = await smallManager.getCentroid('cluster-0')

        // Centroid should be the mean of [1,0,0] and [0,1,0] = [0.5, 0.5, 0]
        expect(updatedCentroid?.vector[0]).toBeCloseTo(0.5, 5)
        expect(updatedCentroid?.vector[1]).toBeCloseTo(0.5, 5)
        expect(updatedCentroid?.vector[2]).toBeCloseTo(0, 5)
      })
    })

    describe('reassignVector()', () => {
      it('should reassign vector from one cluster to another', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: normalize(createMockVector(256, 0)), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: normalize(createMockVector(256, 100)), dimension: 256, vectorCount: 50, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        // Vector was in cluster-0, now should be in cluster-1
        const newPosition = createVectorNearCentroid(centroids[1].vector, 0.05, 1)
        const assignment = await manager.reassignVector('vec-moved', newPosition, 'cluster-0')

        expect(assignment.clusterId).toBe('cluster-1')

        // Old cluster count decreased
        const oldCluster = await manager.getCentroid('cluster-0')
        expect(oldCluster?.vectorCount).toBe(99)

        // New cluster count increased
        const newCluster = await manager.getCentroid('cluster-1')
        expect(newCluster?.vectorCount).toBe(51)
      })

      it('should return same assignment if vector stays in same cluster', async () => {
        const centroids: Centroid[] = [
          { id: 'cluster-0', vector: normalize(createMockVector(256, 0)), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'cluster-1', vector: normalize(createMockVector(256, 100)), dimension: 256, vectorCount: 50, createdAt: Date.now(), updatedAt: Date.now() },
        ]

        await manager.setCentroids(centroids)

        // Vector stays near cluster-0
        const samePosition = createVectorNearCentroid(centroids[0].vector, 0.05, 0)
        const assignment = await manager.reassignVector('vec-stay', samePosition, 'cluster-0')

        expect(assignment.clusterId).toBe('cluster-0')

        // Counts should remain unchanged
        const cluster0 = await manager.getCentroid('cluster-0')
        expect(cluster0?.vectorCount).toBe(100)
      })
    })
  })

  // ============================================================================
  // Distance Metric Tests
  // ============================================================================

  describe('Distance Metrics', () => {
    it('should support euclidean distance', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 3,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: [0, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cluster-1', vector: [10, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
      ]

      await manager.setCentroids(centroids)

      // Vector at [3, 0, 0] is closer to cluster-0 (distance 3) than cluster-1 (distance 7)
      const vector = [3, 0, 0]
      const assignment = await manager.assignVector('vec-1', vector)

      expect(assignment.clusterId).toBe('cluster-0')
      expect(assignment.distance).toBeCloseTo(3, 5)
    })

    it('should support cosine distance', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 3,
        distanceMetric: 'cosine',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: [1, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cluster-1', vector: [0, 1, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
      ]

      await manager.setCentroids(centroids)

      // Vector [0.9, 0.1, 0] is more similar to cluster-0
      const vector = normalize([0.9, 0.1, 0])
      const assignment = await manager.assignVector('vec-1', vector)

      expect(assignment.clusterId).toBe('cluster-0')
    })

    it('should support dot product distance for normalized vectors', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 3,
        distanceMetric: 'dotProduct',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: normalize([1, 1, 0]), dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cluster-1', vector: normalize([-1, 1, 0]), dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
      ]

      await manager.setCentroids(centroids)

      // Vector [1, 0.5, 0] normalized - higher dot product with cluster-0
      const vector = normalize([1, 0.5, 0])
      const assignment = await manager.assignVector('vec-1', vector)

      expect(assignment.clusterId).toBe('cluster-0')
    })
  })

  // ============================================================================
  // Serialization / Persistence Tests
  // ============================================================================

  describe('Serialization', () => {
    it('should serialize centroids to JSON', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 3,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: [1, 2, 3], dimension: 3, vectorCount: 100, createdAt: 1000, updatedAt: 2000 },
        { id: 'cluster-1', vector: [4, 5, 6], dimension: 3, vectorCount: 200, createdAt: 1000, updatedAt: 2000 },
      ]

      await manager.setCentroids(centroids)

      const serialized = await manager.serializeCentroids()

      expect(typeof serialized).toBe('string')

      const parsed = JSON.parse(serialized)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].id).toBe('cluster-0')
      expect(parsed[0].vector).toEqual([1, 2, 3])
    })

    it('should deserialize centroids from JSON', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 3,
        distanceMetric: 'euclidean',
      })

      const json = JSON.stringify([
        { id: 'cluster-0', vector: [1, 2, 3], dimension: 3, vectorCount: 100, createdAt: 1000, updatedAt: 2000 },
        { id: 'cluster-1', vector: [4, 5, 6], dimension: 3, vectorCount: 200, createdAt: 1000, updatedAt: 2000 },
      ])

      await manager.deserializeCentroids(json)

      const centroids = await manager.getCentroids()
      expect(centroids).toHaveLength(2)
      expect(centroids[0].vector).toEqual([1, 2, 3])
    })

    it('should serialize to binary format for efficient storage', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 256,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: createMockVector(256, 0), dimension: 256, vectorCount: 100, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cluster-1', vector: createMockVector(256, 100), dimension: 256, vectorCount: 200, createdAt: Date.now(), updatedAt: Date.now() },
      ]

      await manager.setCentroids(centroids)

      const binary = await manager.serializeCentroidsBinary()

      expect(binary).toBeInstanceOf(ArrayBuffer)
      // Binary should be more compact than JSON
      const jsonSize = (await manager.serializeCentroids()).length
      expect(binary.byteLength).toBeLessThan(jsonSize)
    })
  })

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should assign 1000 vectors in < 100ms', async () => {
      const manager = new ClusterManager({
        numClusters: 16,
        dimension: 256,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = Array.from({ length: 16 }, (_, i) => ({
        id: `cluster-${i}`,
        vector: createMockVector(256, i * 100),
        dimension: 256,
        vectorCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }))

      await manager.setCentroids(centroids)

      const vectors = Array.from({ length: 1000 }, (_, i) => ({
        id: `vec-${i}`,
        vector: createMockVector(256, i),
      }))

      const start = performance.now()
      await manager.assignVectorBatch(vectors)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })

    it('should find nearest clusters in < 1ms per query', async () => {
      const manager = new ClusterManager({
        numClusters: 64,
        dimension: 256,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = Array.from({ length: 64 }, (_, i) => ({
        id: `cluster-${i}`,
        vector: createMockVector(256, i * 50),
        dimension: 256,
        vectorCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }))

      await manager.setCentroids(centroids)

      const queryVector = createMockVector(256, 0)

      const iterations = 100
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        await manager.findNearestClusters(queryVector, 5)
      }
      const elapsed = performance.now() - start

      const avgTime = elapsed / iterations
      expect(avgTime).toBeLessThan(1)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle single cluster', async () => {
      const manager = new ClusterManager({
        numClusters: 1,
        dimension: 3,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: [0, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
      ]

      await manager.setCentroids(centroids)

      const vector = [10, 10, 10]
      const assignment = await manager.assignVector('vec-1', vector)

      expect(assignment.clusterId).toBe('cluster-0')
    })

    it('should handle high-dimensional vectors (768)', async () => {
      const manager = new ClusterManager({
        numClusters: 8,
        dimension: 768,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = Array.from({ length: 8 }, (_, i) => ({
        id: `cluster-${i}`,
        vector: createMockVector(768, i * 100),
        dimension: 768,
        vectorCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }))

      await manager.setCentroids(centroids)

      const vector = createMockVector(768, 0)
      const assignment = await manager.assignVector('vec-1', vector)

      expect(assignment).toBeDefined()
      expect(assignment.clusterId).toBe('cluster-0')
    })

    it('should handle zero vector gracefully', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 3,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: [1, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cluster-1', vector: [0, 1, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
      ]

      await manager.setCentroids(centroids)

      // Zero vector - equidistant from both (euclidean distance = 1)
      const zeroVector = [0, 0, 0]
      const assignment = await manager.assignVector('vec-zero', zeroVector)

      // Should still get an assignment (deterministic tie-breaking)
      expect(assignment).toBeDefined()
      expect(assignment.clusterId).toBeDefined()
    })

    it('should handle very small perturbations', async () => {
      const manager = new ClusterManager({
        numClusters: 2,
        dimension: 3,
        distanceMetric: 'euclidean',
      })

      const centroids: Centroid[] = [
        { id: 'cluster-0', vector: [1, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cluster-1', vector: [1 + 1e-10, 0, 0], dimension: 3, vectorCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
      ]

      await manager.setCentroids(centroids)

      const vector = [1, 0, 0]
      const assignment = await manager.assignVector('vec-1', vector)

      // Should assign to cluster-0 (exact match)
      expect(assignment.clusterId).toBe('cluster-0')
      expect(assignment.distance).toBeCloseTo(0, 10)
    })
  })
})
