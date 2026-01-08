[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / searchWithinPartition

# Function: searchWithinPartition()

> **searchWithinPartition**(`queryEmbedding`, `vectors`, `options`): [`ColdSearchResult`](../interfaces/ColdSearchResult.md)[]

Defined in: [packages/do-core/src/cold-vector-search.ts:418](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L418)

Search for similar vectors within a partition.

Performs brute-force cosine similarity search over all vectors in the partition,
with optional namespace and type filtering.

## Parameters

### queryEmbedding

`Float32Array`

The 768-dim query embedding

### vectors

[`VectorEntry`](../interfaces/VectorEntry.md)[]

Vector entries in the partition

### options

[`PartitionSearchOptions`](../interfaces/PartitionSearchOptions.md)

Search options (limit, filters)

## Returns

[`ColdSearchResult`](../interfaces/ColdSearchResult.md)[]

Array of search results sorted by similarity (descending)
