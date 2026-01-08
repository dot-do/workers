[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IdentifiedCluster

# Interface: IdentifiedCluster

Defined in: [packages/do-core/src/cold-vector-search.ts:115](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L115)

Identified cluster with similarity score

## Properties

### clusterId

> **clusterId**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:117](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L117)

Cluster identifier

***

### similarity

> **similarity**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:119](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L119)

Similarity to query (cosine similarity)

***

### partitionKey

> **partitionKey**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:121](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L121)

R2 key for partition

***

### vectorCount

> **vectorCount**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:123](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L123)

Number of vectors in cluster
