/**
 * Cold Vector Search Tests [RED Phase - TDD]
 *
 * Tests for searching vectors stored in R2 Parquet files partitioned by cluster.
 * These tests define the expected behavior before implementation.
 *
 * Cold storage architecture:
 * 1. Vectors are partitioned by cluster ID in R2
 * 2. Stored as Parquet files with full 768-dim embeddings
 * 3. Searched by first identifying relevant clusters, then fetching/scanning those partitions
 *
 * Two-phase search pattern:
 * - Phase 1: Hot search with 256-dim embeddings in DO (fast approximate)
 * - Phase 2: Cold search with 768-dim embeddings from R2 (full precision reranking)
 *
 * @see workers-xrv3q - [RED] Cold vector search from R2 partitions
 * @module cold-vector-search.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ColdVectorSearch,
  type ColdSearchOptions,
  type ColdSearchResult,
  type ClusterIndex,
  type PartitionMetadata,
  type R2StorageAdapter,
  type VectorEntry,
  type SearchTier,
  type MergedSearchResult,
  identifyRelevantClusters,
  fetchPartition,
  searchWithinPartition,
  mergeSearchResults,
  combineTieredResults,
  DEFAULT_SEARCH_CONFIG,
} from '../src/cold-vector-search.js'
import { cosineSimilarity, truncateAndNormalize } from '../src/mrl.js'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock R2 storage adapter for testing
 */
function createMockR2Adapter(): R2StorageAdapter & {
  _requests: Array<{ method: string; key: string }>
  _partitions: Map<string, { vectors: VectorEntry[]; metadata: PartitionMetadata }>
} {
  const requests: Array<{ method: string; key: string }> = []
  const partitions = new Map<string, { vectors: VectorEntry[]; metadata: PartitionMetadata }>()

  return {
    _requests: requests,
    _partitions: partitions,

    async get(key: string): Promise<ArrayBuffer | null> {
      requests.push({ method: 'get', key })
      const partition = partitions.get(key)
      if (!partition) return null
      // Return mock Parquet data (in real impl, this would be actual Parquet bytes)
      return new ArrayBuffer(0)
    },

    async head(key: string): Promise<PartitionMetadata | null> {
      requests.push({ method: 'head', key })
      const partition = partitions.get(key)
      if (!partition) return null
      return partition.metadata
    },

    async list(prefix: string): Promise<string[]> {
      requests.push({ method: 'list', key: prefix })
      const keys: string[] = []
      for (const key of partitions.keys()) {
        if (key.startsWith(prefix)) {
          keys.push(key)
        }
      }
      return keys
    },
  }
}

/**
 * Create a mock 768-dimensional embedding (cold storage format)
 */
function createMockEmbedding768(seed?: number): Float32Array {
  const embedding = new Float32Array(768)
  const baseSeed = seed ?? Math.random() * 1000
  for (let i = 0; i < 768; i++) {
    // Deterministic pseudo-random based on seed
    embedding[i] = Math.sin(baseSeed + i * 0.1) * 2 - 1
  }
  return embedding
}

/**
 * Create a mock 256-dimensional embedding (hot storage format)
 */
function createMockEmbedding256(seed?: number): Float32Array {
  const embedding768 = createMockEmbedding768(seed)
  const truncated = truncateAndNormalize(Array.from(embedding768), 256)
  return new Float32Array(truncated)
}

/**
 * Create a mock cluster index with centroid vectors
 */
