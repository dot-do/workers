[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ITwoPhaseSearch

# Interface: ITwoPhaseSearch

Defined in: [packages/do-core/src/two-phase-search.ts:67](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L67)

Two-phase search interface

## Methods

### search()

> **search**(`query`, `options?`): `Promise`\<[`SearchResult`](SearchResult.md)[]\>

Defined in: [packages/do-core/src/two-phase-search.ts:74](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L74)

Execute two-phase search

#### Parameters

##### query

`VectorInput`

Query embedding (768-dim or 256-dim)

##### options?

[`TwoPhaseSearchOptions`](TwoPhaseSearchOptions.md)

Search options

#### Returns

`Promise`\<[`SearchResult`](SearchResult.md)[]\>

Search results ranked by similarity

***

### setFullEmbeddingProvider()

> **setFullEmbeddingProvider**(`provider`): `void`

Defined in: [packages/do-core/src/two-phase-search.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L79)

Set the provider for full embeddings (phase 2 reranking)

#### Parameters

##### provider

[`FullEmbeddingProvider`](../type-aliases/FullEmbeddingProvider.md)

#### Returns

`void`

***

### addToHotIndex()

> **addToHotIndex**(`id`, `embedding768`, `metadata?`): `void`

Defined in: [packages/do-core/src/two-phase-search.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L84)

Add a document to the hot index (256-dim embeddings)

#### Parameters

##### id

`string`

##### embedding768

`VectorInput`

##### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### getStats()

> **getStats**(): `object`

Defined in: [packages/do-core/src/two-phase-search.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L89)

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
