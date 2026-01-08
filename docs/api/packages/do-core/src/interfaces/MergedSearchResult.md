[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / MergedSearchResult

# Interface: MergedSearchResult

Defined in: [packages/do-core/src/cold-vector-search.ts:167](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L167)

Merged result from hot storage (for combining with cold)

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:169](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L169)

Vector identifier

***

### similarity

> **similarity**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:171](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L171)

Cosine similarity to query

***

### tier

> **tier**: [`SearchTier`](../type-aliases/SearchTier.md)

Defined in: [packages/do-core/src/cold-vector-search.ts:173](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L173)

Search tier

***

### sourceRowid

> **sourceRowid**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:175](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L175)

Source rowid for joining with cold results

***

### entry?

> `optional` **entry**: [`VectorEntry`](VectorEntry.md)

Defined in: [packages/do-core/src/cold-vector-search.ts:177](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L177)

Full entry (if cold tier)

***

### clusterId?

> `optional` **clusterId**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:179](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L179)

Cluster ID (if cold tier)
