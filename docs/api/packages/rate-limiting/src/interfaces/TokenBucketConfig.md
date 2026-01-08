[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / TokenBucketConfig

# Interface: TokenBucketConfig

Defined in: [packages/rate-limiting/src/index.ts:39](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L39)

## Extends

- [`RateLimitConfig`](RateLimitConfig.md)

## Properties

### storage

> **storage**: [`RateLimitStorage`](RateLimitStorage.md)

Defined in: [packages/rate-limiting/src/index.ts:35](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L35)

#### Inherited from

[`RateLimitConfig`](RateLimitConfig.md).[`storage`](RateLimitConfig.md#storage)

***

### failMode?

> `optional` **failMode**: [`FailMode`](../type-aliases/FailMode.md)

Defined in: [packages/rate-limiting/src/index.ts:36](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L36)

#### Inherited from

[`RateLimitConfig`](RateLimitConfig.md).[`failMode`](RateLimitConfig.md#failmode)

***

### capacity

> **capacity**: `number`

Defined in: [packages/rate-limiting/src/index.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L41)

Maximum number of tokens in the bucket

***

### refillRate

> **refillRate**: `number`

Defined in: [packages/rate-limiting/src/index.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L43)

Number of tokens to add per refill

***

### refillInterval

> **refillInterval**: `number`

Defined in: [packages/rate-limiting/src/index.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L45)

Time between refills in milliseconds
