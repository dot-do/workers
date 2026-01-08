[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / SearchMetadata

# Interface: SearchMetadata

Defined in: [packages/do-core/src/cold-vector-search.ts:225](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L225)

Search metadata for debugging and monitoring

## Properties

### clustersSearched

> **clustersSearched**: `string`[]

Defined in: [packages/do-core/src/cold-vector-search.ts:227](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L227)

Clusters that were searched

***

### totalVectorsScanned

> **totalVectorsScanned**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:229](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L229)

Total vectors scanned

***

### searchTimeMs

> **searchTimeMs**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:231](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L231)

Search time in milliseconds

***

### missingPartitions

> **missingPartitions**: `string`[]

Defined in: [packages/do-core/src/cold-vector-search.ts:233](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L233)

Partitions that were missing
