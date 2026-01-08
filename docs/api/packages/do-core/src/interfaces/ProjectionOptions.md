[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ProjectionOptions

# Interface: ProjectionOptions\<TState\>

Defined in: [packages/do-core/src/projections.ts:28](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L28)

Options for creating a projection

## Type Parameters

### TState

`TState`

## Properties

### initialState()

> **initialState**: () => `TState`

Defined in: [packages/do-core/src/projections.ts:30](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L30)

Factory function to create initial state

#### Returns

`TState`

***

### storage?

> `optional` **storage**: [`DOStorage`](DOStorage.md)

Defined in: [packages/do-core/src/projections.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/projections.ts#L32)

Optional storage for persisting projection position
