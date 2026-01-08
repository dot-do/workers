[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / BoundedSet

# Class: BoundedSet\<T\>

Defined in: [packages/security/src/bounded-set.ts:96](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L96)

A Set implementation with bounded size to prevent memory leaks.

Useful for tracking branded types like validated IDs, used tokens,
or nonces without risking unbounded memory growth.

## Example

```ts
type UserId = string & { __brand: 'UserId' }

const validatedUsers = new BoundedSet<UserId>({
  maxSize: 10000,
  evictionPolicy: 'lru',
  ttlMs: 60000, // 1 minute TTL
})

validatedUsers.add(userId)
if (validatedUsers.has(userId)) {
  // User was recently validated
}
```

## Type Parameters

### T

`T`

## Implements

- `Iterable`\<`T`\>

## Constructors

### Constructor

> **new BoundedSet**\<`T`\>(`options?`): `BoundedSet`\<`T`\>

Defined in: [packages/security/src/bounded-set.ts:109](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L109)

#### Parameters

##### options?

[`BoundedSetOptions`](../interfaces/BoundedSetOptions.md)\<`T`\>

#### Returns

`BoundedSet`\<`T`\>

## Accessors

### maxSize

#### Get Signature

> **get** **maxSize**(): `number`

Defined in: [packages/security/src/bounded-set.ts:133](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L133)

##### Returns

`number`

***

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [packages/security/src/bounded-set.ts:137](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L137)

##### Returns

`number`

***

### stats

#### Get Signature

> **get** **stats**(): [`BoundedSetStats`](../interfaces/BoundedSetStats.md)

Defined in: [packages/security/src/bounded-set.ts:141](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L141)

##### Returns

[`BoundedSetStats`](../interfaces/BoundedSetStats.md)

## Methods

### add()

> **add**(`value`): `this`

Defined in: [packages/security/src/bounded-set.ts:151](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L151)

#### Parameters

##### value

`T`

#### Returns

`this`

***

### has()

> **has**(`value`): `boolean`

Defined in: [packages/security/src/bounded-set.ts:189](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L189)

#### Parameters

##### value

`T`

#### Returns

`boolean`

***

### delete()

> **delete**(`value`): `boolean`

Defined in: [packages/security/src/bounded-set.ts:223](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L223)

#### Parameters

##### value

`T`

#### Returns

`boolean`

***

### clear()

> **clear**(): `void`

Defined in: [packages/security/src/bounded-set.ts:227](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L227)

#### Returns

`void`

***

### forEach()

> **forEach**(`callback`): `void`

Defined in: [packages/security/src/bounded-set.ts:232](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L232)

#### Parameters

##### callback

(`value`, `value2`, `set`) => `void`

#### Returns

`void`

***

### values()

> **values**(): `IterableIterator`\<`T`\>

Defined in: [packages/security/src/bounded-set.ts:238](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L238)

#### Returns

`IterableIterator`\<`T`\>

***

### keys()

> **keys**(): `IterableIterator`\<`T`\>

Defined in: [packages/security/src/bounded-set.ts:244](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L244)

#### Returns

`IterableIterator`\<`T`\>

***

### entries()

> **entries**(): `IterableIterator`\<\[`T`, `T`\]\>

Defined in: [packages/security/src/bounded-set.ts:248](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L248)

#### Returns

`IterableIterator`\<\[`T`, `T`\]\>

***

### \[iterator\]()

> **\[iterator\]**(): `Iterator`\<`T`\>

Defined in: [packages/security/src/bounded-set.ts:254](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L254)

#### Returns

`Iterator`\<`T`\>

#### Implementation of

`Iterable.[iterator]`

***

### cleanup()

> **cleanup**(): `number`

Defined in: [packages/security/src/bounded-set.ts:262](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L262)

Manually trigger cleanup of expired entries

#### Returns

`number`

Number of entries removed

***

### resetStats()

> **resetStats**(): `void`

Defined in: [packages/security/src/bounded-set.ts:284](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L284)

Reset statistics counters

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [packages/security/src/bounded-set.ts:293](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/bounded-set.ts#L293)

Destroy the set and cleanup resources (timers, etc.)

#### Returns

`void`
