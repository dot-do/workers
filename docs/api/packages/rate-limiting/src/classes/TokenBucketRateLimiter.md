[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / TokenBucketRateLimiter

# Class: TokenBucketRateLimiter

Defined in: [packages/rate-limiting/src/index.ts:75](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L75)

Token Bucket Rate Limiter

Allows bursts up to capacity, then limits to the refill rate.
Good for APIs that want to allow occasional bursts.

## Constructors

### Constructor

> **new TokenBucketRateLimiter**(`config`): `TokenBucketRateLimiter`

Defined in: [packages/rate-limiting/src/index.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L78)

#### Parameters

##### config

[`TokenBucketConfig`](../interfaces/TokenBucketConfig.md)

#### Returns

`TokenBucketRateLimiter`

## Methods

### check()

> **check**(`key`, `options`): `Promise`\<[`RateLimitResult`](../interfaces/RateLimitResult.md)\>

Defined in: [packages/rate-limiting/src/index.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L85)

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

Defined in: [packages/rate-limiting/src/index.ts:161](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L161)

Get HTTP headers for rate limit response

#### Parameters

##### result

[`RateLimitResult`](../interfaces/RateLimitResult.md)

#### Returns

`Record`\<`string`, `string`\>
