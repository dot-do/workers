[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / BoundedSetOptions

# Interface: BoundedSetOptions\<T\>

Defined in: [packages/security/src/bounded-set.ts:30](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L30)

Options for BoundedSet configuration

## Type Parameters

### T

`T` = `unknown`

## Properties

### maxSize?

> `optional` **maxSize**: `number`

Defined in: [packages/security/src/bounded-set.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L32)

Maximum number of items in the set (default: 10000)

***

### evictionPolicy?

> `optional` **evictionPolicy**: [`EvictionPolicy`](../type-aliases/EvictionPolicy.md)

Defined in: [packages/security/src/bounded-set.ts:34](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L34)

Eviction policy when set is full (default: 'fifo')

***

### ttlMs?

> `optional` **ttlMs**: `number`

Defined in: [packages/security/src/bounded-set.ts:36](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L36)

Time-to-live in milliseconds (optional, no TTL if not set)

***

### refreshTtlOnAccess?

> `optional` **refreshTtlOnAccess**: `boolean`

Defined in: [packages/security/src/bounded-set.ts:38](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L38)

Whether to refresh TTL on access (default: false)

***

### cleanupIntervalMs?

> `optional` **cleanupIntervalMs**: `number`

Defined in: [packages/security/src/bounded-set.ts:40](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L40)

Interval for automatic cleanup of expired entries in ms (optional)

***

### onEvict()?

> `optional` **onEvict**: (`value`) => `void`

Defined in: [packages/security/src/bounded-set.ts:42](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L42)

Callback when an item is evicted

#### Parameters

##### value

`T`

#### Returns

`void`
