[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AppendBatchResult

# Interface: AppendBatchResult

Defined in: [packages/do-core/src/event-store.ts:154](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L154)

Result of batch appending multiple events.

## Properties

### events

> **events**: [`StreamDomainEvent`](StreamDomainEvent.md)\<`unknown`\>[]

Defined in: [packages/do-core/src/event-store.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L156)

The appended events with generated IDs and versions

***

### currentVersion

> **currentVersion**: `number`

Defined in: [packages/do-core/src/event-store.ts:158](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L158)

Current stream version after batch append
