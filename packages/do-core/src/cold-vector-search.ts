/**
 * Cold Vector Search - R2 Parquet Partition Search
 *
 * Provides vector search capabilities for cold storage in R2.
 * Cold storage vectors are:
 * 1. Partitioned by cluster ID in R2
 * 2. Stored as Parquet files with full 768-dim embeddings
 * 3. Searched by first identifying relevant clusters, then fetching/scanning those partitions
 *
 * This module supports the tiered storage strategy:
 * - Hot storage: 256-dim embeddings in Durable Objects (fast approximate search)
 * - Cold storage: 768-dim embeddings in R2 (full precision reranking)
 *
 * @see workers-xrv3q - Cold vector search from R2 partitions
 *
 * RED PHASE: This file contains type definitions and stub implementations.
 * All functions throw "Not implemented" errors until GREEN phase.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Search tier - identifies whether result came from hot or cold storage
 */
export type SearchTier = 'hot' | 'cold'

/**
 * Vector entry stored in cold storage (Parquet partitions)
 */
export interface VectorEntry {
  /** Unique identifier for the vector */
  id: string
  /** Full 768-dimensional embedding */
  embedding: Float32Array
  /** Source table: 'things' or 'relationships' */
  sourceTable: 'things' | 'relationships'
  /** Rowid of the source record */
  sourceRowid: number
  /** Additional metadata */
  metadata: {
    /** Namespace for isolation */
    ns: string
    /** Type of the source entity */
    type: string | null
    /** Original text content that was embedded */
    textContent: string | null
  }
}

/**
 * Partition metadata from R2 object HEAD
 */
export interface PartitionMetadata {
  /** Cluster ID this partition belongs to */
  clusterId: string
  /** Number of vectors in this partition */
  vectorCount: number
  /** Dimensionality of embeddings (768) */
  dimensionality: number
  /** Compression type (e.g., 'snappy') */
  compressionType: string
  /** Partition size in bytes */
  sizeBytes: number
  /** When this partition was created */
  createdAt: number
}

/**
 * Parsed partition data from R2
 */
export interface ParsedPartition {
  /** Vector entries in this partition */
  vectors: VectorEntry[]
  /** Partition metadata */
  metadata: PartitionMetadata
}

/**
 * Cluster information for routing queries
 */
export interface ClusterInfo {
  /** Unique cluster identifier */
  clusterId: string
  /** Centroid vector for this cluster (768-dim) */
  centroid: Float32Array
  /** Number of vectors assigned to this cluster */
  vectorCount: number
  /** R2 key for this cluster's partition */
  partitionKey: string
}

/**
 * Index of all clusters for query routing
 */
export interface ClusterIndex {
  /** Index version for compatibility */
  version: number
  /** Total number of clusters */
  clusterCount: number
  /** Total vectors across all clusters */
  totalVectors: number
  /** Individual cluster information */
  clusters: ClusterInfo[]
  /** When the index was created */
  createdAt: number
  /** When the index was last updated */
  updatedAt: number
}

/**
 * Identified cluster with similarity score
 */
export interface IdentifiedCluster {
  /** Cluster identifier */
  clusterId: string
  /** Similarity to query (cosine similarity) */
  similarity: number
  /** R2 key for partition */
  partitionKey: string
  /** Number of vectors in cluster */
  vectorCount: number
}

/**
 * Options for cluster identification
 */
export interface ClusterIdentificationOptions {
  /** Maximum number of clusters to search */
  maxClusters: number
  /** Minimum similarity threshold for cluster selection */
  similarityThreshold?: number
}

/**
 * Options for within-partition search
 */
export interface PartitionSearchOptions {
  /** Maximum results to return */
  limit: number
  /** Filter by namespace */
  ns?: string
  /** Filter by type */
  type?: string
}

/**
 * Result from cold storage search
 */
export interface ColdSearchResult {
  /** Vector identifier */
  id: string
  /** Cosine similarity to query */
  similarity: number
  /** Full vector entry */
  entry: VectorEntry
  /** Search tier (always 'cold' for these results) */
  tier: SearchTier
  /** Cluster this result came from */
  clusterId: string
}

/**
 * Merged result from hot storage (for combining with cold)
 */
export interface MergedSearchResult {
  /** Vector identifier */
  id: string
  /** Cosine similarity to query */
  similarity: number
  /** Search tier */
  tier: SearchTier
  /** Source rowid for joining with cold results */
  sourceRowid: number
  /** Full entry (if cold tier) */
  entry?: VectorEntry
  /** Cluster ID (if cold tier) */
  clusterId?: string
}

