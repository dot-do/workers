[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / BoundedSetStats

# Interface: BoundedSetStats

Defined in: [packages/security/src/bounded-set.ts:16](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L16)

Statistics for bounded collection monitoring

## Properties

### evictionCount

> **evictionCount**: `number`

Defined in: [packages/security/src/bounded-set.ts:18](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L18)

Number of items evicted due to size limits

***

### hitCount

> **hitCount**: `number`

Defined in: [packages/security/src/bounded-set.ts:20](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L20)

Number of successful has() calls (item found)

***

### missCount

> **missCount**: `number`

Defined in: [packages/security/src/bounded-set.ts:22](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L22)

Number of unsuccessful has() calls (item not found)

***

### hitRate

> **hitRate**: `number`

Defined in: [packages/security/src/bounded-set.ts:24](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L24)

Hit rate (hitCount / (hitCount + missCount))
