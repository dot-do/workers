[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ClusterStats

# Interface: ClusterStats

Defined in: [packages/do-core/src/cluster-manager.ts:67](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L67)

Statistics for a cluster (for load balancing)

## Properties

### clusterId

> **clusterId**: `string`

Defined in: [packages/do-core/src/cluster-manager.ts:69](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L69)

Cluster identifier

***

### vectorCount

> **vectorCount**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:71](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L71)

Number of vectors in cluster

***

### averageDistance

> **averageDistance**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:73](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L73)

Average distance of vectors to centroid

***

### minDistance

> **minDistance**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:75](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L75)

Minimum distance to centroid

***

### maxDistance

> **maxDistance**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:77](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L77)

Maximum distance to centroid

***

### lastUpdated

> **lastUpdated**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L79)

Last time stats were updated
