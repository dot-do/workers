[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / InMemoryRateLimiterConfig

# Interface: InMemoryRateLimiterConfig

Defined in: [packages/rate-limiting/src/index.ts:427](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L427)

Configuration for InMemoryRateLimiter

## Properties

### capacity

> **capacity**: `number`

Defined in: [packages/rate-limiting/src/index.ts:429](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L429)

Maximum number of tokens in the bucket

***

### refillRate

> **refillRate**: `number`

Defined in: [packages/rate-limiting/src/index.ts:431](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L431)

Number of tokens to add per refill

***

### refillInterval

> **refillInterval**: `number`

Defined in: [packages/rate-limiting/src/index.ts:433](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L433)

Time between refills in milliseconds

***

### failMode?

> `optional` **failMode**: [`FailMode`](../type-aliases/FailMode.md)

Defined in: [packages/rate-limiting/src/index.ts:435](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L435)

How to handle storage errors (default: 'open')

***

### cleanupIntervalMs?

> `optional` **cleanupIntervalMs**: `number`

Defined in: [packages/rate-limiting/src/index.ts:437](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L437)

Interval in milliseconds for running cleanup of expired entries (default: 60000)

***

### bucketTtlMs?

> `optional` **bucketTtlMs**: `number`

Defined in: [packages/rate-limiting/src/index.ts:439](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L439)

TTL for bucket entries in milliseconds (default: 10 * refillInterval)
