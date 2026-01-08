[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/rate-limiting/src](../README.md) / InMemoryRateLimitStorageConfig

# Interface: InMemoryRateLimitStorageConfig

Defined in: [packages/rate-limiting/src/index.ts:311](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L311)

Configuration for InMemoryRateLimitStorage

## Properties

### cleanupIntervalMs?

> `optional` **cleanupIntervalMs**: `number`

Defined in: [packages/rate-limiting/src/index.ts:313](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/rate-limiting/src/index.ts#L313)

Interval in milliseconds for running cleanup of expired entries (default: 60000 - 1 minute)