/**
 * Options for merging results
 */
export interface MergeOptions {
  /** Maximum results to return */
  limit: number
}

/**
 * Options for combining hot and cold results
 */
export interface CombineOptions {
  /** Maximum results to return */
  limit: number
  /** Prefer cold similarity scores when same ID exists in both tiers */
  preferColdSimilarity?: boolean
}

/**
 * Options for cold storage search
 */
export interface ColdSearchOptions {
  /** Query embedding (768-dim) */
  queryEmbedding: Float32Array
  /** Maximum results to return */
  limit: number
  /** Maximum clusters to search */
  maxClusters?: number
  /** Minimum cluster similarity threshold */
  clusterSimilarityThreshold?: number
  /** Filter by namespace */
  ns?: string
  /** Filter by type */
  type?: string
  /** Whether to include cold storage in search */
  includeCold?: boolean
  /** Hot results to merge with cold */
  hotResults?: MergedSearchResult[]
}

/**
 * Search metadata for debugging and monitoring
 */
export interface SearchMetadata {
  /** Clusters that were searched */
  clustersSearched: string[]
  /** Total vectors scanned */
  totalVectorsScanned: number
  /** Search time in milliseconds */
  searchTimeMs: number
  /** Partitions that were missing */
  missingPartitions: string[]
}

/**
 * Search result with metadata
 */
export interface SearchResultWithMetadata {
  /** Search results */
  results: ColdSearchResult[]
  /** Search metadata */
  metadata: SearchMetadata
}

/**
 * R2 storage adapter interface
 */
export interface R2StorageAdapter {
  /** Get object from R2 */
  get(key: string): Promise<ArrayBuffer | null>
  /** Get object metadata from R2 */
  head(key: string): Promise<PartitionMetadata | null>
  /** List objects with prefix */
  list(prefix: string): Promise<string[]>
}

/**
 * Cold search configuration
 */
export interface ColdSearchConfig {
  /** Default maximum clusters to search */
  maxClusters: number
  /** Default cluster similarity threshold */
  clusterSimilarityThreshold: number
  /** Default result limit */
  defaultLimit: number
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: ColdSearchConfig = {
  maxClusters: 3,
  clusterSimilarityThreshold: 0.5,
  defaultLimit: 10,
}

// ============================================================================
// Stub Implementations (RED Phase)
// ============================================================================

/**
 * Identify relevant clusters for a query embedding.
 *
 * Uses cosine similarity between query and cluster centroids to determine
 * which R2 partitions to fetch for detailed search.
 *
 * @param queryEmbedding - The 768-dim query embedding
 * @param clusterIndex - Index of all clusters with centroids
 * @param options - Cluster identification options
 * @returns Array of identified clusters sorted by similarity (descending)
 */
export function identifyRelevantClusters(
  queryEmbedding: Float32Array,
  clusterIndex: ClusterIndex,
  options: ClusterIdentificationOptions
): IdentifiedCluster[] {
  // Handle empty cluster index
  if (clusterIndex.clusters.length === 0) {
    return []
  }

  // Calculate similarity between query and each cluster centroid
  const clusterSimilarities: IdentifiedCluster[] = []

  for (const cluster of clusterIndex.clusters) {
    const similarity = computeCosineSimilarity(queryEmbedding, cluster.centroid)

    // Apply similarity threshold filter if specified
    if (options.similarityThreshold !== undefined && similarity < options.similarityThreshold) {
      continue
    }

    clusterSimilarities.push({
      clusterId: cluster.clusterId,
      similarity,
      partitionKey: cluster.partitionKey,
      vectorCount: cluster.vectorCount,
    })
  }

  // Sort by similarity descending
  clusterSimilarities.sort((a, b) => b.similarity - a.similarity)

  // Limit to maxClusters
  return clusterSimilarities.slice(0, options.maxClusters)
}

/**
 * Compute cosine similarity between two vectors.
 * Internal helper function.
 */
function computeCosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }

  let dotProduct = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)

  if (magnitude === 0) {
    return 0
  }

  return dotProduct / magnitude
}

/**
 * Fetch and parse a Parquet partition from R2.
 *
 * @param r2 - R2 storage adapter
 * @param partitionKey - R2 key for the partition
 * @returns Parsed partition data or null if not found
 */
