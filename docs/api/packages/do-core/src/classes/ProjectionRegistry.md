[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ProjectionRegistry

# Class: ProjectionRegistry

Defined in: [packages/do-core/src/projections.ts:245](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L245)

Registry for managing multiple projections.

Allows:
- Registering projections by name
- Applying events to all projections
- Rebuilding all projections from event history

## Example

```typescript
const registry = new ProjectionRegistry()
registry.register(userProjection)
registry.register(orderProjection)

// Apply event to all projections
await registry.applyToAll(event)

// Rebuild all from history
await registry.rebuildAll(allEvents)
```

## Constructors

### Constructor

> **new ProjectionRegistry**(): `ProjectionRegistry`

Defined in: [packages/do-core/src/projections.ts:249](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L249)

#### Returns

`ProjectionRegistry`

## Methods

### register()

> **register**\<`TState`\>(`projection`): `void`

Defined in: [packages/do-core/src/projections.ts:256](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L256)

Register a projection

#### Type Parameters

##### TState

`TState`

#### Parameters

##### projection

[`Projection`](Projection.md)\<`TState`\>

#### Returns

`void`

***

### get()

> **get**\<`TState`\>(`name`): [`Projection`](Projection.md)\<`TState`\> \| `undefined`

Defined in: [packages/do-core/src/projections.ts:263](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L263)

Get a projection by name

#### Type Parameters

##### TState

`TState` = `unknown`

#### Parameters

##### name

`string`

#### Returns

[`Projection`](Projection.md)\<`TState`\> \| `undefined`

***

### getNames()

> **getNames**(): `string`[]

Defined in: [packages/do-core/src/projections.ts:270](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L270)

Get all registered projection names

#### Returns

`string`[]

***

### applyToAll()

> **applyToAll**\<`TEventData`\>(`event`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:277](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L277)

Apply an event to all registered projections

#### Type Parameters

##### TEventData

`TEventData` = `unknown`

#### Parameters

##### event

[`DomainEvent`](../interfaces/DomainEvent.md)\<`TEventData`\>

#### Returns

`Promise`\<`void`\>

***

### rebuildAll()

> **rebuildAll**\<`TEventData`\>(`events`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/projections.ts:286](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L286)

Rebuild all projections from event history

#### Type Parameters

##### TEventData

`TEventData` = `unknown`

#### Parameters

##### events

[`DomainEvent`](../interfaces/DomainEvent.md)\<`TEventData`\>[]

#### Returns

`Promise`\<`void`\>
