[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ColdSearchOptions

# Interface: ColdSearchOptions

Defined in: [packages/do-core/src/cold-vector-search.ts:203](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L203)

Options for cold storage search

## Properties

### queryEmbedding

> **queryEmbedding**: `Float32Array`

Defined in: [packages/do-core/src/cold-vector-search.ts:205](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L205)

Query embedding (768-dim)

***

### limit

> **limit**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:207](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L207)

Maximum results to return

***

### maxClusters?

> `optional` **maxClusters**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:209](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L209)

Maximum clusters to search

***

### clusterSimilarityThreshold?

> `optional` **clusterSimilarityThreshold**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:211](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L211)

Minimum cluster similarity threshold

***

### ns?

> `optional` **ns**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:213](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L213)

Filter by namespace

***

### type?

> `optional` **type**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:215](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L215)

Filter by type

***

### includeCold?

> `optional` **includeCold**: `boolean`

Defined in: [packages/do-core/src/cold-vector-search.ts:217](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L217)

Whether to include cold storage in search

***

### hotResults?

> `optional` **hotResults**: [`MergedSearchResult`](MergedSearchResult.md)[]

Defined in: [packages/do-core/src/cold-vector-search.ts:219](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L219)

Hot results to merge with cold
