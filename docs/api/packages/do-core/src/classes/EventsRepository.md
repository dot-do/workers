[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventsRepository

# Class: EventsRepository

Defined in: [packages/do-core/src/events-repository.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L54)

Repository for managing domain events in KV storage.

Events are stored with timestamp-based keys for ordered retrieval:
`{prefix}:{timestamp}:{id}`

## Example

```typescript
const repo = new EventsRepository(storage, 'events')

// Save an event
await repo.save({
  id: 'evt-123',
  type: 'user:created',
  data: { userId: '456', name: 'Alice' },
  timestamp: Date.now()
})

// Query events
const events = await repo.findSince(lastKnownTimestamp)
```

## Implements

- [`IRepository`](../interfaces/IRepository.md)\<[`DomainEvent`](../interfaces/DomainEvent.md)\>

## Constructors

### Constructor

> **new EventsRepository**(`storage`, `prefix`, `options?`): `EventsRepository`

Defined in: [packages/do-core/src/events-repository.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L61)

#### Parameters

##### storage

[`DOStorage`](../interfaces/DOStorage.md)

##### prefix

`string` = `'events'`

##### options?

###### maxEventsInMemory?

`number`

#### Returns

`EventsRepository`

## Properties

### storage

> `protected` `readonly` **storage**: [`DOStorage`](../interfaces/DOStorage.md)

Defined in: [packages/do-core/src/events-repository.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L55)

***

### prefix

> `protected` `readonly` **prefix**: `string`

Defined in: [packages/do-core/src/events-repository.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L56)

## Methods

### save()

> **save**(`event`): `Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>\>

Defined in: [packages/do-core/src/events-repository.ts:81](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L81)

Save an event to storage and update cache

#### Parameters

##### event

[`DomainEvent`](../interfaces/DomainEvent.md)

#### Returns

`Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>\>

#### Implementation of

[`IRepository`](../interfaces/IRepository.md).[`save`](../interfaces/IRepository.md#save)

***

### get()

> **get**(`id`): `Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\> \| `null`\>

Defined in: [packages/do-core/src/events-repository.ts:97](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L97)

Get event by ID (requires searching all events)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\> \| `null`\>

#### Implementation of

[`IRepository`](../interfaces/IRepository.md).[`get`](../interfaces/IRepository.md#get)

***

### delete()

> **delete**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/events-repository.ts:105](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L105)

Delete event by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`IRepository`](../interfaces/IRepository.md).[`delete`](../interfaces/IRepository.md#delete)

***

### find()

> **find**(`query?`): `Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]\>

Defined in: [packages/do-core/src/events-repository.ts:122](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L122)

Find events matching query options

#### Parameters

##### query?

[`QueryOptions`](../interfaces/QueryOptions.md)\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>\>

#### Returns

`Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]\>

#### Implementation of

[`IRepository`](../interfaces/IRepository.md).[`find`](../interfaces/IRepository.md#find)

***

### matchesFilter()

> `protected` **matchesFilter**(`value`, `filter`): `boolean`

Defined in: [packages/do-core/src/events-repository.ts:157](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L157)

Check if filter matches value

#### Parameters

##### value

`unknown`

##### filter

[`FilterCondition`](../interfaces/FilterCondition.md)

#### Returns

`boolean`

***

### findSince()

> **findSince**(`options`): `Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]\>

Defined in: [packages/do-core/src/events-repository.ts:183](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L183)

Find events since a timestamp with optional type/aggregate filtering

#### Parameters

##### options

[`EventQueryOptions`](../interfaces/EventQueryOptions.md) = `{}`

#### Returns

`Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]\>

***

### getAll()

> **getAll**(): `Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]\>

Defined in: [packages/do-core/src/events-repository.ts:214](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L214)

Get all events (alias for find with no options)

#### Returns

`Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]\>

***

### count()

> **count**(`query?`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/events-repository.ts:221](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L221)

Count events matching optional filters

#### Parameters

##### query?

[`QueryOptions`](../interfaces/QueryOptions.md)\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>\>

#### Returns

`Promise`\<`number`\>

***

### clear()

> **clear**(): `Promise`\<`number`\>

Defined in: [packages/do-core/src/events-repository.ts:229](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L229)

Clear all events from storage and cache

#### Returns

`Promise`\<`number`\>

***

### getCache()

> **getCache**(): [`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]

Defined in: [packages/do-core/src/events-repository.ts:246](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L246)

Get the in-memory event cache (for testing/debugging)

#### Returns

[`DomainEvent`](../interfaces/DomainEvent.md)\<`unknown`\>[]

***

### reloadCache()

> **reloadCache**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/events-repository.ts:253](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L253)

Force reload cache from storage

#### Returns

`Promise`\<`void`\>

***

### isCacheLoaded()

> **isCacheLoaded**(): `boolean`

Defined in: [packages/do-core/src/events-repository.ts:261](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L261)

Check if cache is loaded

#### Returns

`boolean`
