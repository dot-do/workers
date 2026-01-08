[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / Projection

# Class: Projection\<TState\>

Defined in: [packages/do-core/src/projections.ts:71](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L71)

A projection that transforms events into a read model.

Projections:
- Register handlers for specific event types
- Apply events to build/update state
- Track position in event stream for catch-up
- Support full rebuilds from event history

## Example

```typescript
const userProjection = new Projection<Map<string, User>>('users', {
  initialState: () => new Map(),
})

userProjection.when<UserCreatedEvent>('user:created', (event, state) => {
  state.set(event.data.userId, {
    id: event.data.userId,
    name: event.data.name,
  })
  return state
})

await userProjection.apply(event)
const users = userProjection.getState()
```

## Type Parameters

### TState

`TState` = `unknown`

## Constructors

### Constructor

> **new Projection**\<`TState`\>(`name`, `options`): `Projection`\<`TState`\>

Defined in: [packages/do-core/src/projections.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L89)

#### Parameters

##### name

`string`

##### options

[`ProjectionOptions`](../interfaces/ProjectionOptions.md)\<`TState`\>

#### Returns

`Projection`\<`TState`\>

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/do-core/src/projections.ts:72](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L72)

## Methods

### when()

> **when**\<`TEventData`\>(`eventType`, `handler`): `this`

Defined in: [packages/do-core/src/projections.ts:99](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L99)

Register a handler for a specific event type

#### Type Parameters

##### TEventData

`TEventData` = `unknown`

#### Parameters

##### eventType

`string`

##### handler

[`ProjectionHandler`](../type-aliases/ProjectionHandler.md)\<`TEventData`, `TState`\>

#### Returns

`this`

***

### getHandlers()

> **getHandlers**(): `Record`\<`string`, [`ProjectionHandler`](../type-aliases/ProjectionHandler.md)\>

Defined in: [packages/do-core/src/projections.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L113)

Get all registered handlers

#### Returns

`Record`\<`string`, [`ProjectionHandler`](../type-aliases/ProjectionHandler.md)\>

***

### getHandlerCount()

> **getHandlerCount**(): `number`

Defined in: [packages/do-core/src/projections.ts:124](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L124)

Get the number of registered handlers

#### Returns

`number`

***

### apply()

> **apply**\<`TEventData`\>(`event`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:131](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L131)

Apply a single event to update projection state

#### Type Parameters

##### TEventData

`TEventData` = `unknown`

#### Parameters

##### event

[`DomainEvent`](../interfaces/DomainEvent.md)\<`TEventData`\>

#### Returns

`Promise`\<`void`\>

***

### applyBatch()

> **applyBatch**\<`TEventData`\>(`events`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:144](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L144)

Apply multiple events in batch

#### Type Parameters

##### TEventData

`TEventData` = `unknown`

#### Parameters

##### events

[`DomainEvent`](../interfaces/DomainEvent.md)\<`TEventData`\>[]

#### Returns

`Promise`\<`void`\>

***

### getState()

> **getState**(): `TState`

Defined in: [packages/do-core/src/projections.ts:153](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L153)

Get the current projection state

#### Returns

`TState`

***

### getReadOnlyState()

> **getReadOnlyState**(): [`ProjectionState`](../type-aliases/ProjectionState.md)\<`TState`\>

Defined in: [packages/do-core/src/projections.ts:160](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L160)

Get a read-only view of the state

#### Returns

[`ProjectionState`](../type-aliases/ProjectionState.md)\<`TState`\>

***

### getPosition()

> **getPosition**(): `number`

Defined in: [packages/do-core/src/projections.ts:176](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L176)

Get the current position (timestamp of last processed event)

#### Returns

`number`

***

### catchUp()

> **catchUp**\<`TEventData`\>(`events`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:183](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L183)

Catch up by processing events since last position

#### Type Parameters

##### TEventData

`TEventData` = `unknown`

#### Parameters

##### events

[`DomainEvent`](../interfaces/DomainEvent.md)\<`TEventData`\>[]

#### Returns

`Promise`\<`void`\>

***

### savePosition()

> **savePosition**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:190](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L190)

Save the current position to storage

#### Returns

`Promise`\<`void`\>

***

### loadPosition()

> **loadPosition**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:199](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L199)

Load the position from storage

#### Returns

`Promise`\<`void`\>

***

### rebuild()

> **rebuild**\<`TEventData`\>(`events`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:211](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L211)

Rebuild projection from scratch using provided events

#### Type Parameters

##### TEventData

`TEventData` = `unknown`

#### Parameters

##### events

[`DomainEvent`](../interfaces/DomainEvent.md)\<`TEventData`\>[]

#### Returns

`Promise`\<`void`\>
