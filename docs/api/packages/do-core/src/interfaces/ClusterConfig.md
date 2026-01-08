[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ClusterConfig

# Interface: ClusterConfig

Defined in: [packages/do-core/src/cluster-manager.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L85)

Configuration for ClusterManager

## Properties

### numClusters

> **numClusters**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L87)

Number of clusters (k)

***

### dimension

> **dimension**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L89)

Vector dimension

***

### distanceMetric

> **distanceMetric**: [`DistanceMetric`](../type-aliases/DistanceMetric.md)

Defined in: [packages/do-core/src/cluster-manager.ts:91](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L91)

Distance metric to use

***

### enableIncrementalCentroidUpdate?

> `optional` **enableIncrementalCentroidUpdate**: `boolean`

Defined in: [packages/do-core/src/cluster-manager.ts:93](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L93)

Enable incremental centroid updates on assignment

***

### partitionKeyPrefix?

> `optional` **partitionKeyPrefix**: `string`

Defined in: [packages/do-core/src/cluster-manager.ts:95](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L95)

R2 partition key prefix
