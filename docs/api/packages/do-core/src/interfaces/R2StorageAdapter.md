[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / R2StorageAdapter

# Interface: R2StorageAdapter

Defined in: [packages/do-core/src/cold-vector-search.ts:249](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L249)

R2 storage adapter interface

## Methods

### get()

> **get**(`key`): `Promise`\<`ArrayBuffer` \| `null`\>

Defined in: [packages/do-core/src/cold-vector-search.ts:251](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L251)

Get object from R2

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`ArrayBuffer` \| `null`\>

***

### head()

> **head**(`key`): `Promise`\<[`PartitionMetadata`](PartitionMetadata.md) \| `null`\>

Defined in: [packages/do-core/src/cold-vector-search.ts:253](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L253)

Get object metadata from R2

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`PartitionMetadata`](PartitionMetadata.md) \| `null`\>

***

### list()

> **list**(`prefix`): `Promise`\<`string`[]\>

Defined in: [packages/do-core/src/cold-vector-search.ts:255](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/cold-vector-search.ts#L255)

List objects with prefix

#### Parameters

##### prefix

`string`

#### Returns

`Promise`\<`string`[]\>
