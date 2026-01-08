[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / InMemoryRateLimitStorage

# Class: InMemoryRateLimitStorage

Defined in: [packages/rate-limiting/src/index.ts:333](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L333)

In-memory implementation of RateLimitStorage with automatic cleanup of expired entries.

This implementation addresses the memory leak issue where entries accumulate
indefinitely. It provides:
- Lazy cleanup on get() - expired entries are removed when accessed
- Periodic cleanup - a background interval removes expired entries
- dispose() method - stops the cleanup interval when no longer needed

## Implements

- [`RateLimitStorage`](../interfaces/RateLimitStorage.md)

## Constructors

### Constructor

> **new InMemoryRateLimitStorage**(`config`): `InMemoryRateLimitStorage`

Defined in: [packages/rate-limiting/src/index.ts:339](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L339)

#### Parameters

##### config

[`InMemoryRateLimitStorageConfig`](../interfaces/InMemoryRateLimitStorageConfig.md) = `{}`

#### Returns

`InMemoryRateLimitStorage`

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [packages/rate-limiting/src/index.ts:349](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L349)

Get the number of entries currently stored (for monitoring)

##### Returns

`number`

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`T` \| `null`\>

Defined in: [packages/rate-limiting/src/index.ts:353](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L353)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`T` \| `null`\>

#### Implementation of

[`RateLimitStorage`](../interfaces/RateLimitStorage.md).[`get`](../interfaces/RateLimitStorage.md#get)

***

### set()

> **set**\<`T`\>(`key`, `value`, `ttlMs?`): `Promise`\<`void`\>

Defined in: [packages/rate-limiting/src/index.ts:369](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L369)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

##### value

`T`

##### ttlMs?

`number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`RateLimitStorage`](../interfaces/RateLimitStorage.md).[`set`](../interfaces/RateLimitStorage.md#set)

***

### delete()

> **delete**(`key`): `Promise`\<`void`\>

Defined in: [packages/rate-limiting/src/index.ts:378](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L378)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`RateLimitStorage`](../interfaces/RateLimitStorage.md).[`delete`](../interfaces/RateLimitStorage.md#delete)

***

### dispose()

> **dispose**(): `void`

Defined in: [packages/rate-limiting/src/index.ts:415](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L415)

Stop the cleanup timeout and release resources

#### Returns

`void`
