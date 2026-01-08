[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / CombineOptions

# Interface: CombineOptions

Defined in: [packages/do-core/src/cold-vector-search.ts:193](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L193)

Options for combining hot and cold results

## Properties

### limit

> **limit**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:195](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L195)

Maximum results to return

***

### preferColdSimilarity?

> `optional` **preferColdSimilarity**: `boolean`

Defined in: [packages/do-core/src/cold-vector-search.ts:197](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L197)

Prefer cold similarity scores when same ID exists in both tiers
