[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventStore

# Class: EventStore

Defined in: [packages/do-core/src/event-store.ts:550](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L550)

Event Store implementation using SQL storage.

Provides stream-based event sourcing with optimistic concurrency control,
customizable serialization, and pluggable ID generation.

## Implements

## Example

```typescript
// Basic usage
const store = new EventStore(ctx.storage.sql)

// With custom options
const store = new EventStore(ctx.storage.sql, {
  idGenerator: () => ulid(),
  serializer: customSerializer,
})

// Append event to stream
const result = await store.append({
  streamId: 'order-123',
  type: 'OrderCreated',
  payload: { customerId: 'cust-456', total: 99.99 },
  expectedVersion: 0, // New stream
})

// Batch append
const batchResult = await store.appendBatch({
  streamId: 'order-123',
  expectedVersion: 1,
  events: [
    { type: 'ItemAdded', payload: { itemId: 'item-1' } },
    { type: 'ItemAdded', payload: { itemId: 'item-2' } },
  ],
})

// Read events from stream
const events = await store.readStream('order-123')

// Check stream version
const version = await store.getStreamVersion('order-123')
```

## Implements

- [`IEventStore`](../interfaces/IEventStore.md)

## Constructors

### Constructor

> **new EventStore**(`sql`, `options?`): `EventStore`

Defined in: [packages/do-core/src/event-store.ts:572](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L572)

Create a new EventStore instance.

#### Parameters

##### sql

[`SqlStorage`](../interfaces/SqlStorage.md)

SQL storage instance (from Durable Object ctx.storage.sql)

##### options?

[`EventStoreOptions`](../interfaces/EventStoreOptions.md)

Optional configuration for ID generation, serialization, etc.

#### Returns

`EventStore`

## Methods

### append()

> **append**\<`T`\>(`input`): `Promise`\<[`AppendResult`](../interfaces/AppendResult.md)\>

Defined in: [packages/do-core/src/event-store.ts:598](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L598)

Append an event to a stream with optimistic concurrency control.

#### Type Parameters

##### T

`T`

#### Parameters

##### input

`AppendEventInput`\<`T`\>

Event data to append

#### Returns

`Promise`\<[`AppendResult`](../interfaces/AppendResult.md)\>

The appended event and current stream version

#### Throws

If expectedVersion doesn't match actual version

#### Implementation of

[`IEventStore`](../interfaces/IEventStore.md).[`append`](../interfaces/IEventStore.md#append)

***

### appendBatch()

> **appendBatch**\<`T`\>(`input`): `Promise`\<[`AppendBatchResult`](../interfaces/AppendBatchResult.md)\>

Defined in: [packages/do-core/src/event-store.ts:663](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L663)

Append multiple events to a stream atomically.

All events are appended with sequential versions starting from
currentVersion + 1. If the expectedVersion check fails, no events
are appended.

#### Type Parameters

##### T

`T`

#### Parameters

##### input

[`AppendBatchInput`](../interfaces/AppendBatchInput.md)\<`T`\>

Batch input with stream ID, expected version, and events

#### Returns

`Promise`\<[`AppendBatchResult`](../interfaces/AppendBatchResult.md)\>

The appended events and final stream version

#### Throws

If expectedVersion doesn't match actual version

#### Implementation of

[`IEventStore`](../interfaces/IEventStore.md).[`appendBatch`](../interfaces/IEventStore.md#appendbatch)

***

### readStream()

> **readStream**(`streamId`, `options?`): `Promise`\<[`StreamDomainEvent`](../interfaces/StreamDomainEvent.md)\<`unknown`\>[]\>

Defined in: [packages/do-core/src/event-store.ts:735](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L735)

Read events from a stream.

#### Parameters

##### streamId

`string`

Stream identifier

##### options?

[`ReadStreamOptions`](../interfaces/ReadStreamOptions.md)

Read options (fromVersion, toVersion, limit, reverse)

#### Returns

`Promise`\<[`StreamDomainEvent`](../interfaces/StreamDomainEvent.md)\<`unknown`\>[]\>

Array of events in version order (or reverse order if specified)

#### Implementation of

[`IEventStore`](../interfaces/IEventStore.md).[`readStream`](../interfaces/IEventStore.md#readstream)

***

### getStreamVersion()

> **getStreamVersion**(`streamId`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/event-store.ts:775](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L775)

Get the current version of a stream.

#### Parameters

##### streamId

`string`

Stream identifier

#### Returns

`Promise`\<`number`\>

Current version (0 if stream doesn't exist)

#### Implementation of

[`IEventStore`](../interfaces/IEventStore.md).[`getStreamVersion`](../interfaces/IEventStore.md#getstreamversion)

***

### streamExists()

> **streamExists**(`streamId`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/event-store.ts:794](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L794)

Check if a stream exists.

#### Parameters

##### streamId

`string`

Stream identifier

#### Returns

`Promise`\<`boolean`\>

true if stream has at least one event

#### Implementation of

[`IEventStore`](../interfaces/IEventStore.md).[`streamExists`](../interfaces/IEventStore.md#streamexists)
