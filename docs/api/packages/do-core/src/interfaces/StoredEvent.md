[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / StoredEvent

# Interface: StoredEvent\<T\>

Defined in: [packages/do-core/src/event-mixin.ts:44](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L44)

A stored event in the event store (EventMixin variant)

## Type Parameters

### T

`T` = `unknown`

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/event-mixin.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L46)

Unique event identifier

***

### streamId

> **streamId**: `string`

Defined in: [packages/do-core/src/event-mixin.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L48)

Stream/aggregate ID this event belongs to

***

### type

> **type**: `string`

Defined in: [packages/do-core/src/event-mixin.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L50)

Event type (e.g., 'order.created', 'item.added')

***

### data

> **data**: `T`

Defined in: [packages/do-core/src/event-mixin.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L52)

Event payload data

***

### version

> **version**: `number`

Defined in: [packages/do-core/src/event-mixin.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L54)

Monotonically increasing version number within stream

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/do-core/src/event-mixin.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L56)

Unix timestamp when event was created

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/event-mixin.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L58)

Optional metadata (correlationId, userId, source, etc.)
