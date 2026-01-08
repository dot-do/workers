[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IEventStore

# Interface: IEventStore

Defined in: [packages/do-core/src/event-store.ts:298](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L298)

Event Store interface for stream-based event sourcing.

Defines the contract for event store implementations. The event store
provides stream-based storage with monotonic versioning, optimistic
concurrency control, and support for distributed tracing via metadata.

## Example

```typescript
class CustomEventStore implements IEventStore {
  async append<T>(input: AppendEventInput<T>): Promise<AppendResult> {
    // Custom implementation
  }
  // ... other methods
}
```

## Methods

### append()

> **append**\<`T`\>(`input`): `Promise`\<[`AppendResult`](AppendResult.md)\>

Defined in: [packages/do-core/src/event-store.ts:318](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L318)

Append a single event to a stream.

#### Type Parameters

##### T

`T`

The type of the event payload

#### Parameters

##### input

`AppendEventInput`\<`T`\>

Event data to append

#### Returns

`Promise`\<[`AppendResult`](AppendResult.md)\>

The appended event and current stream version

#### Throws

If expectedVersion doesn't match actual version

#### Example

```typescript
const result = await store.append({
  streamId: 'order-123',
  type: 'OrderCreated',
  payload: { customerId: 'cust-456' },
  expectedVersion: 0, // New stream
})
console.log(result.event.version) // 1
```

***

### appendBatch()

> **appendBatch**\<`T`\>(`input`): `Promise`\<[`AppendBatchResult`](AppendBatchResult.md)\>

Defined in: [packages/do-core/src/event-store.ts:344](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L344)

Append multiple events to a stream atomically.

All events are appended in a single transaction with sequential versions.
If any event fails (e.g., concurrency conflict), no events are appended.

#### Type Parameters

##### T

`T`

The type of the event payloads

#### Parameters

##### input

[`AppendBatchInput`](AppendBatchInput.md)\<`T`\>

Batch input with stream ID, expected version, and events

#### Returns

`Promise`\<[`AppendBatchResult`](AppendBatchResult.md)\>

The appended events and final stream version

#### Throws

If expectedVersion doesn't match actual version

#### Example

```typescript
const result = await store.appendBatch({
  streamId: 'order-123',
  expectedVersion: 1,
  events: [
    { type: 'ItemAdded', payload: { itemId: 'item-1' } },
    { type: 'ItemAdded', payload: { itemId: 'item-2' } },
  ],
})
console.log(result.currentVersion) // 3
```

***

### readStream()

> **readStream**(`streamId`, `options?`): `Promise`\<[`StreamDomainEvent`](StreamDomainEvent.md)\<`unknown`\>[]\>

Defined in: [packages/do-core/src/event-store.ts:366](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L366)

Read events from a stream.

#### Parameters

##### streamId

`string`

Stream identifier

##### options?

[`ReadStreamOptions`](ReadStreamOptions.md)

Read options (fromVersion, toVersion, limit, reverse)

#### Returns

`Promise`\<[`StreamDomainEvent`](StreamDomainEvent.md)\<`unknown`\>[]\>

Array of events in version order (or reverse if specified)

#### Example

```typescript
// Read all events
const events = await store.readStream('order-123')

// Read with options
const recentEvents = await store.readStream('order-123', {
  fromVersion: 5,
  limit: 10,
  reverse: true,
})
```

***

### getStreamVersion()

> **getStreamVersion**(`streamId`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/event-store.ts:382](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L382)

Get the current version of a stream.

#### Parameters

##### streamId

`string`

Stream identifier

#### Returns

`Promise`\<`number`\>

Current version (0 if stream doesn't exist)

#### Example

```typescript
const version = await store.getStreamVersion('order-123')
if (version === 0) {
  console.log('Stream does not exist')
}
```

***

### streamExists()

> **streamExists**(`streamId`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/event-store.ts:397](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L397)

Check if a stream exists (has at least one event).

#### Parameters

##### streamId

`string`

Stream identifier

#### Returns

`Promise`\<`boolean`\>

true if stream has at least one event

#### Example

```typescript
if (await store.streamExists('order-123')) {
  const events = await store.readStream('order-123')
}
```