function createMockClusterIndex(clusterCount: number): ClusterIndex {
  const clusters: Array<{
    clusterId: string
    centroid: Float32Array
    vectorCount: number
    partitionKey: string
  }> = []

  for (let i = 0; i < clusterCount; i++) {
    clusters.push({
      clusterId: `cluster-${i}`,
      centroid: createMockEmbedding768(i * 100),
      vectorCount: 100 + i * 10,
      partitionKey: `partitions/cluster-${i}.parquet`,
    })
  }

  return {
    version: 1,
    clusterCount,
    totalVectors: clusters.reduce((sum, c) => sum + c.vectorCount, 0),
    clusters,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/**
 * Create a mock vector entry as stored in cold storage
 */
function createMockVectorEntry(id: string, embedding?: Float32Array): VectorEntry {
  return {
    id,
    embedding: embedding ?? createMockEmbedding768(),
    sourceTable: 'things',
    sourceRowid: parseInt(id.split('-')[1] ?? '0', 10),
    metadata: {
      ns: 'default',
      type: 'document',
      textContent: `Content for ${id}`,
    },
  }
}

// ============================================================================
// Type Definition Tests
// ============================================================================

describe('ColdVectorSearch Types', () => {
  describe('ColdSearchOptions', () => {
    it('should define required query embedding', () => {
      const options: ColdSearchOptions = {
        queryEmbedding: createMockEmbedding768(),
        limit: 10,
      }

      expect(options.queryEmbedding).toBeInstanceOf(Float32Array)
      expect(options.queryEmbedding.length).toBe(768)
    })

    it('should support optional namespace and type filters', () => {
      const options: ColdSearchOptions = {
        queryEmbedding: createMockEmbedding768(),
        limit: 10,
        ns: 'myapp',
        type: 'document',
      }

      expect(options.ns).toBe('myapp')
      expect(options.type).toBe('document')
    })

    it('should support cluster selection parameters', () => {
      const options: ColdSearchOptions = {
        queryEmbedding: createMockEmbedding768(),
        limit: 10,
        maxClusters: 5,
        clusterSimilarityThreshold: 0.7,
      }

      expect(options.maxClusters).toBe(5)
      expect(options.clusterSimilarityThreshold).toBe(0.7)
    })

    it('should support hot/cold tier combination options', () => {
      const options: ColdSearchOptions = {
        queryEmbedding: createMockEmbedding768(),
        limit: 10,
        includeCold: true,
        hotResults: [], // Results from hot storage to merge
      }

      expect(options.includeCold).toBe(true)
      expect(options.hotResults).toBeDefined()
    })
  })

  describe('ColdSearchResult', () => {
    it('should include similarity score and vector entry', () => {
      const result: ColdSearchResult = {
        id: 'vec-123',
        similarity: 0.95,
        entry: createMockVectorEntry('vec-123'),
        tier: 'cold',
        clusterId: 'cluster-0',
      }

      expect(result.similarity).toBeGreaterThanOrEqual(-1)
      expect(result.similarity).toBeLessThanOrEqual(1)
      expect(result.tier).toBe('cold')
    })

    it('should track which cluster the result came from', () => {
      const result: ColdSearchResult = {
        id: 'vec-456',
        similarity: 0.88,
        entry: createMockVectorEntry('vec-456'),
        tier: 'cold',
        clusterId: 'cluster-3',
      }

      expect(result.clusterId).toBe('cluster-3')
    })
  })

  describe('ClusterIndex', () => {
    it('should contain cluster centroids for routing', () => {
      const index = createMockClusterIndex(5)

      expect(index.clusterCount).toBe(5)
      expect(index.clusters).toHaveLength(5)
      expect(index.clusters[0]?.centroid).toBeInstanceOf(Float32Array)
      expect(index.clusters[0]?.centroid.length).toBe(768)
    })

    it('should track partition keys for R2 access', () => {
      const index = createMockClusterIndex(3)

      for (const cluster of index.clusters) {
        expect(cluster.partitionKey).toContain('partitions/')
        expect(cluster.partitionKey).toContain('.parquet')
      }
    })

    it('should track vector counts per cluster', () => {
      const index = createMockClusterIndex(3)

      expect(index.totalVectors).toBeGreaterThan(0)
      for (const cluster of index.clusters) {
        expect(cluster.vectorCount).toBeGreaterThan(0)
      }
    })
  })

  describe('PartitionMetadata', () => {
    it('should define expected partition structure', () => {
      const metadata: PartitionMetadata = {
        clusterId: 'cluster-0',
        vectorCount: 150,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 1024 * 100, // 100KB
        createdAt: Date.now(),
      }

      expect(metadata.dimensionality).toBe(768)
      expect(metadata.compressionType).toBe('snappy')
    })
  })
})

// ============================================================================
// Cluster Identification Tests
// ============================================================================

describe('identifyRelevantClusters()', () => {
  it('should identify relevant R2 partitions from query', () => {
    const clusterIndex = createMockClusterIndex(10)
    const queryEmbedding = createMockEmbedding768(0) // Same seed as cluster-0

    const relevantClusters = identifyRelevantClusters(queryEmbedding, clusterIndex, {
      maxClusters: 3,
    })

    expect(relevantClusters).toBeDefined()
    expect(Array.isArray(relevantClusters)).toBe(true)
    expect(relevantClusters.length).toBeLessThanOrEqual(3)
    // Cluster-0 should be most similar since query has same seed
    expect(relevantClusters[0]?.clusterId).toBe('cluster-0')
  })

  it('should rank clusters by similarity to query', () => {
    const clusterIndex = createMockClusterIndex(5)
    const queryEmbedding = createMockEmbedding768(50) // Between cluster seeds

    const relevantClusters = identifyRelevantClusters(queryEmbedding, clusterIndex, {
      maxClusters: 5,
    })

    // Results should be sorted by similarity (descending)
    for (let i = 1; i < relevantClusters.length; i++) {
      expect(relevantClusters[i - 1]!.similarity).toBeGreaterThanOrEqual(
        relevantClusters[i]!.similarity
      )
    }
  })

  it('should filter by similarity threshold', () => {
    const clusterIndex = createMockClusterIndex(10)
    const queryEmbedding = createMockEmbedding768(999) // Distant from all clusters

    const relevantClusters = identifyRelevantClusters(queryEmbedding, clusterIndex, {
      maxClusters: 10,
      similarityThreshold: 0.9, // High threshold
    })

    // With high threshold, may return fewer clusters
    for (const cluster of relevantClusters) {
      expect(cluster.similarity).toBeGreaterThanOrEqual(0.9)
    }
  })

  it('should return partition keys for R2 access', () => {
    const clusterIndex = createMockClusterIndex(5)
    const queryEmbedding = createMockEmbedding768()

    const relevantClusters = identifyRelevantClusters(queryEmbedding, clusterIndex, {
      maxClusters: 3,
    })

    for (const cluster of relevantClusters) {
      expect(cluster.partitionKey).toBeDefined()
      expect(typeof cluster.partitionKey).toBe('string')
    }
  })

  it('should handle empty cluster index', () => {
    const emptyIndex: ClusterIndex = {
      version: 1,
      clusterCount: 0,
      totalVectors: 0,
      clusters: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const queryEmbedding = createMockEmbedding768()

    const relevantClusters = identifyRelevantClusters(queryEmbedding, emptyIndex, {
      maxClusters: 3,
    })

    expect(relevantClusters).toEqual([])
  })

  it('should use cosine similarity for cluster matching', () => {
    // Create cluster with known centroid
    const centroid = new Float32Array(768)
    centroid.fill(1 / Math.sqrt(768)) // Normalized unit vector

    const clusterIndex: ClusterIndex = {
      version: 1,
      clusterCount: 1,
      totalVectors: 100,
      clusters: [
        {
          clusterId: 'test-cluster',
          centroid,
          vectorCount: 100,
          partitionKey: 'partitions/test.parquet',
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Query with same direction should have similarity ~1
    const queryEmbedding = new Float32Array(768)
    queryEmbedding.fill(1 / Math.sqrt(768))

    const relevantClusters = identifyRelevantClusters(queryEmbedding, clusterIndex, {
      maxClusters: 1,
    })

    expect(relevantClusters[0]?.similarity).toBeCloseTo(1, 5)
  })
})

// ============================================================================
// Partition Fetching Tests
// ============================================================================

describe('fetchPartition()', () => {
  it('should fetch and parse Parquet partition data', async () => {
    const r2 = createMockR2Adapter()

    // Setup mock partition
    const vectors = Array.from({ length: 10 }, (_, i) => createMockVectorEntry(`vec-${i}`))
    r2._partitions.set('partitions/cluster-0.parquet', {
      vectors,
      metadata: {
        clusterId: 'cluster-0',
        vectorCount: 10,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 1024,
        createdAt: Date.now(),
      },
    })

    const partition = await fetchPartition(r2, 'partitions/cluster-0.parquet')

    expect(partition).toBeDefined()
    expect(partition.vectors).toHaveLength(10)
    expect(partition.metadata.clusterId).toBe('cluster-0')
  })

  it('should return vectors with full 768-dim embeddings', async () => {
    const r2 = createMockR2Adapter()

    const vectors = [createMockVectorEntry('vec-0')]
    r2._partitions.set('partitions/test.parquet', {
      vectors,
      metadata: {
        clusterId: 'test',
        vectorCount: 1,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 1024,
        createdAt: Date.now(),
      },
    })

    const partition = await fetchPartition(r2, 'partitions/test.parquet')

    expect(partition.vectors[0]?.embedding.length).toBe(768)
    expect(partition.vectors[0]?.embedding).toBeInstanceOf(Float32Array)
  })

  it('should handle missing partitions gracefully', async () => {
    const r2 = createMockR2Adapter()

    const partition = await fetchPartition(r2, 'partitions/nonexistent.parquet')

    expect(partition).toBeNull()
  })

  it('should include vector metadata (ns, type, sourceRowid)', async () => {
    const r2 = createMockR2Adapter()

    const vector: VectorEntry = {
      id: 'vec-42',
      embedding: createMockEmbedding768(),
      sourceTable: 'things',
      sourceRowid: 42,
      metadata: {
        ns: 'myapp',
        type: 'product',
        textContent: 'Product description',
      },
    }

    r2._partitions.set('partitions/test.parquet', {
      vectors: [vector],
      metadata: {
        clusterId: 'test',
        vectorCount: 1,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 1024,
        createdAt: Date.now(),
      },
    })

    const partition = await fetchPartition(r2, 'partitions/test.parquet')

    expect(partition.vectors[0]?.sourceTable).toBe('things')
    expect(partition.vectors[0]?.sourceRowid).toBe(42)
    expect(partition.vectors[0]?.metadata.ns).toBe('myapp')
    expect(partition.vectors[0]?.metadata.type).toBe('product')
  })

  it('should track R2 requests for monitoring', async () => {
    const r2 = createMockR2Adapter()

    r2._partitions.set('partitions/cluster-0.parquet', {
      vectors: [],
      metadata: {
        clusterId: 'cluster-0',
        vectorCount: 0,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 0,
        createdAt: Date.now(),
      },
    })

    await fetchPartition(r2, 'partitions/cluster-0.parquet')

    expect(r2._requests.some((r) => r.method === 'get' && r.key.includes('cluster-0'))).toBe(true)
  })
})

// ============================================================================
// Within-Partition Search Tests
// ============================================================================

describe('searchWithinPartition()', () => {
  it('should perform vector search within partition', () => {
    const vectors = Array.from({ length: 100 }, (_, i) => createMockVectorEntry(`vec-${i}`, createMockEmbedding768(i)))

    const queryEmbedding = createMockEmbedding768(50) // Similar to vec-50

    const results = searchWithinPartition(queryEmbedding, vectors, {
      limit: 10,
    })

    expect(results).toHaveLength(10)
    // vec-50 should be most similar since query uses same seed
    expect(results[0]?.id).toBe('vec-50')
    expect(results[0]?.similarity).toBeCloseTo(1, 3)
  })

  it('should rank results by similarity (descending)', () => {
    const vectors = Array.from({ length: 50 }, (_, i) => createMockVectorEntry(`vec-${i}`, createMockEmbedding768(i)))

    const queryEmbedding = createMockEmbedding768(25)

    const results = searchWithinPartition(queryEmbedding, vectors, {
      limit: 50,
    })

    // Results should be sorted by similarity (descending)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.similarity).toBeGreaterThanOrEqual(results[i]!.similarity)
    }
  })

  it('should respect result limit', () => {
    const vectors = Array.from({ length: 100 }, (_, i) => createMockVectorEntry(`vec-${i}`))

    const queryEmbedding = createMockEmbedding768()

    const results = searchWithinPartition(queryEmbedding, vectors, {
      limit: 5,
    })

    expect(results).toHaveLength(5)
  })

  it('should filter by namespace if specified', () => {
    const vectors: VectorEntry[] = [
      {
        id: 'vec-app1',
        embedding: createMockEmbedding768(1),
        sourceTable: 'things',
        sourceRowid: 1,
        metadata: { ns: 'app1', type: 'doc', textContent: null },
      },
      {
        id: 'vec-app2',
        embedding: createMockEmbedding768(2),
        sourceTable: 'things',
        sourceRowid: 2,
        metadata: { ns: 'app2', type: 'doc', textContent: null },
      },
      {
        id: 'vec-app1-2',
        embedding: createMockEmbedding768(3),
        sourceTable: 'things',
        sourceRowid: 3,
        metadata: { ns: 'app1', type: 'doc', textContent: null },
      },
    ]

    const queryEmbedding = createMockEmbedding768(1) // Similar to vec-app1

    const results = searchWithinPartition(queryEmbedding, vectors, {
      limit: 10,
      ns: 'app1',
    })

    // Should only return app1 namespace vectors
    expect(results.every((r) => r.entry.metadata.ns === 'app1')).toBe(true)
    expect(results.length).toBe(2)
  })

  it('should filter by type if specified', () => {
    const vectors: VectorEntry[] = [
      {
        id: 'vec-doc-1',
        embedding: createMockEmbedding768(1),
        sourceTable: 'things',
        sourceRowid: 1,
        metadata: { ns: 'default', type: 'document', textContent: null },
      },
      {
        id: 'vec-prod-1',
        embedding: createMockEmbedding768(2),
        sourceTable: 'things',
        sourceRowid: 2,
        metadata: { ns: 'default', type: 'product', textContent: null },
      },
    ]

    const queryEmbedding = createMockEmbedding768()

    const results = searchWithinPartition(queryEmbedding, vectors, {
      limit: 10,
      type: 'document',
    })

    expect(results.every((r) => r.entry.metadata.type === 'document')).toBe(true)
  })

  it('should handle empty partition', () => {
    const vectors: VectorEntry[] = []
    const queryEmbedding = createMockEmbedding768()

    const results = searchWithinPartition(queryEmbedding, vectors, {
      limit: 10,
    })

    expect(results).toEqual([])
  })

  it('should use cosine similarity for scoring', () => {
    // Create vectors with known relationship
    const identicalVector: VectorEntry = {
      id: 'identical',
      embedding: createMockEmbedding768(42),
      sourceTable: 'things',
      sourceRowid: 1,
      metadata: { ns: 'default', type: 'test', textContent: null },
    }

    const queryEmbedding = createMockEmbedding768(42) // Same seed

    const results = searchWithinPartition(queryEmbedding, [identicalVector], {
      limit: 1,
    })

    // Identical vectors should have similarity ~1
    expect(results[0]?.similarity).toBeCloseTo(1, 5)
  })
})

// ============================================================================
// Result Merging Tests
// ============================================================================

describe('mergeSearchResults()', () => {
  it('should merge results from multiple partitions', () => {
    const partition1Results: ColdSearchResult[] = [
      { id: 'p1-v1', similarity: 0.95, entry: createMockVectorEntry('p1-v1'), tier: 'cold', clusterId: 'cluster-0' },
      { id: 'p1-v2', similarity: 0.85, entry: createMockVectorEntry('p1-v2'), tier: 'cold', clusterId: 'cluster-0' },
    ]

    const partition2Results: ColdSearchResult[] = [
      { id: 'p2-v1', similarity: 0.90, entry: createMockVectorEntry('p2-v1'), tier: 'cold', clusterId: 'cluster-1' },
      { id: 'p2-v2', similarity: 0.80, entry: createMockVectorEntry('p2-v2'), tier: 'cold', clusterId: 'cluster-1' },
    ]

    const merged = mergeSearchResults([partition1Results, partition2Results], {
      limit: 10,
    })

    expect(merged).toHaveLength(4)
    // Should be sorted by similarity globally
    expect(merged[0]?.id).toBe('p1-v1') // 0.95
    expect(merged[1]?.id).toBe('p2-v1') // 0.90
    expect(merged[2]?.id).toBe('p1-v2') // 0.85
    expect(merged[3]?.id).toBe('p2-v2') // 0.80
  })

  it('should maintain global sort order by similarity', () => {
    const results1: ColdSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
      id: `r1-${i}`,
      similarity: 0.9 - i * 0.1,
      entry: createMockVectorEntry(`r1-${i}`),
      tier: 'cold' as SearchTier,
      clusterId: 'c1',
    }))

    const results2: ColdSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
      id: `r2-${i}`,
      similarity: 0.85 - i * 0.1,
      entry: createMockVectorEntry(`r2-${i}`),
      tier: 'cold' as SearchTier,
      clusterId: 'c2',
    }))

    const merged = mergeSearchResults([results1, results2], { limit: 20 })

    // Verify sorted by similarity descending
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i - 1]!.similarity).toBeGreaterThanOrEqual(merged[i]!.similarity)
    }
  })

  it('should respect result limit across partitions', () => {
    const results1: ColdSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r1-${i}`,
      similarity: 0.9 - i * 0.01,
      entry: createMockVectorEntry(`r1-${i}`),
      tier: 'cold' as SearchTier,
      clusterId: 'c1',
    }))

    const results2: ColdSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r2-${i}`,
      similarity: 0.89 - i * 0.01,
      entry: createMockVectorEntry(`r2-${i}`),
      tier: 'cold' as SearchTier,
      clusterId: 'c2',
    }))

    const merged = mergeSearchResults([results1, results2], { limit: 5 })

    expect(merged).toHaveLength(5)
    // Top 5 should be: r1-0 (0.90), r1-1 (0.89), r2-0 (0.89), r1-2 (0.88), r2-1 (0.88)
    // Note: ties may break arbitrarily, but limit should be enforced
  })

  it('should deduplicate results by id', () => {
    // Same vector might appear in multiple clusters if cluster assignment changed
    const results1: ColdSearchResult[] = [
      { id: 'vec-shared', similarity: 0.95, entry: createMockVectorEntry('vec-shared'), tier: 'cold', clusterId: 'c1' },
    ]

    const results2: ColdSearchResult[] = [
      { id: 'vec-shared', similarity: 0.93, entry: createMockVectorEntry('vec-shared'), tier: 'cold', clusterId: 'c2' },
    ]

    const merged = mergeSearchResults([results1, results2], { limit: 10 })

    // Should only appear once, with best similarity
    const sharedResults = merged.filter((r) => r.id === 'vec-shared')
    expect(sharedResults).toHaveLength(1)
    expect(sharedResults[0]?.similarity).toBe(0.95) // Higher score wins
  })

  it('should handle empty partition results', () => {
    const results1: ColdSearchResult[] = []
    const results2: ColdSearchResult[] = [
      { id: 'r2-0', similarity: 0.8, entry: createMockVectorEntry('r2-0'), tier: 'cold', clusterId: 'c2' },
    ]

    const merged = mergeSearchResults([results1, results2], { limit: 10 })

    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).toBe('r2-0')
  })

  it('should preserve cluster origin for debugging', () => {
    const results1: ColdSearchResult[] = [
      { id: 'v1', similarity: 0.9, entry: createMockVectorEntry('v1'), tier: 'cold', clusterId: 'cluster-alpha' },
    ]

    const results2: ColdSearchResult[] = [
      { id: 'v2', similarity: 0.8, entry: createMockVectorEntry('v2'), tier: 'cold', clusterId: 'cluster-beta' },
    ]

    const merged = mergeSearchResults([results1, results2], { limit: 10 })

    expect(merged[0]?.clusterId).toBe('cluster-alpha')
    expect(merged[1]?.clusterId).toBe('cluster-beta')
  })
})

