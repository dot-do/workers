[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ClusterManager

# Class: ClusterManager

Defined in: [packages/do-core/src/cluster-manager.ts:152](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L152)

ClusterManager handles k-means cluster assignment for R2 partition routing.

GREEN PHASE: All methods are fully implemented.

## Constructors

### Constructor

> **new ClusterManager**(`config`): `ClusterManager`

Defined in: [packages/do-core/src/cluster-manager.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L156)

#### Parameters

##### config

`Partial`\<[`ClusterConfig`](../interfaces/ClusterConfig.md)\> = `{}`

#### Returns

`ClusterManager`

## Methods

### setCentroids()

> **setCentroids**(`centroids`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/cluster-manager.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L168)

Set the centroids for this cluster manager.
Replaces any existing centroids.

#### Parameters

##### centroids

[`Centroid`](../interfaces/Centroid.md)[]

#### Returns

`Promise`\<`void`\>

***

### getCentroids()

> **getCentroids**(): `Promise`\<[`Centroid`](../interfaces/Centroid.md)[]\>

Defined in: [packages/do-core/src/cluster-manager.ts:188](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L188)

Get all centroids.

#### Returns

`Promise`\<[`Centroid`](../interfaces/Centroid.md)[]\>

***

### getCentroid()

> **getCentroid**(`clusterId`): `Promise`\<[`Centroid`](../interfaces/Centroid.md) \| `null`\>

Defined in: [packages/do-core/src/cluster-manager.ts:195](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L195)

Get a specific centroid by ID.

#### Parameters

##### clusterId

`string`

#### Returns

`Promise`\<[`Centroid`](../interfaces/Centroid.md) \| `null`\>

***

### updateCentroid()

> **updateCentroid**(`clusterId`, `update`): `Promise`\<[`Centroid`](../interfaces/Centroid.md)\>

Defined in: [packages/do-core/src/cluster-manager.ts:202](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L202)

Update a centroid's properties.

#### Parameters

##### clusterId

`string`

##### update

[`CentroidUpdate`](../interfaces/CentroidUpdate.md)

#### Returns

`Promise`\<[`Centroid`](../interfaces/Centroid.md)\>

***

### recomputeCentroid()

> **recomputeCentroid**(`clusterId`, `memberVectors`): `Promise`\<[`Centroid`](../interfaces/Centroid.md)\>

Defined in: [packages/do-core/src/cluster-manager.ts:231](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L231)

Recompute a centroid from its member vectors.

#### Parameters

##### clusterId

`string`

##### memberVectors

`number`[][]

#### Returns

`Promise`\<[`Centroid`](../interfaces/Centroid.md)\>

***

### assignVector()

> **assignVector**(`vectorId`, `vector`): `Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)\>

Defined in: [packages/do-core/src/cluster-manager.ts:280](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L280)

Assign a single vector to the nearest cluster.

#### Parameters

##### vectorId

`string`

##### vector

`number`[]

#### Returns

`Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)\>

***

### assignVectorBatch()

> **assignVectorBatch**(`vectors`): `Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)[]\>

Defined in: [packages/do-core/src/cluster-manager.ts:315](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L315)

Assign multiple vectors to clusters efficiently.

#### Parameters

##### vectors

[`VectorBatchInput`](../interfaces/VectorBatchInput.md)[]

#### Returns

`Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)[]\>

***

### assignVectorIncremental()

> **assignVectorIncremental**(`vectorId`, `vector`): `Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)\>

Defined in: [packages/do-core/src/cluster-manager.ts:331](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L331)

Assign a vector and update cluster counts incrementally.

#### Parameters

##### vectorId

`string`

##### vector

`number`[]

#### Returns

`Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)\>

***

### reassignVector()

> **reassignVector**(`vectorId`, `newVector`, `currentClusterId`): `Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)\>

Defined in: [packages/do-core/src/cluster-manager.ts:357](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L357)

Reassign a vector that has moved, updating cluster counts.

#### Parameters

##### vectorId

`string`

##### newVector

`number`[]

##### currentClusterId

`string`

#### Returns

`Promise`\<[`ClusterAssignment`](../interfaces/ClusterAssignment.md)\>

***

### findNearestClusters()

> **findNearestClusters**(`queryVector`, `k`): `Promise`\<[`NearestClusterResult`](../interfaces/NearestClusterResult.md)[]\>

Defined in: [packages/do-core/src/cluster-manager.ts:381](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L381)

Find the k nearest clusters to a query vector.
Used for routing queries to relevant R2 partitions.

#### Parameters

##### queryVector

`number`[]

##### k

`number`

#### Returns

`Promise`\<[`NearestClusterResult`](../interfaces/NearestClusterResult.md)[]\>

***

### getClusterPartitions()

> **getClusterPartitions**(`clusterIds`): `Promise`\<`string`[]\>

Defined in: [packages/do-core/src/cluster-manager.ts:407](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L407)

Get R2 partition keys for the given cluster IDs.

#### Parameters

##### clusterIds

`string`[]

#### Returns

`Promise`\<`string`[]\>

***

### getClusterStats()

> **getClusterStats**(): `Promise`\<[`ClusterStats`](../interfaces/ClusterStats.md)[]\>

Defined in: [packages/do-core/src/cluster-manager.ts:419](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L419)

Get statistics for all clusters.

#### Returns

`Promise`\<[`ClusterStats`](../interfaces/ClusterStats.md)[]\>

***

### getImbalancedClusters()

> **getImbalancedClusters**(`imbalanceThreshold`): `Promise`\<[`ClusterStats`](../interfaces/ClusterStats.md)[]\>

Defined in: [packages/do-core/src/cluster-manager.ts:441](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L441)

Find clusters that are imbalanced (too many or too few vectors).

#### Parameters

##### imbalanceThreshold

`number`

Ratio of largest to smallest cluster count

#### Returns

`Promise`\<[`ClusterStats`](../interfaces/ClusterStats.md)[]\>

***

### incrementClusterCount()

> **incrementClusterCount**(`clusterId`, `delta`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/cluster-manager.ts:470](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L470)

Increment (or decrement) the vector count for a cluster.

#### Parameters

##### clusterId

`string`

##### delta

`number`

#### Returns

`Promise`\<`void`\>

***

### serializeCentroids()

> **serializeCentroids**(): `Promise`\<`string`\>

Defined in: [packages/do-core/src/cluster-manager.ts:492](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L492)

Serialize centroids to JSON string.

#### Returns

`Promise`\<`string`\>

***

### deserializeCentroids()

> **deserializeCentroids**(`json`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/cluster-manager.ts:500](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L500)

Deserialize centroids from JSON string.

#### Parameters

##### json

`string`

#### Returns

`Promise`\<`void`\>

***

### serializeCentroidsBinary()

> **serializeCentroidsBinary**(): `Promise`\<`ArrayBuffer`\>

Defined in: [packages/do-core/src/cluster-manager.ts:518](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L518)

Serialize centroids to binary format for efficient storage.

Binary format:
- Header (16 bytes): numClusters (4), dimension (4), reserved (8)
- For each centroid:
  - id length (2 bytes)
  - id (variable, UTF-8)
  - vector (dimension * 4 bytes, float32)
  - vectorCount (4 bytes, uint32)
  - createdAt (8 bytes, float64)
  - updatedAt (8 bytes, float64)

#### Returns

`Promise`\<`ArrayBuffer`\>
