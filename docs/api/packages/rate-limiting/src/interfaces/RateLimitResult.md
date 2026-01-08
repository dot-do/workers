[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / RateLimitResult

# Interface: RateLimitResult

Defined in: [packages/rate-limiting/src/index.ts:13](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L13)

## Properties

### allowed

> **allowed**: `boolean`

Defined in: [packages/rate-limiting/src/index.ts:15](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L15)

Whether the request is allowed

***

### remaining

> **remaining**: `number`

Defined in: [packages/rate-limiting/src/index.ts:17](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L17)

Number of requests/tokens remaining

***

### limit

> **limit**: `number`

Defined in: [packages/rate-limiting/src/index.ts:19](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L19)

The rate limit

***

### resetAt

> **resetAt**: `number`

Defined in: [packages/rate-limiting/src/index.ts:21](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L21)

When the limit resets (Unix timestamp in seconds)

***

### retryAfter?

> `optional` **retryAfter**: `number`

Defined in: [packages/rate-limiting/src/index.ts:23](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L23)

Seconds until retry is allowed (when rate limited)

***

### error?

> `optional` **error**: `string`

Defined in: [packages/rate-limiting/src/index.ts:25](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L25)

Error message if storage failed