// ============================================================================
// Tiered Search Combination Tests
// ============================================================================

describe('combineTieredResults()', () => {
  it('should combine hot and cold search results', () => {
    const hotResults: MergedSearchResult[] = [
      { id: 'hot-1', similarity: 0.88, tier: 'hot', sourceRowid: 1 },
      { id: 'hot-2', similarity: 0.82, tier: 'hot', sourceRowid: 2 },
    ]

    const coldResults: ColdSearchResult[] = [
      { id: 'cold-1', similarity: 0.95, entry: createMockVectorEntry('cold-1'), tier: 'cold', clusterId: 'c1' },
      { id: 'cold-2', similarity: 0.85, entry: createMockVectorEntry('cold-2'), tier: 'cold', clusterId: 'c1' },
    ]

    const combined = combineTieredResults(hotResults, coldResults, { limit: 10 })

    expect(combined).toHaveLength(4)
    // Should be sorted by similarity globally
    expect(combined[0]?.id).toBe('cold-1') // 0.95
    expect(combined[1]?.id).toBe('hot-1') // 0.88
    expect(combined[2]?.id).toBe('cold-2') // 0.85
    expect(combined[3]?.id).toBe('hot-2') // 0.82
  })

  it('should respect result limit across tiers', () => {
    const hotResults: MergedSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
      id: `hot-${i}`,
      similarity: 0.8 - i * 0.01,
      tier: 'hot' as SearchTier,
      sourceRowid: i,
    }))

    const coldResults: ColdSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
      id: `cold-${i}`,
      similarity: 0.85 - i * 0.01,
      entry: createMockVectorEntry(`cold-${i}`),
      tier: 'cold' as SearchTier,
      clusterId: 'c1',
    }))

    const combined = combineTieredResults(hotResults, coldResults, { limit: 5 })

    expect(combined).toHaveLength(5)
  })

  it('should rerank hot results using cold embeddings when available', () => {
    // Hot result might have lower similarity due to truncation
    const hotResults: MergedSearchResult[] = [
      { id: 'shared-1', similarity: 0.75, tier: 'hot', sourceRowid: 1 },
    ]

    // Same vector in cold storage has higher precision similarity
    const coldResults: ColdSearchResult[] = [
      { id: 'shared-1', similarity: 0.92, entry: createMockVectorEntry('shared-1'), tier: 'cold', clusterId: 'c1' },
    ]

    const combined = combineTieredResults(hotResults, coldResults, {
      limit: 10,
      preferColdSimilarity: true,
    })

    // When same ID appears in both, cold similarity should be used
    const result = combined.find((r) => r.id === 'shared-1')
    expect(result?.similarity).toBe(0.92)
  })

  it('should mark tier origin for each result', () => {
    const hotResults: MergedSearchResult[] = [{ id: 'h1', similarity: 0.8, tier: 'hot', sourceRowid: 1 }]

    const coldResults: ColdSearchResult[] = [
      { id: 'c1', similarity: 0.9, entry: createMockVectorEntry('c1'), tier: 'cold', clusterId: 'c1' },
    ]

    const combined = combineTieredResults(hotResults, coldResults, { limit: 10 })

    expect(combined.find((r) => r.id === 'h1')?.tier).toBe('hot')
    expect(combined.find((r) => r.id === 'c1')?.tier).toBe('cold')
  })

  it('should handle hot-only search (cold disabled)', () => {
    const hotResults: MergedSearchResult[] = [
      { id: 'h1', similarity: 0.9, tier: 'hot', sourceRowid: 1 },
      { id: 'h2', similarity: 0.8, tier: 'hot', sourceRowid: 2 },
    ]

    const combined = combineTieredResults(hotResults, [], { limit: 10 })

    expect(combined).toHaveLength(2)
    expect(combined.every((r) => r.tier === 'hot')).toBe(true)
  })

  it('should handle cold-only search', () => {
    const coldResults: ColdSearchResult[] = [
      { id: 'c1', similarity: 0.95, entry: createMockVectorEntry('c1'), tier: 'cold', clusterId: 'c1' },
      { id: 'c2', similarity: 0.85, entry: createMockVectorEntry('c2'), tier: 'cold', clusterId: 'c2' },
    ]

    const combined = combineTieredResults([], coldResults, { limit: 10 })

    expect(combined).toHaveLength(2)
    expect(combined.every((r) => r.tier === 'cold')).toBe(true)
  })
})

