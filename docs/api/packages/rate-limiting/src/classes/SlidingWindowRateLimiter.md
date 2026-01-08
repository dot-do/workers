[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / SlidingWindowRateLimiter

# Class: SlidingWindowRateLimiter

Defined in: [packages/rate-limiting/src/index.ts:182](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L182)

Sliding Window Rate Limiter

Smoothly limits requests over a rolling time window.
Good for strict rate limiting without allowing bursts.

## Constructors

### Constructor

> **new SlidingWindowRateLimiter**(`config`): `SlidingWindowRateLimiter`

Defined in: [packages/rate-limiting/src/index.ts:185](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L185)

#### Parameters

##### config

[`SlidingWindowConfig`](../interfaces/SlidingWindowConfig.md)

#### Returns

`SlidingWindowRateLimiter`

## Methods

### check()

> **check**(`key`, `options`): `Promise`\<[`RateLimitResult`](../interfaces/RateLimitResult.md)\>

Defined in: [packages/rate-limiting/src/index.ts:192](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L192)

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

Defined in: [packages/rate-limiting/src/index.ts:267](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L267)

Get HTTP headers for rate limit response

#### Parameters

##### result

[`RateLimitResult`](../interfaces/RateLimitResult.md)

#### Returns

`Record`\<`string`, `string`\>
