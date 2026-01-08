[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AppendEventInput

# Interface: AppendEventInput\<T\>

Defined in: [packages/do-core/src/event-mixin.ts:66](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L66)

Input for appending a new event (EventMixin variant)

Note: This differs from event-store.ts AppendEventInput by using 'data' instead of 'payload'

## Type Parameters

### T

`T` = `unknown`

## Properties

### streamId

> **streamId**: `string`

Defined in: [packages/do-core/src/event-mixin.ts:68](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L68)

Stream/aggregate ID this event belongs to

***

### type

> **type**: `string`

Defined in: [packages/do-core/src/event-mixin.ts:70](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L70)

Event type (e.g., 'order.created', 'item.added')

***

### data

> **data**: `T`

Defined in: [packages/do-core/src/event-mixin.ts:72](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L72)

Event payload data

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/event-mixin.ts:74](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L74)

Optional metadata

***

### expectedVersion?

> `optional` **expectedVersion**: `number`

Defined in: [packages/do-core/src/event-mixin.ts:76](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L76)

Expected version for optimistic locking (optional)
