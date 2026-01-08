[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / combineTieredResults

# Function: combineTieredResults()

> **combineTieredResults**(`hotResults`, `coldResults`, `options`): [`MergedSearchResult`](../interfaces/MergedSearchResult.md)[]

Defined in: [packages/do-core/src/cold-vector-search.ts:512](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L512)

Combine hot and cold search results.

Merges results from hot storage (256-dim approximate) with cold storage
(768-dim precise), maintaining global sort order and handling deduplication.

## Parameters

### hotResults

[`MergedSearchResult`](../interfaces/MergedSearchResult.md)[]

Results from hot storage search

### coldResults

[`ColdSearchResult`](../interfaces/ColdSearchResult.md)[]

Results from cold storage search

### options

[`CombineOptions`](../interfaces/CombineOptions.md)

Combine options

## Returns

[`MergedSearchResult`](../interfaces/MergedSearchResult.md)[]

Combined results sorted by similarity (descending)
