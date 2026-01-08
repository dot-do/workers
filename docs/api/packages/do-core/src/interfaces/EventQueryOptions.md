[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventQueryOptions

# Interface: EventQueryOptions

Defined in: [packages/do-core/src/events-repository.ts:21](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L21)

Options for querying events

## Properties

### since?

> `optional` **since**: `number`

Defined in: [packages/do-core/src/events-repository.ts:23](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L23)

Get events after this timestamp

***

### type?

> `optional` **type**: `string`

Defined in: [packages/do-core/src/events-repository.ts:25](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L25)

Filter by event type

***

### aggregateId?

> `optional` **aggregateId**: `string`

Defined in: [packages/do-core/src/events-repository.ts:27](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L27)

Filter by aggregate ID

***

### limit?

> `optional` **limit**: `number`

Defined in: [packages/do-core/src/events-repository.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/events-repository.ts#L29)

Maximum number of events to return
