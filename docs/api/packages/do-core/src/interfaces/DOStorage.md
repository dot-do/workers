[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / DOStorage

# Interface: DOStorage

Defined in: [packages/do-core/src/core.ts:38](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L38)

Storage interface for DO state persistence

## Properties

### sql

> `readonly` **sql**: [`SqlStorage`](SqlStorage.md)

Defined in: [packages/do-core/src/core.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L58)

## Methods

### get()

#### Call Signature

> **get**\<`T`\>(`key`): `Promise`\<`T` \| `undefined`\>

Defined in: [packages/do-core/src/core.ts:40](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L40)

##### Type Parameters

###### T

`T` = `unknown`

##### Parameters

###### key

`string`

##### Returns

`Promise`\<`T` \| `undefined`\>

#### Call Signature

> **get**\<`T`\>(`keys`): `Promise`\<`Map`\<`string`, `T`\>\>

Defined in: [packages/do-core/src/core.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L41)

##### Type Parameters

###### T

`T` = `unknown`

##### Parameters

###### keys

`string`[]

##### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

***

### put()

#### Call Signature

> **put**\<`T`\>(`key`, `value`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:42](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L42)

##### Type Parameters

###### T

`T`

##### Parameters

###### key

`string`

###### value

`T`

##### Returns

`Promise`\<`void`\>

#### Call Signature

> **put**\<`T`\>(`entries`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L43)

##### Type Parameters

###### T

`T`

##### Parameters

###### entries

`Record`\<`string`, `T`\>

##### Returns

`Promise`\<`void`\>

***

### delete()

#### Call Signature

> **delete**(`key`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/core.ts:44](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L44)

##### Parameters

###### key

`string`

##### Returns

`Promise`\<`boolean`\>

#### Call Signature

> **delete**(`keys`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/core.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L45)

##### Parameters

###### keys

`string`[]

##### Returns

`Promise`\<`number`\>

***

### deleteAll()

> **deleteAll**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L46)

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**\<`T`\>(`options?`): `Promise`\<`Map`\<`string`, `T`\>\>

Defined in: [packages/do-core/src/core.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L47)

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### options?

[`ListOptions`](ListOptions.md)

#### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

***

### getAlarm()

> **getAlarm**(): `Promise`\<`number` \| `null`\>

Defined in: [packages/do-core/src/core.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L50)

#### Returns

`Promise`\<`number` \| `null`\>

***

### setAlarm()

> **setAlarm**(`scheduledTime`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:51](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L51)

#### Parameters

##### scheduledTime

`number` | `Date`

#### Returns

`Promise`\<`void`\>

***

### deleteAlarm()

> **deleteAlarm**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L52)

#### Returns

`Promise`\<`void`\>

***

### transaction()

> **transaction**\<`T`\>(`closure`): `Promise`\<`T`\>

Defined in: [packages/do-core/src/core.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L55)

#### Type Parameters

##### T

`T`

#### Parameters

##### closure

(`txn`) => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>