// ============================================================================
// Missing Partition Handling Tests
// ============================================================================

describe('Missing Partition Handling', () => {
  it('should handle missing partitions gracefully', async () => {
    const r2 = createMockR2Adapter()

    // Only one partition exists
    r2._partitions.set('partitions/cluster-0.parquet', {
      vectors: [createMockVectorEntry('v1')],
      metadata: {
        clusterId: 'cluster-0',
        vectorCount: 1,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 1024,
        createdAt: Date.now(),
      },
    })

    // Try to fetch non-existent partition
    const partition = await fetchPartition(r2, 'partitions/cluster-missing.parquet')

    expect(partition).toBeNull()
  })

  it('should continue search when some partitions are missing', async () => {
    const r2 = createMockR2Adapter()
    const clusterIndex = createMockClusterIndex(3)

    // Only set up 1 of 3 partitions
    r2._partitions.set('partitions/cluster-0.parquet', {
      vectors: Array.from({ length: 5 }, (_, i) => createMockVectorEntry(`c0-v${i}`, createMockEmbedding768(i))),
      metadata: {
        clusterId: 'cluster-0',
        vectorCount: 5,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 1024,
        createdAt: Date.now(),
      },
    })

    const search = new ColdVectorSearch(r2, clusterIndex)
    const queryEmbedding = createMockEmbedding768(0)

    const results = await search.search({
      queryEmbedding,
      limit: 10,
      maxClusters: 3,
    })

    // Should still return results from the partition that exists
    expect(results.length).toBeGreaterThan(0)
    // Missing partitions should not cause errors
    expect(results.every((r) => r.clusterId === 'cluster-0')).toBe(true)
  })

  it('should report which partitions were unavailable', async () => {
    const r2 = createMockR2Adapter()
    const clusterIndex = createMockClusterIndex(2)

    // No partitions set up (all missing)

    const search = new ColdVectorSearch(r2, clusterIndex)
    // Use seed 0 which matches cluster-0's centroid seed - ensures high similarity
    const queryEmbedding = createMockEmbedding768(0)

    const searchResult = await search.searchWithMetadata({
      queryEmbedding,
      limit: 10,
      maxClusters: 2,
      clusterSimilarityThreshold: 0, // Include all clusters regardless of similarity
    })

    expect(searchResult.results).toHaveLength(0)
    expect(searchResult.metadata.missingPartitions.length).toBe(2)
  })
})

