[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ColdVectorSearch

# Class: ColdVectorSearch

Defined in: [packages/do-core/src/cold-vector-search.ts:595](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L595)

Cold Vector Search - Search vectors in R2 Parquet partitions

Provides a high-level interface for searching vectors stored in cold storage.
Handles cluster identification, partition fetching, and result merging.

## Example

```typescript
const r2 = env.R2
const clusterIndex = await loadClusterIndex()

const search = new ColdVectorSearch(r2, clusterIndex)

const results = await search.search({
  queryEmbedding: queryVector,
  limit: 10,
  maxClusters: 3,
})
```

## Constructors

### Constructor

> **new ColdVectorSearch**(`r2`, `clusterIndex`, `config?`): `ColdVectorSearch`

Defined in: [packages/do-core/src/cold-vector-search.ts:599](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L599)

#### Parameters

##### r2

[`R2StorageAdapter`](../interfaces/R2StorageAdapter.md)

##### clusterIndex

[`ClusterIndex`](../interfaces/ClusterIndex.md)

##### config?

`Partial`\<[`ColdSearchConfig`](../interfaces/ColdSearchConfig.md)\>

#### Returns

`ColdVectorSearch`

## Properties

### config

> `readonly` **config**: [`ColdSearchConfig`](../interfaces/ColdSearchConfig.md)

Defined in: [packages/do-core/src/cold-vector-search.ts:596](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L596)

## Accessors

### clusterIndex

#### Get Signature

> **get** **clusterIndex**(): [`ClusterIndex`](../interfaces/ClusterIndex.md)

Defined in: [packages/do-core/src/cold-vector-search.ts:611](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L611)

Get the current cluster index

##### Returns

[`ClusterIndex`](../interfaces/ClusterIndex.md)

## Methods

### updateClusterIndex()

> **updateClusterIndex**(`newIndex`): `void`

Defined in: [packages/do-core/src/cold-vector-search.ts:618](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L618)

Update the cluster index (e.g., after background rebuild)

#### Parameters

##### newIndex

[`ClusterIndex`](../interfaces/ClusterIndex.md)

#### Returns

`void`

***

### search()

> **search**(`options`): `Promise`\<[`ColdSearchResult`](../interfaces/ColdSearchResult.md)[]\>

Defined in: [packages/do-core/src/cold-vector-search.ts:628](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L628)

Search for similar vectors in cold storage.

#### Parameters

##### options

[`ColdSearchOptions`](../interfaces/ColdSearchOptions.md)

Search options

#### Returns

`Promise`\<[`ColdSearchResult`](../interfaces/ColdSearchResult.md)[]\>

Array of search results sorted by similarity (descending)

***

### searchWithMetadata()

> **searchWithMetadata**(`options`): `Promise`\<[`SearchResultWithMetadata`](../interfaces/SearchResultWithMetadata.md)\>

Defined in: [packages/do-core/src/cold-vector-search.ts:639](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L639)

Search for similar vectors with detailed metadata.

#### Parameters

##### options

[`ColdSearchOptions`](../interfaces/ColdSearchOptions.md)

Search options

#### Returns

`Promise`\<[`SearchResultWithMetadata`](../interfaces/SearchResultWithMetadata.md)\>

Search results with metadata
