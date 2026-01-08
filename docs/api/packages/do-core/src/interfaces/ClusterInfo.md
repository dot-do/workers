[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ClusterInfo

# Interface: ClusterInfo

Defined in: [packages/do-core/src/cold-vector-search.ts:83](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L83)

Cluster information for routing queries

## Properties

### clusterId

> **clusterId**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L85)

Unique cluster identifier

***

### centroid

> **centroid**: `Float32Array`

Defined in: [packages/do-core/src/cold-vector-search.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L87)

Centroid vector for this cluster (768-dim)

***

### vectorCount

> **vectorCount**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L89)

Number of vectors assigned to this cluster

***

### partitionKey

> **partitionKey**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:91](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L91)

R2 key for this cluster's partition