// ============================================================================
// ColdVectorSearch Class Tests
// ============================================================================

describe('ColdVectorSearch', () => {
  let r2: ReturnType<typeof createMockR2Adapter>
  let clusterIndex: ClusterIndex
  let search: ColdVectorSearch

  beforeEach(() => {
    r2 = createMockR2Adapter()
    clusterIndex = createMockClusterIndex(5)

    // Set up partitions for all clusters
    for (let c = 0; c < 5; c++) {
      const vectors = Array.from({ length: 20 }, (_, i) =>
        createMockVectorEntry(`c${c}-v${i}`, createMockEmbedding768(c * 100 + i))
      )
      r2._partitions.set(`partitions/cluster-${c}.parquet`, {
        vectors,
        metadata: {
          clusterId: `cluster-${c}`,
          vectorCount: 20,
          dimensionality: 768,
          compressionType: 'snappy',
          sizeBytes: 1024 * 20,
          createdAt: Date.now(),
        },
      })
    }

    search = new ColdVectorSearch(r2, clusterIndex)
  })

  describe('search()', () => {
    it('should perform end-to-end cold search', async () => {
      const queryEmbedding = createMockEmbedding768(0) // Similar to cluster-0 vectors

      const results = await search.search({
        queryEmbedding,
        limit: 10,
        maxClusters: 2,
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(10)
      // Results should be sorted by similarity
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.similarity).toBeGreaterThanOrEqual(results[i]!.similarity)
      }
    })

    it('should respect namespace filter', async () => {
      // Add vectors with specific namespace
      const nsVectors: VectorEntry[] = [
        {
          id: 'ns-vec-1',
          embedding: createMockEmbedding768(1),
          sourceTable: 'things',
          sourceRowid: 1,
          metadata: { ns: 'myapp', type: 'doc', textContent: null },
        },
      ]
      r2._partitions.set('partitions/cluster-0.parquet', {
        vectors: nsVectors,
        metadata: {
          clusterId: 'cluster-0',
          vectorCount: 1,
          dimensionality: 768,
          compressionType: 'snappy',
          sizeBytes: 1024,
          createdAt: Date.now(),
        },
      })

      const results = await search.search({
        queryEmbedding: createMockEmbedding768(1),
        limit: 10,
        ns: 'myapp',
      })

      // All results should be from 'myapp' namespace
      expect(results.every((r) => r.entry.metadata.ns === 'myapp')).toBe(true)
    })

    it('should respect type filter', async () => {
      // Add vectors with specific type
      const typeVectors: VectorEntry[] = [
        {
          id: 'prod-vec-1',
          embedding: createMockEmbedding768(1),
          sourceTable: 'things',
          sourceRowid: 1,
          metadata: { ns: 'default', type: 'product', textContent: null },
        },
      ]
      r2._partitions.set('partitions/cluster-0.parquet', {
        vectors: typeVectors,
        metadata: {
          clusterId: 'cluster-0',
          vectorCount: 1,
          dimensionality: 768,
          compressionType: 'snappy',
          sizeBytes: 1024,
          createdAt: Date.now(),
        },
      })

      const results = await search.search({
        queryEmbedding: createMockEmbedding768(1),
        limit: 10,
        type: 'product',
      })

      expect(results.every((r) => r.entry.metadata.type === 'product')).toBe(true)
    })

    it('should search only most relevant clusters', async () => {
      const queryEmbedding = createMockEmbedding768(0) // Should match cluster-0

      await search.search({
        queryEmbedding,
        limit: 10,
        maxClusters: 1,
      })

      // Only cluster-0 partition should be fetched
      const partitionRequests = r2._requests.filter(
        (r) => r.method === 'get' && r.key.includes('partitions/')
      )
      expect(partitionRequests.length).toBe(1)
      expect(partitionRequests[0]?.key).toContain('cluster-0')
    })
  })

  describe('searchWithMetadata()', () => {
    it('should return search metadata alongside results', async () => {
      const queryEmbedding = createMockEmbedding768()

      const { results, metadata } = await search.searchWithMetadata({
        queryEmbedding,
        limit: 10,
        maxClusters: 2,
      })

      expect(results).toBeDefined()
      expect(metadata).toBeDefined()
      expect(metadata.clustersSearched).toBeDefined()
      expect(metadata.totalVectorsScanned).toBeDefined()
      expect(metadata.searchTimeMs).toBeDefined()
    })

    it('should track clusters that were searched', async () => {
      const queryEmbedding = createMockEmbedding768(0)

      const { metadata } = await search.searchWithMetadata({
        queryEmbedding,
        limit: 10,
        maxClusters: 2,
      })

      expect(metadata.clustersSearched.length).toBeLessThanOrEqual(2)
      // Cluster-0 should be searched since query is similar
      expect(metadata.clustersSearched).toContain('cluster-0')
    })

    it('should report total vectors scanned', async () => {
      // Use seed 0 to ensure similarity with cluster-0 (centroid seeded at 0)
      const queryEmbedding = createMockEmbedding768(0)

      const { metadata } = await search.searchWithMetadata({
        queryEmbedding,
        limit: 10,
        maxClusters: 2,
      })

      expect(metadata.totalVectorsScanned).toBeGreaterThan(0)
    })

    it('should measure search time', async () => {
      const queryEmbedding = createMockEmbedding768()

      const { metadata } = await search.searchWithMetadata({
        queryEmbedding,
        limit: 10,
        maxClusters: 2,
      })

      expect(metadata.searchTimeMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Configuration', () => {
    it('should use default config when not specified', () => {
      expect(DEFAULT_SEARCH_CONFIG.maxClusters).toBe(3)
      expect(DEFAULT_SEARCH_CONFIG.clusterSimilarityThreshold).toBe(0.5)
      expect(DEFAULT_SEARCH_CONFIG.defaultLimit).toBe(10)
    })

    it('should allow custom configuration', () => {
      const customSearch = new ColdVectorSearch(r2, clusterIndex, {
        maxClusters: 5,
        clusterSimilarityThreshold: 0.7,
        defaultLimit: 20,
      })

      expect(customSearch.config.maxClusters).toBe(5)
      expect(customSearch.config.clusterSimilarityThreshold).toBe(0.7)
      expect(customSearch.config.defaultLimit).toBe(20)
    })
  })

  describe('Cluster Index Updates', () => {
    it('should accept updated cluster index', () => {
      const newIndex = createMockClusterIndex(10)

      search.updateClusterIndex(newIndex)

      expect(search.clusterIndex.clusterCount).toBe(10)
    })
  })
})

// ============================================================================
// Performance Considerations
// ============================================================================

describe('Performance', () => {
  it('should complete cluster identification in <10ms for 100 clusters', () => {
    const clusterIndex = createMockClusterIndex(100)
    const queryEmbedding = createMockEmbedding768()

    const start = performance.now()
    identifyRelevantClusters(queryEmbedding, clusterIndex, { maxClusters: 5 })
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(10)
  })

  it('should complete within-partition search in <50ms for 1000 vectors', () => {
    const vectors = Array.from({ length: 1000 }, (_, i) => createMockVectorEntry(`vec-${i}`, createMockEmbedding768(i)))

    const queryEmbedding = createMockEmbedding768()

    const start = performance.now()
    searchWithinPartition(queryEmbedding, vectors, { limit: 10 })
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(50)
  })

  it('should merge 10 partition results in <5ms', () => {
    const partitionResults: ColdSearchResult[][] = Array.from({ length: 10 }, (_, p) =>
      Array.from({ length: 100 }, (_, v) => ({
        id: `p${p}-v${v}`,
        similarity: Math.random(),
        entry: createMockVectorEntry(`p${p}-v${v}`),
        tier: 'cold' as SearchTier,
        clusterId: `cluster-${p}`,
      }))
    )

    const start = performance.now()
    mergeSearchResults(partitionResults, { limit: 50 })
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(5)
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Integration Scenarios', () => {
  describe('Hot+Cold Two-Phase Search', () => {
    it('should support reranking hot results with cold embeddings', async () => {
      const r2 = createMockR2Adapter()
      const clusterIndex = createMockClusterIndex(2)

      // Set up cold storage
      const coldVectors = [
        {
          id: 'vec-1',
          embedding: createMockEmbedding768(1),
          sourceTable: 'things' as const,
          sourceRowid: 1,
          metadata: { ns: 'default', type: 'doc', textContent: null },
        },
        {
          id: 'vec-2',
          embedding: createMockEmbedding768(2),
          sourceTable: 'things' as const,
          sourceRowid: 2,
          metadata: { ns: 'default', type: 'doc', textContent: null },
        },
      ]

      r2._partitions.set('partitions/cluster-0.parquet', {
        vectors: coldVectors,
        metadata: {
          clusterId: 'cluster-0',
          vectorCount: 2,
          dimensionality: 768,
          compressionType: 'snappy',
          sizeBytes: 1024,
          createdAt: Date.now(),
        },
      })

      // Simulate hot search results (256-dim approximate)
      const hotResults: MergedSearchResult[] = [
        { id: 'vec-1', similarity: 0.78, tier: 'hot', sourceRowid: 1 },
        { id: 'vec-2', similarity: 0.72, tier: 'hot', sourceRowid: 2 },
      ]

      // Cold search for reranking
      const search = new ColdVectorSearch(r2, clusterIndex)
      const queryEmbedding = createMockEmbedding768(1) // Similar to vec-1

      const coldResults = await search.search({
        queryEmbedding,
        limit: 10,
        maxClusters: 1,
      })

      // Combine results
      const combined = combineTieredResults(hotResults, coldResults, {
        limit: 10,
        preferColdSimilarity: true,
      })

      // Cold similarity should provide more accurate ranking
      expect(combined.length).toBeGreaterThan(0)
      // vec-1 should rank highest since query is similar
      expect(combined[0]?.id).toBe('vec-1')
    })
  })

  describe('Multi-Tenant Namespace Isolation', () => {
    it('should isolate search by namespace', async () => {
      const r2 = createMockR2Adapter()
      const clusterIndex = createMockClusterIndex(1)

      // Vectors from different tenants in same cluster
      const mixedVectors: VectorEntry[] = [
        {
          id: 'tenant-a-1',
          embedding: createMockEmbedding768(1),
          sourceTable: 'things',
          sourceRowid: 1,
          metadata: { ns: 'tenant-a', type: 'doc', textContent: 'Tenant A doc' },
        },
        {
          id: 'tenant-b-1',
          embedding: createMockEmbedding768(2),
          sourceTable: 'things',
          sourceRowid: 2,
          metadata: { ns: 'tenant-b', type: 'doc', textContent: 'Tenant B doc' },
        },
        {
          id: 'tenant-a-2',
          embedding: createMockEmbedding768(3),
          sourceTable: 'things',
          sourceRowid: 3,
          metadata: { ns: 'tenant-a', type: 'doc', textContent: 'Tenant A doc 2' },
        },
      ]

      r2._partitions.set('partitions/cluster-0.parquet', {
        vectors: mixedVectors,
        metadata: {
          clusterId: 'cluster-0',
          vectorCount: 3,
          dimensionality: 768,
          compressionType: 'snappy',
          sizeBytes: 1024,
          createdAt: Date.now(),
        },
      })

      const search = new ColdVectorSearch(r2, clusterIndex)

      // Search for tenant-a only
      const results = await search.search({
        queryEmbedding: createMockEmbedding768(1),
        limit: 10,
        ns: 'tenant-a',
      })

      // Should only return tenant-a vectors
      expect(results.every((r) => r.entry.metadata.ns === 'tenant-a')).toBe(true)
      expect(results.length).toBe(2)
    })
  })
})
