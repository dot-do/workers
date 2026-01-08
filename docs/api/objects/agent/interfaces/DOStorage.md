[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / DOStorage

# Interface: DOStorage

Defined in: [objects/agent/index.ts:71](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L71)

## Methods

### get()

#### Call Signature

> **get**\<`T`\>(`key`): `Promise`\<`T` \| `undefined`\>

Defined in: [objects/agent/index.ts:72](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L72)

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

Defined in: [objects/agent/index.ts:73](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L73)

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

Defined in: [objects/agent/index.ts:74](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L74)

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

Defined in: [objects/agent/index.ts:75](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L75)

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

Defined in: [objects/agent/index.ts:76](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L76)

##### Parameters

###### key

`string`

##### Returns

`Promise`\<`boolean`\>

#### Call Signature

> **delete**(`keys`): `Promise`\<`number`\>

Defined in: [objects/agent/index.ts:77](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L77)

##### Parameters

###### keys

`string`[]

##### Returns

`Promise`\<`number`\>

***

### deleteAll()

> **deleteAll**(): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L78)

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**\<`T`\>(`options?`): `Promise`\<`Map`\<`string`, `T`\>\>

Defined in: [objects/agent/index.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L79)

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### options?

###### prefix?

`string`

###### limit?

`number`

#### Returns

`Promise`\<`Map`\<`string`, `T`\>\>

***

### getAlarm()

> **getAlarm**(): `Promise`\<`number` \| `null`\>

Defined in: [objects/agent/index.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L80)

#### Returns

`Promise`\<`number` \| `null`\>

***

### setAlarm()

> **setAlarm**(`scheduledTime`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:81](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L81)

#### Parameters

##### scheduledTime

`number` | `Date`

#### Returns

`Promise`\<`void`\>

***

### deleteAlarm()

> **deleteAlarm**(): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:82](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L82)

#### Returns

`Promise`\<`void`\>
