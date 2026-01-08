[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / InMemoryRateLimiter

# Class: InMemoryRateLimiter

Defined in: [packages/rate-limiting/src/index.ts:456](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L456)

In-Memory Token Bucket Rate Limiter with automatic cleanup

This is a convenience class that combines TokenBucketRateLimiter with
InMemoryRateLimitStorage, providing automatic cleanup of expired entries.

Use this for:
- Single-instance Workers or Durable Objects
- Development and testing
- Scenarios where distributed state isn't needed

For distributed rate limiting, use TokenBucketRateLimiter with a shared
storage backend (e.g., Durable Objects, KV).

## Constructors

### Constructor

> **new InMemoryRateLimiter**(`config`): `InMemoryRateLimiter`

Defined in: [packages/rate-limiting/src/index.ts:461](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L461)

#### Parameters

##### config

[`InMemoryRateLimiterConfig`](../interfaces/InMemoryRateLimiterConfig.md)

#### Returns

`InMemoryRateLimiter`

## Accessors

### storageSize

#### Get Signature

> **get** **storageSize**(): `number`

Defined in: [packages/rate-limiting/src/index.ts:483](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L483)

Get the number of rate limit buckets currently stored (for monitoring)

##### Returns

`number`

## Methods

### check()

> **check**(`key`, `options`): `Promise`\<[`RateLimitResult`](../interfaces/RateLimitResult.md)\>

Defined in: [packages/rate-limiting/src/index.ts:490](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L490)

Check if a request should be allowed

#### Parameters

##### key

`string`

##### options

[`CheckOptions`](../interfaces/CheckOptions.md) = `{}`

#### Returns

`Promise`\<[`RateLimitResult`](../interfaces/RateLimitResult.md)\>

***

### getHeaders()

> **getHeaders**(`result`): `Record`\<`string`, `string`\>

Defined in: [packages/rate-limiting/src/index.ts:497](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L497)

Get HTTP headers for rate limit response

#### Parameters

##### result

[`RateLimitResult`](../interfaces/RateLimitResult.md)

#### Returns

`Record`\<`string`, `string`\>

***

### dispose()

> **dispose**(): `void`

Defined in: [packages/rate-limiting/src/index.ts:504](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L504)

Stop the cleanup interval and release resources

#### Returns

`void`
