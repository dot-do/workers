[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / SlidingWindowConfig

# Interface: SlidingWindowConfig

Defined in: [packages/rate-limiting/src/index.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L48)

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

### limit

> **limit**: `number`

Defined in: [packages/rate-limiting/src/index.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L50)

Maximum requests per window

***

### windowMs

> **windowMs**: `number`

Defined in: [packages/rate-limiting/src/index.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L52)

Window size in milliseconds
