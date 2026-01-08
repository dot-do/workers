[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TwoPhaseSearchOptions

# Interface: TwoPhaseSearchOptions

Defined in: [packages/do-core/src/two-phase-search.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L46)

Options for two-phase search

## Properties

### candidatePoolSize?

> `optional` **candidatePoolSize**: `number`

Defined in: [packages/do-core/src/two-phase-search.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L48)

Number of candidates to fetch in phase 1 for reranking (default: 50)

***

### topK?

> `optional` **topK**: `number`

Defined in: [packages/do-core/src/two-phase-search.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L50)

Final number of results to return after reranking (default: 10)

***

### namespace?

> `optional` **namespace**: `string`

Defined in: [packages/do-core/src/two-phase-search.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L52)

Namespace to search within

***

### type?

> `optional` **type**: `string`

Defined in: [packages/do-core/src/two-phase-search.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L54)

Type filter

***

### mergeMode?

> `optional` **mergeMode**: `boolean`

Defined in: [packages/do-core/src/two-phase-search.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/two-phase-search.ts#L56)

Whether to include hot and cold results in merge mode
