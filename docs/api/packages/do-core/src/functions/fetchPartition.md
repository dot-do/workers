[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / fetchPartition

# Function: fetchPartition()

> **fetchPartition**(`r2`, `partitionKey`): `Promise`\<[`ParsedPartition`](../interfaces/ParsedPartition.md) \| `null`\>

Defined in: [packages/do-core/src/cold-vector-search.ts:365](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L365)

Fetch and parse a Parquet partition from R2.

## Parameters

### r2

[`R2StorageAdapter`](../interfaces/R2StorageAdapter.md)

R2 storage adapter

### partitionKey

`string`

R2 key for the partition

## Returns

`Promise`\<[`ParsedPartition`](../interfaces/ParsedPartition.md) \| `null`\>

Parsed partition data or null if not found