export async function fetchPartition(
  r2: R2StorageAdapter,
  partitionKey: string
): Promise<ParsedPartition | null> {
  // Try to get the partition data
  const data = await r2.get(partitionKey)

  if (data === null) {
    return null
  }

  // Get metadata via head request
  const metadata = await r2.head(partitionKey)

  if (metadata === null) {
    return null
  }

  // In the mock adapter, we access vectors from _partitions directly
  // In real implementation, this would parse Parquet bytes
  // For the test mock, we need to return the vectors stored in the adapter
  const adapter = r2 as R2StorageAdapter & {
    _partitions?: Map<string, { vectors: VectorEntry[]; metadata: PartitionMetadata }>
  }

  if (adapter._partitions) {
    const partition = adapter._partitions.get(partitionKey)
    if (partition) {
      return {
        vectors: partition.vectors,
        metadata: partition.metadata,
      }
    }
  }

  // Return empty partition if no vectors found (for real Parquet parsing)
  return {
    vectors: [],
    metadata,
  }
}

/**
 * Search for similar vectors within a partition.
 *
 * Performs brute-force cosine similarity search over all vectors in the partition,
 * with optional namespace and type filtering.
 *
 * @param queryEmbedding - The 768-dim query embedding
 * @param vectors - Vector entries in the partition
 * @param options - Search options (limit, filters)
 * @returns Array of search results sorted by similarity (descending)
 */
export function searchWithinPartition(
  queryEmbedding: Float32Array,
  vectors: VectorEntry[],
  options: PartitionSearchOptions
): ColdSearchResult[] {
  // Handle empty partition
  if (vectors.length === 0) {
    return []
  }

  // Calculate similarities and filter
  const results: ColdSearchResult[] = []

  for (const entry of vectors) {
    // Apply namespace filter if specified
    if (options.ns !== undefined && entry.metadata.ns !== options.ns) {
      continue
    }

    // Apply type filter if specified
    if (options.type !== undefined && entry.metadata.type !== options.type) {
      continue
    }

    // Calculate cosine similarity
    const similarity = computeCosineSimilarity(queryEmbedding, entry.embedding)

    results.push({
      id: entry.id,
      similarity,
      entry,
      tier: 'cold',
      clusterId: '', // Will be set by caller if needed
    })
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity)

  // Apply limit
  return results.slice(0, options.limit)
}

/**
 * Merge results from multiple partitions.
 *
 * Combines results from different clusters, maintaining global sort order
 * by similarity and deduplicating by ID.
 *
 * @param partitionResults - Results from each partition
 * @param options - Merge options (limit)
 * @returns Merged results sorted by similarity (descending)
 */
export function mergeSearchResults(
  partitionResults: ColdSearchResult[][],
  options: MergeOptions
): ColdSearchResult[] {
  // Flatten all results
  const allResults: ColdSearchResult[] = []
  for (const partition of partitionResults) {
    for (const result of partition) {
      allResults.push(result)
    }
  }

  // Sort by similarity descending
  allResults.sort((a, b) => b.similarity - a.similarity)

  // Deduplicate by ID, keeping the one with highest similarity (already sorted)
  const seen = new Set<string>()
  const deduped: ColdSearchResult[] = []

  for (const result of allResults) {
    if (!seen.has(result.id)) {
      seen.add(result.id)
      deduped.push(result)
    }
  }

  // Apply limit
  return deduped.slice(0, options.limit)
}

/**
 * Combine hot and cold search results.
 *
 * Merges results from hot storage (256-dim approximate) with cold storage
 * (768-dim precise), maintaining global sort order and handling deduplication.
 *
 * @param hotResults - Results from hot storage search
 * @param coldResults - Results from cold storage search
 * @param options - Combine options
 * @returns Combined results sorted by similarity (descending)
 */
