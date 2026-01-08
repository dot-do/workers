[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ReadStreamOptions

# Interface: ReadStreamOptions

Defined in: [packages/do-core/src/event-store.ts:130](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L130)

Options for reading events from a stream.

## Properties

### fromVersion?

> `optional` **fromVersion**: `number`

Defined in: [packages/do-core/src/event-store.ts:132](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L132)

Start reading from this version (inclusive, default: 1)

***

### toVersion?

> `optional` **toVersion**: `number`

Defined in: [packages/do-core/src/event-store.ts:134](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L134)

Read up to this version (inclusive)

***

### limit?

> `optional` **limit**: `number`

Defined in: [packages/do-core/src/event-store.ts:136](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L136)

Maximum number of events to return

***

### reverse?

> `optional` **reverse**: `boolean`

Defined in: [packages/do-core/src/event-store.ts:138](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L138)

Read in reverse order (newest first, default: false)
