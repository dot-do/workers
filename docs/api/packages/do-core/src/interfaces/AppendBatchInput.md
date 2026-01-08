[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AppendBatchInput

# Interface: AppendBatchInput\<T\>

Defined in: [packages/do-core/src/event-store.ts:111](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L111)

Input for batch appending multiple events to a stream.

All events in a batch must belong to the same stream and are appended
atomically with sequential versions.

## Type Parameters

### T

`T` = `unknown`

The type of the event payloads

## Properties

### streamId

> **streamId**: `string`

Defined in: [packages/do-core/src/event-store.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L113)

Stream identifier (all events go to this stream)

***

### expectedVersion?

> `optional` **expectedVersion**: `number`

Defined in: [packages/do-core/src/event-store.ts:115](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L115)

Expected version before batch append (0 for new streams)

***

### events

> **events**: `object`[]

Defined in: [packages/do-core/src/event-store.ts:117](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L117)

Events to append (in order)

#### type

> **type**: `string`

Event type

#### payload

> **payload**: `T`

Event payload

#### metadata?

> `optional` **metadata**: [`EventMetadata`](EventMetadata.md)

Optional metadata for tracing and context
