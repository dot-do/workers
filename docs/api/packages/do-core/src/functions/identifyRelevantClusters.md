[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / identifyRelevantClusters

# Function: identifyRelevantClusters()

> **identifyRelevantClusters**(`queryEmbedding`, `clusterIndex`, `options`): [`IdentifiedCluster`](../interfaces/IdentifiedCluster.md)[]

Defined in: [packages/do-core/src/cold-vector-search.ts:294](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L294)

Identify relevant clusters for a query embedding.

Uses cosine similarity between query and cluster centroids to determine
which R2 partitions to fetch for detailed search.

## Parameters

### queryEmbedding

`Float32Array`

The 768-dim query embedding

### clusterIndex

[`ClusterIndex`](../interfaces/ClusterIndex.md)

Index of all clusters with centroids

### options

[`ClusterIdentificationOptions`](../interfaces/ClusterIdentificationOptions.md)

Cluster identification options

## Returns

[`IdentifiedCluster`](../interfaces/IdentifiedCluster.md)[]

Array of identified clusters sorted by similarity (descending)
