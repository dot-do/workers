[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / BoundedMap

# Class: BoundedMap\<K, V\>

Defined in: [packages/security/src/bounded-set.ts:360](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L360)

A Map implementation with bounded size to prevent memory leaks.

Similar to BoundedSet but for key-value pairs.

## Example

```ts
type SessionId = string & { __brand: 'SessionId' }

const sessions = new BoundedMap<SessionId, SessionData>({
  maxSize: 10000,
  ttlMs: 3600000, // 1 hour TTL
})
```

## Type Parameters

### K

`K`

### V

`V`

## Implements

- `Iterable`\<\[`K`, `V`\]\>

## Constructors

### Constructor

> **new BoundedMap**\<`K`, `V`\>(`options?`): `BoundedMap`\<`K`, `V`\>

Defined in: [packages/security/src/bounded-set.ts:373](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L373)

#### Parameters

##### options?

[`BoundedMapOptions`](../interfaces/BoundedMapOptions.md)\<`K`, `V`\>

#### Returns

`BoundedMap`\<`K`, `V`\>

## Accessors

### maxSize

#### Get Signature

> **get** **maxSize**(): `number`

Defined in: [packages/security/src/bounded-set.ts:397](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L397)

##### Returns

`number`

***

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [packages/security/src/bounded-set.ts:401](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L401)

##### Returns

`number`

***

### stats

#### Get Signature

> **get** **stats**(): [`BoundedSetStats`](../interfaces/BoundedSetStats.md)

Defined in: [packages/security/src/bounded-set.ts:405](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L405)

##### Returns

[`BoundedSetStats`](../interfaces/BoundedSetStats.md)

## Methods

### set()

> **set**(`key`, `value`): `this`

Defined in: [packages/security/src/bounded-set.ts:415](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L415)

#### Parameters

##### key

`K`

##### value

`V`

#### Returns

`this`

***

### get()

> **get**(`key`): `V` \| `undefined`

Defined in: [packages/security/src/bounded-set.ts:455](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L455)

#### Parameters

##### key

`K`

#### Returns

`V` \| `undefined`

***

### has()

> **has**(`key`): `boolean`

Defined in: [packages/security/src/bounded-set.ts:488](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L488)

#### Parameters

##### key

`K`

#### Returns

`boolean`

***

### delete()

> **delete**(`key`): `boolean`

Defined in: [packages/security/src/bounded-set.ts:520](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L520)

#### Parameters

##### key

`K`

#### Returns

`boolean`

***

### clear()

> **clear**(): `void`

Defined in: [packages/security/src/bounded-set.ts:524](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L524)

#### Returns

`void`

***

### forEach()

> **forEach**(`callback`): `void`

Defined in: [packages/security/src/bounded-set.ts:529](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L529)

#### Parameters

##### callback

(`value`, `key`, `map`) => `void`

#### Returns

`void`

***

### keys()

> **keys**(): `IterableIterator`\<`K`\>

Defined in: [packages/security/src/bounded-set.ts:535](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L535)

#### Returns

`IterableIterator`\<`K`\>

***

### values()

> **values**(): `IterableIterator`\<`V`\>

Defined in: [packages/security/src/bounded-set.ts:541](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L541)

#### Returns

`IterableIterator`\<`V`\>

***

### entries()

> **entries**(): `IterableIterator`\<\[`K`, `V`\]\>

Defined in: [packages/security/src/bounded-set.ts:547](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L547)

#### Returns

`IterableIterator`\<\[`K`, `V`\]\>

***

### \[iterator\]()

> **\[iterator\]**(): `Iterator`\<\[`K`, `V`\]\>

Defined in: [packages/security/src/bounded-set.ts:553](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L553)

#### Returns

`Iterator`\<\[`K`, `V`\]\>

#### Implementation of

`Iterable.[iterator]`

***

### cleanup()

> **cleanup**(): `number`

Defined in: [packages/security/src/bounded-set.ts:561](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L561)

Manually trigger cleanup of expired entries

#### Returns

`number`

Number of entries removed

***

### resetStats()

> **resetStats**(): `void`

Defined in: [packages/security/src/bounded-set.ts:583](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L583)

Reset statistics counters

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [packages/security/src/bounded-set.ts:592](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L592)

Destroy the map and cleanup resources (timers, etc.)

#### Returns

`void`
