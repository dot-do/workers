[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / BoundedMapOptions

# Interface: BoundedMapOptions\<K, V\>

Defined in: [packages/security/src/bounded-set.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L48)

Options for BoundedMap configuration

## Type Parameters

### K

`K` = `unknown`

### V

`V` = `unknown`

## Properties

### maxSize?

> `optional` **maxSize**: `number`

Defined in: [packages/security/src/bounded-set.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L50)

Maximum number of entries in the map (default: 10000)

***

### evictionPolicy?

> `optional` **evictionPolicy**: [`EvictionPolicy`](../type-aliases/EvictionPolicy.md)

Defined in: [packages/security/src/bounded-set.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L52)

Eviction policy when map is full (default: 'fifo')

***

### ttlMs?

> `optional` **ttlMs**: `number`

Defined in: [packages/security/src/bounded-set.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L54)

Time-to-live in milliseconds (optional, no TTL if not set)

***

### refreshTtlOnAccess?

> `optional` **refreshTtlOnAccess**: `boolean`

Defined in: [packages/security/src/bounded-set.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L56)

Whether to refresh TTL on access (default: false)

***

### cleanupIntervalMs?

> `optional` **cleanupIntervalMs**: `number`

Defined in: [packages/security/src/bounded-set.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L58)

Interval for automatic cleanup of expired entries in ms (optional)

***

### onEvict()?

> `optional` **onEvict**: (`key`, `value`) => `void`

Defined in: [packages/security/src/bounded-set.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L60)

Callback when an entry is evicted

#### Parameters

##### key

`K`

##### value

`V`

#### Returns

`void`
