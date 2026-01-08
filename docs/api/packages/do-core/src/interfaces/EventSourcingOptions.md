[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventSourcingOptions

# Interface: EventSourcingOptions

Defined in: [packages/do-core/src/events.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L57)

Options for event sourcing operations

## Properties

### eventPrefix?

> `optional` **eventPrefix**: `string`

Defined in: [packages/do-core/src/events.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L59)

Storage prefix for event log (default: 'events:')

***

### maxEventsInMemory?

> `optional` **maxEventsInMemory**: `number`

Defined in: [packages/do-core/src/events.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L61)

Maximum events to keep in memory (default: 1000)
