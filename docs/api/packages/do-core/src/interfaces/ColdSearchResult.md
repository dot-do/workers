[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ColdSearchResult

# Interface: ColdSearchResult

Defined in: [packages/do-core/src/cold-vector-search.ts:151](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L151)

Result from cold storage search

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:153](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L153)

Vector identifier

***

### similarity

> **similarity**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:155](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L155)

Cosine similarity to query

***

### entry

> **entry**: [`VectorEntry`](VectorEntry.md)

Defined in: [packages/do-core/src/cold-vector-search.ts:157](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L157)

Full vector entry

***

### tier

> **tier**: [`SearchTier`](../type-aliases/SearchTier.md)

Defined in: [packages/do-core/src/cold-vector-search.ts:159](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L159)

Search tier (always 'cold' for these results)

***

### clusterId

> **clusterId**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:161](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L161)

Cluster this result came from
