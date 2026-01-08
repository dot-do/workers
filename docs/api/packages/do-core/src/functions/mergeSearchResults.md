[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / mergeSearchResults

# Function: mergeSearchResults()

> **mergeSearchResults**(`partitionResults`, `options`): [`ColdSearchResult`](../interfaces/ColdSearchResult.md)[]

Defined in: [packages/do-core/src/cold-vector-search.ts:471](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L471)

Merge results from multiple partitions.

Combines results from different clusters, maintaining global sort order
by similarity and deduplicating by ID.

## Parameters

### partitionResults

[`ColdSearchResult`](../interfaces/ColdSearchResult.md)[][]

Results from each partition

### options

[`MergeOptions`](../interfaces/MergeOptions.md)

Merge options (limit)

## Returns

[`ColdSearchResult`](../interfaces/ColdSearchResult.md)[]

Merged results sorted by similarity (descending)
