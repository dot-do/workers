[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / SearchResult

# Interface: SearchResult

Defined in: [packages/do-core/src/two-phase-search.ts:34](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L34)

Search result from a vector similarity search

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/two-phase-search.ts:36](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L36)

Identifier of the matched document

***

### score

> **score**: `number`

Defined in: [packages/do-core/src/two-phase-search.ts:38](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L38)

Similarity score (0-1 for cosine similarity)

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/two-phase-search.ts:40](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L40)

Source metadata
