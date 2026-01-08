[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / PartitionMetadata

# Interface: PartitionMetadata

Defined in: [packages/do-core/src/cold-vector-search.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L55)

Partition metadata from R2 object HEAD

## Properties

### clusterId

> **clusterId**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L57)

Cluster ID this partition belongs to

***

### vectorCount

> **vectorCount**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L59)

Number of vectors in this partition

***

### dimensionality

> **dimensionality**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L61)

Dimensionality of embeddings (768)

***

### compressionType

> **compressionType**: `string`

Defined in: [packages/do-core/src/cold-vector-search.ts:63](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L63)

Compression type (e.g., 'snappy')

***

### sizeBytes

> **sizeBytes**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:65](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L65)

Partition size in bytes

***

### createdAt

> **createdAt**: `number`

Defined in: [packages/do-core/src/cold-vector-search.ts:67](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L67)

When this partition was created
