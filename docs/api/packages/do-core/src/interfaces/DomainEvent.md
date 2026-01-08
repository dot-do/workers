[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / DomainEvent

# Interface: DomainEvent\<T\>

Defined in: [packages/do-core/src/events.ts:19](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L19)

Domain event structure for event sourcing

## Type Parameters

### T

`T` = `unknown`

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/events.ts:21](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L21)

Unique event ID

***

### type

> **type**: `string`

Defined in: [packages/do-core/src/events.ts:23](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L23)

Event type (e.g., 'user.created', 'order.shipped')

***

### data

> **data**: `T`

Defined in: [packages/do-core/src/events.ts:25](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L25)

Event payload data

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/do-core/src/events.ts:27](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L27)

Unix timestamp (ms) when event occurred

***

### aggregateId?

> `optional` **aggregateId**: `string`

Defined in: [packages/do-core/src/events.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L29)

Optional aggregate ID this event belongs to

***

### version?

> `optional` **version**: `number`

Defined in: [packages/do-core/src/events.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L31)

Optional event version for ordering

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/events.ts:33](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events.ts#L33)

Optional metadata
