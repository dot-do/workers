[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TwoPhaseSearch

# Class: TwoPhaseSearch

Defined in: [packages/do-core/src/two-phase-search.ts:115](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L115)

TwoPhaseSearch - Two-phase MRL vector search implementation.

Phase 1: Fast approximate search using truncated 256-dim embeddings in memory
Phase 2: Accurate reranking using full 768-dim embeddings from cold storage

## Implements

- [`ITwoPhaseSearch`](../interfaces/ITwoPhaseSearch.md)

## Constructors

### Constructor

> **new TwoPhaseSearch**(): `TwoPhaseSearch`

#### Returns

`TwoPhaseSearch`

## Methods

### search()

> **search**(`query`, `options`): `Promise`\<[`SearchResult`](../interfaces/SearchResult.md)[]\>

Defined in: [packages/do-core/src/two-phase-search.ts:139](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L139)

Execute two-phase search

#### Parameters

##### query

`VectorInput`

Query embedding (768-dim or 256-dim)

##### options

[`TwoPhaseSearchOptions`](../interfaces/TwoPhaseSearchOptions.md) = `{}`

Search options

#### Returns

`Promise`\<[`SearchResult`](../interfaces/SearchResult.md)[]\>

Search results ranked by similarity

#### Implementation of

[`ITwoPhaseSearch`](../interfaces/ITwoPhaseSearch.md).[`search`](../interfaces/ITwoPhaseSearch.md#search)

***

### setFullEmbeddingProvider()

> **setFullEmbeddingProvider**(`provider`): `void`

Defined in: [packages/do-core/src/two-phase-search.ts:330](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L330)

Set the provider for full embeddings (phase 2 reranking)

#### Parameters

##### provider

[`FullEmbeddingProvider`](../type-aliases/FullEmbeddingProvider.md)

#### Returns

`void`

#### Implementation of

[`ITwoPhaseSearch`](../interfaces/ITwoPhaseSearch.md).[`setFullEmbeddingProvider`](../interfaces/ITwoPhaseSearch.md#setfullembeddingprovider)

***

### addToHotIndex()

> **addToHotIndex**(`id`, `embedding768`, `metadata?`): `void`

Defined in: [packages/do-core/src/two-phase-search.ts:341](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L341)

Add a document to the hot index (256-dim embeddings)

#### Parameters

##### id

`string`

Document identifier

##### embedding768

`VectorInput`

Full 768-dim embedding (will be truncated to 256-dim)

##### metadata?

`Record`\<`string`, `unknown`\>

Optional metadata

#### Returns

`void`

#### Implementation of

[`ITwoPhaseSearch`](../interfaces/ITwoPhaseSearch.md).[`addToHotIndex`](../interfaces/ITwoPhaseSearch.md#addtohotindex)

***

### getStats()

> **getStats**(): `object`

Defined in: [packages/do-core/src/two-phase-search.ts:357](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L357)

Get statistics about the index

#### Returns

`object`

##### hotIndexSize

> **hotIndexSize**: `number`

##### coldIndexSize

> **coldIndexSize**: `number`

##### averagePhase1Time

> **averagePhase1Time**: `number`

##### averagePhase2Time

> **averagePhase2Time**: `number`

#### Implementation of

[`ITwoPhaseSearch`](../interfaces/ITwoPhaseSearch.md).[`getStats`](../interfaces/ITwoPhaseSearch.md#getstats)
