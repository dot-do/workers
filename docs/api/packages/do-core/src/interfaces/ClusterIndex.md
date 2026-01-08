[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ClusterIndex

# Interface: ClusterIndex

Defined in: [packages/do-core/src/cold-vector-search.ts:97](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L97)

Index of all clusters for query routing

## Properties

### version

> **version**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:99](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L99)

Index version for compatibility

***

### clusterCount

> **clusterCount**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:101](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L101)

Total number of clusters

***

### totalVectors

> **totalVectors**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L103)

Total vectors across all clusters

***

### clusters

> **clusters**: [`ClusterInfo`](ClusterInfo.md)[]

Defined in: [packages/do-core/src/cold-vector-search.ts:105](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L105)

Individual cluster information

***

### createdAt

> **createdAt**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:107](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L107)

When the index was created

***

### updatedAt

> **updatedAt**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:109](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L109)

When the index was last updated
