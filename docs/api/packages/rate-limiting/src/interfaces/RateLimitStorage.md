[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / RateLimitStorage

# Interface: RateLimitStorage

Defined in: [packages/rate-limiting/src/index.ts:28](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L28)

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`T` \| `null`\>

Defined in: [packages/rate-limiting/src/index.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L29)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`T` \| `null`\>

***

### set()

> **set**\<`T`\>(`key`, `value`, `ttlMs?`): `Promise`\<`void`\>

Defined in: [packages/rate-limiting/src/index.ts:30](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L30)

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

***

### delete()

> **delete**(`key`): `Promise`\<`void`\>

Defined in: [packages/rate-limiting/src/index.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L31)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>
