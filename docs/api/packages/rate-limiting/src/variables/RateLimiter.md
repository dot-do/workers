[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / RateLimiter

# Variable: RateLimiter

> `const` **RateLimiter**: `object`

Defined in: [packages/rate-limiting/src/index.ts:285](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L285)

Factory for creating rate limiters

## Type Declaration

### tokenBucket()

> **tokenBucket**(`config`): [`TokenBucketRateLimiter`](../classes/TokenBucketRateLimiter.md)

Create a token bucket rate limiter

#### Parameters

##### config

[`TokenBucketConfig`](../interfaces/TokenBucketConfig.md)

#### Returns

[`TokenBucketRateLimiter`](../classes/TokenBucketRateLimiter.md)

### slidingWindow()

> **slidingWindow**(`config`): [`SlidingWindowRateLimiter`](../classes/SlidingWindowRateLimiter.md)

Create a sliding window rate limiter

#### Parameters

##### config

[`SlidingWindowConfig`](../interfaces/SlidingWindowConfig.md)

#### Returns

[`SlidingWindowRateLimiter`](../classes/SlidingWindowRateLimiter.md)

### inMemory()

> **inMemory**(`config`): [`InMemoryRateLimiter`](../classes/InMemoryRateLimiter.md)

Create an in-memory rate limiter with automatic cleanup

#### Parameters

##### config

[`InMemoryRateLimiterConfig`](../interfaces/InMemoryRateLimiterConfig.md)

#### Returns

[`InMemoryRateLimiter`](../classes/InMemoryRateLimiter.md)
