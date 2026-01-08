[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IEventMixin

# Interface: IEventMixin

Defined in: [packages/do-core/src/event-mixin.ts:102](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L102)

Interface for classes that provide event sourcing operations

## Methods

### appendEvent()

> **appendEvent**\<`T`\>(`input`): `Promise`\<[`StoredEvent`](StoredEvent.md)\<`T`\>\>

Defined in: [packages/do-core/src/event-mixin.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L103)

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### input

[`AppendEventInput`](AppendEventInput.md)\<`T`\>

#### Returns

`Promise`\<[`StoredEvent`](StoredEvent.md)\<`T`\>\>

***

### getEvents()

> **getEvents**\<`T`\>(`streamId`, `options?`): `Promise`\<[`StoredEvent`](StoredEvent.md)\<`T`\>[]\>

Defined in: [packages/do-core/src/event-mixin.ts:104](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L104)

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### streamId

`string`

##### options?

[`GetEventsOptions`](GetEventsOptions.md)

#### Returns

`Promise`\<[`StoredEvent`](StoredEvent.md)\<`T`\>[]\>

***

### getLatestVersion()

> **getLatestVersion**(`streamId`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/event-mixin.ts:105](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L105)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`number`\>
