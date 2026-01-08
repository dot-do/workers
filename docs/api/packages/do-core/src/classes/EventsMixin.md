[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventsMixin

# Abstract Class: EventsMixin\<Env\>

Defined in: [packages/do-core/src/events.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L113)

Abstract base class providing event handling functionality.

Use this as a mixin by having your DO class extend it or
compose it with other mixins.

## Event Pub/Sub
```typescript
class MyDO extends EventsMixin {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)

    this.on('user:login', (data) => {
      console.log('User logged in:', data.userId)
    })
  }

  async handleLogin(userId: string) {
    // ... perform login
    await this.emit('user:login', { userId, timestamp: Date.now() })
  }
}
```

## Event Sourcing
```typescript
class OrderDO extends EventsMixin {
  private total = 0

  async addItem(item: Item) {
    await this.appendEvent({
      type: 'item:added',
      data: item,
    })
    this.total += item.price
  }

  async rebuildState(): Promise<void> {
    this.total = 0
    const events = await this.getEvents()
    for (const event of events) {
      if (event.type === 'item:added') {
        this.total += (event.data as Item).price
      }
    }
  }
}
```

## Type Parameters

### Env

`Env` = `unknown`

## Constructors

### Constructor

> **new EventsMixin**\<`Env`\>(`ctx`, `env`, `options?`): `EventsMixin`\<`Env`\>

Defined in: [packages/do-core/src/events.ts:126](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L126)

#### Parameters

##### ctx

[`DOState`](../interfaces/DOState.md)

##### env

`Env`

##### options?

[`EventSourcingOptions`](../interfaces/EventSourcingOptions.md)

#### Returns

`EventsMixin`\<`Env`\>

## Properties

### ctx

> `protected` `readonly` **ctx**: [`DOState`](../interfaces/DOState.md)

Defined in: [packages/do-core/src/events.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L114)

***

### env

> `protected` `readonly` **env**: `Env`

Defined in: [packages/do-core/src/events.ts:115](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L115)

## Methods

### getEventsRepository()

> `protected` **getEventsRepository**(): [`EventsRepository`](EventsRepository.md)

Defined in: [packages/do-core/src/events.ts:144](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L144)

Get the events repository for direct access if needed

#### Returns

[`EventsRepository`](EventsRepository.md)

***

### emit()

> **emit**\<`T`\>(`event`, `data`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/events.ts:159](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L159)

Emit an event to all subscribers

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`string`

Event type (e.g., 'user:created')

##### data

`T`

Event data payload

#### Returns

`Promise`\<`void`\>

Promise that resolves when all handlers complete

***

### on()

> **on**\<`T`\>(`event`, `handler`): [`Unsubscribe`](../type-aliases/Unsubscribe.md)

Defined in: [packages/do-core/src/events.ts:191](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L191)

Subscribe to an event

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`string`

Event type to listen for

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<`T`\>

Handler function called when event fires

#### Returns

[`Unsubscribe`](../type-aliases/Unsubscribe.md)

Unsubscribe function

***

### once()

> **once**\<`T`\>(`event`, `handler`): [`Unsubscribe`](../type-aliases/Unsubscribe.md)

Defined in: [packages/do-core/src/events.ts:202](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L202)

Subscribe to an event once (auto-unsubscribe after first call)

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`string`

Event type to listen for

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<`T`\>

Handler function called when event fires

#### Returns

[`Unsubscribe`](../type-aliases/Unsubscribe.md)

Unsubscribe function

***

### off()

> **off**\<`T`\>(`event`, `handler`): `void`

Defined in: [packages/do-core/src/events.ts:212](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L212)

Unsubscribe from an event

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`string`

Event type

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<`T`\>

The handler to remove

#### Returns

`void`

***

### removeAllListeners()

> **removeAllListeners**(`event?`): `void`

Defined in: [packages/do-core/src/events.ts:229](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L229)

Remove all subscribers for an event (or all events if no type specified)

#### Parameters

##### event?

`string`

Optional event type to clear

#### Returns

`void`

***

### listenerCount()

> **listenerCount**(`event`): `number`

Defined in: [packages/do-core/src/events.ts:243](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L243)

Get the number of listeners for an event

#### Parameters

##### event

`string`

Event type

#### Returns

`number`

Number of listeners

***

### eventNames()

> **eventNames**(): `string`[]

Defined in: [packages/do-core/src/events.ts:252](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L252)

Get all registered event types

#### Returns

`string`[]

Array of event type strings

***

### appendEvent()

> **appendEvent**\<`T`\>(`event`): `Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>\>

Defined in: [packages/do-core/src/events.ts:284](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L284)

Append an event to the event log

This persists the event to storage via the repository and updates the in-memory cache.
Events are stored with timestamp-based keys for ordering.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`Omit`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>, `"id"` \| `"timestamp"`\> & `Partial`\<`Pick`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>, `"id"` \| `"timestamp"`\>\>

Partial event (id and timestamp will be generated if missing)

#### Returns

`Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>\>

The complete persisted event

***

### getEvents()

> **getEvents**\<`T`\>(`since?`, `options?`): `Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>[]\>

Defined in: [packages/do-core/src/events.ts:313](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L313)

Get events from the event log

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### since?

`number`

Optional timestamp to get events after

##### options?

Optional query options

###### limit?

`number`

###### type?

`string`

###### aggregateId?

`string`

#### Returns

`Promise`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>[]\>

Array of events ordered by timestamp

***

### rebuildState()

> **rebuildState**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/events.ts:344](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L344)

Rebuild state from event log

Override this method in your subclass to implement state reconstruction:

```typescript
async rebuildState(): Promise<void> {
  this.state = initialState()
  const events = await this.getEvents()
  for (const event of events) {
    this.applyEvent(event)
  }
}
```

#### Returns

`Promise`\<`void`\>

***

### clearEvents()

> **clearEvents**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/events.ts:355](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L355)

Clear all events from storage and cache

Use with caution - this permanently deletes the event log.

#### Returns

`Promise`\<`void`\>

***

### getEventCount()

> **getEventCount**(): `Promise`\<`number`\>

Defined in: [packages/do-core/src/events.ts:362](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L362)

Get the total number of events in storage

#### Returns

`Promise`\<`number`\>

***

### broadcast()

> **broadcast**\<`T`\>(`event`, `data`, `options?`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/events.ts:378](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L378)

Broadcast an event to all connected WebSockets

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`string`

Event type

##### data

`T`

Event data

##### options?

Broadcast options

###### tag?

`string`

Only send to WebSockets with this tag

###### excludeAttachment?

\{ `key`: `string`; `value`: `unknown`; \}

Exclude WebSocket with this attachment property

###### excludeAttachment.key

`string`

###### excludeAttachment.value

`unknown`

#### Returns

`Promise`\<`number`\>

Number of WebSockets the message was sent to

***

### broadcastToRoom()

> **broadcastToRoom**\<`T`\>(`room`, `event`, `data`): `Promise`\<`number`\>

Defined in: [packages/do-core/src/events.ts:428](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L428)

Broadcast to a specific room (WebSocket tag)

Convenience method equivalent to broadcast(event, data, { tag: `room:${room}` })

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### room

`string`

Room name (will be prefixed with 'room:')

##### event

`string`

Event type

##### data

`T`

Event data

#### Returns

`Promise`\<`number`\>

Number of WebSockets the message was sent to

***

### emitAndBroadcast()

> **emitAndBroadcast**\<`T`\>(`event`, `data`, `broadcastOptions?`): `Promise`\<\{ `listeners`: `number`; `sockets`: `number`; \}\>

Defined in: [packages/do-core/src/events.ts:441](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L441)

Emit an event and broadcast it to WebSockets

Combines local event emission with WebSocket broadcast.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`string`

Event type

##### data

`T`

Event data

##### broadcastOptions?

Optional broadcast options

###### tag?

`string`

Only send to WebSockets with this tag

###### excludeAttachment?

\{ `key`: `string`; `value`: `unknown`; \}

Exclude WebSocket with this attachment property

###### excludeAttachment.key

`string`

###### excludeAttachment.value

`unknown`

#### Returns

`Promise`\<\{ `listeners`: `number`; `sockets`: `number`; \}\>

***

### appendAndBroadcast()

> **appendAndBroadcast**\<`T`\>(`event`, `broadcastOptions?`): `Promise`\<\{ `event`: [`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>; `sockets`: `number`; \}\>

Defined in: [packages/do-core/src/events.ts:460](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L460)

Append an event and broadcast it

Combines event sourcing with WebSocket broadcast.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### event

`Omit`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>, `"id"` \| `"timestamp"`\> & `Partial`\<`Pick`\<[`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>, `"id"` \| `"timestamp"`\>\>

Event to append

##### broadcastOptions?

Optional broadcast options

###### tag?

`string`

Only send to WebSockets with this tag

###### excludeAttachment?

\{ `key`: `string`; `value`: `unknown`; \}

Exclude WebSocket with this attachment property

###### excludeAttachment.key

`string`

###### excludeAttachment.value

`unknown`

#### Returns

`Promise`\<\{ `event`: [`DomainEvent`](../interfaces/DomainEvent.md)\<`T`\>; `sockets`: `number`; \}\>
