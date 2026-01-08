[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ProjectionHandler

# Type Alias: ProjectionHandler()\<TEventData, TState\>

> **ProjectionHandler**\<`TEventData`, `TState`\> = (`event`, `state`) => `TState` \| `Promise`\<`TState`\>

Defined in: [packages/do-core/src/projections.ts:20](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L20)

Handler function that processes an event and updates projection state

## Type Parameters

### TEventData

`TEventData` = `unknown`

### TState

`TState` = `unknown`

## Parameters

### event

[`DomainEvent`](../interfaces/DomainEvent.md)\<`TEventData`\>

### state

`TState`

## Returns

`TState` \| `Promise`\<`TState`\>
