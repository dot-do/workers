[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ClusterAssignment

# Interface: ClusterAssignment

Defined in: [packages/do-core/src/cluster-manager.ts:53](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L53)

Assignment of a vector to a cluster

## Properties

### vectorId

> **vectorId**: `string`

Defined in: [packages/do-core/src/cluster-manager.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L55)

ID of the vector being assigned

***

### clusterId

> **clusterId**: `string`

Defined in: [packages/do-core/src/cluster-manager.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L57)

ID of the assigned cluster

***

### distance

> **distance**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L59)

Distance from vector to centroid

***

### assignedAt

> **assignedAt**: `number`

Defined in: [packages/do-core/src/cluster-manager.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cluster-manager.ts#L61)

Timestamp of assignment