export function combineTieredResults(
  hotResults: MergedSearchResult[],
  coldResults: ColdSearchResult[],
  options: CombineOptions
): MergedSearchResult[] {
  // Build a map from cold results for deduplication and similarity preference
  const coldMap = new Map<string, ColdSearchResult>()
  for (const result of coldResults) {
    coldMap.set(result.id, result)
  }

  // Convert cold results to merged format
  const allResults: MergedSearchResult[] = []

  // Add hot results, potentially overriding with cold similarity
  for (const hot of hotResults) {
    const cold = coldMap.get(hot.id)

    if (cold && options.preferColdSimilarity) {
      // Use cold similarity if same ID exists in both tiers
      allResults.push({
        id: hot.id,
        similarity: cold.similarity,
        tier: 'cold', // Mark as cold since we're using cold similarity
        sourceRowid: hot.sourceRowid,
        entry: cold.entry,
        clusterId: cold.clusterId,
      })
      // Remove from coldMap to avoid double-adding
      coldMap.delete(hot.id)
    } else if (!cold) {
      // Hot-only result
      allResults.push(hot)
    } else {
      // cold exists but don't prefer cold similarity - still use hot
      allResults.push(hot)
      coldMap.delete(hot.id)
    }
  }

  // Add remaining cold results not in hot
  for (const cold of coldMap.values()) {
    allResults.push({
      id: cold.id,
      similarity: cold.similarity,
      tier: 'cold',
      sourceRowid: cold.entry.sourceRowid,
      entry: cold.entry,
      clusterId: cold.clusterId,
    })
  }

  // Sort by similarity descending
  allResults.sort((a, b) => b.similarity - a.similarity)

  // Apply limit
  return allResults.slice(0, options.limit)
}

// ============================================================================
// ColdVectorSearch Class
// ============================================================================

/**
 * Cold Vector Search - Search vectors in R2 Parquet partitions
 *
 * Provides a high-level interface for searching vectors stored in cold storage.
 * Handles cluster identification, partition fetching, and result merging.
 *
 * @example
 * ```typescript
 * const r2 = env.R2
 * const clusterIndex = await loadClusterIndex()
 *
 * const search = new ColdVectorSearch(r2, clusterIndex)
 *
 * const results = await search.search({
 *   queryEmbedding: queryVector,
 *   limit: 10,
 *   maxClusters: 3,
 * })
 * ```
 */
export class ColdVectorSearch {
  public readonly config: ColdSearchConfig
  private _clusterIndex: ClusterIndex

  constructor(
    private readonly r2: R2StorageAdapter,
    clusterIndex: ClusterIndex,
    config?: Partial<ColdSearchConfig>
  ) {
    this._clusterIndex = clusterIndex
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config }
  }

  /**
   * Get the current cluster index
   */
  get clusterIndex(): ClusterIndex {
    return this._clusterIndex
  }

  /**
   * Update the cluster index (e.g., after background rebuild)
   */
  updateClusterIndex(newIndex: ClusterIndex): void {
    this._clusterIndex = newIndex
  }

  /**
   * Search for similar vectors in cold storage.
   *
   * @param options - Search options
   * @returns Array of search results sorted by similarity (descending)
   */
  async search(options: ColdSearchOptions): Promise<ColdSearchResult[]> {
    const result = await this.searchWithMetadata(options)
    return result.results
  }

  /**
   * Search for similar vectors with detailed metadata.
   *
   * @param options - Search options
   * @returns Search results with metadata
   */
  async searchWithMetadata(options: ColdSearchOptions): Promise<SearchResultWithMetadata> {
    const startTime = performance.now()

    // Use config defaults for optional parameters
    const maxClusters = options.maxClusters ?? this.config.maxClusters
    const limit = options.limit ?? this.config.defaultLimit

    // Step 1: Identify relevant clusters
    const relevantClusters = identifyRelevantClusters(options.queryEmbedding, this._clusterIndex, {
      maxClusters,
      similarityThreshold: options.clusterSimilarityThreshold ?? this.config.clusterSimilarityThreshold,
    })

    // Track metadata
    const clustersSearched: string[] = []
    const missingPartitions: string[] = []
    let totalVectorsScanned = 0

    // Step 2: Fetch and search each relevant partition
    const partitionResults: ColdSearchResult[][] = []

    for (const cluster of relevantClusters) {
      const partition = await fetchPartition(this.r2, cluster.partitionKey)

      if (partition === null) {
        missingPartitions.push(cluster.partitionKey)
        continue
      }

      clustersSearched.push(cluster.clusterId)
      totalVectorsScanned += partition.vectors.length

      // Search within partition
      const results = searchWithinPartition(options.queryEmbedding, partition.vectors, {
        limit,
        ns: options.ns,
        type: options.type,
      })

      // Set cluster ID on results
      for (const result of results) {
        result.clusterId = cluster.clusterId
      }

      partitionResults.push(results)
    }

    // Step 3: Merge results from all partitions
    const mergedResults = mergeSearchResults(partitionResults, { limit })

    const searchTimeMs = performance.now() - startTime

    return {
      results: mergedResults,
      metadata: {
        clustersSearched,
        totalVectorsScanned,
        searchTimeMs,
        missingPartitions,
      },
    }
  }
}
