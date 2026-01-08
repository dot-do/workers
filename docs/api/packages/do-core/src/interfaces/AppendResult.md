[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AppendResult

# Interface: AppendResult

Defined in: [packages/do-core/src/event-store.ts:144](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L144)

Result of appending a single event.

## Properties

### event

> **event**: [`StreamDomainEvent`](StreamDomainEvent.md)

Defined in: [packages/do-core/src/event-store.ts:146](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L146)

The appended event with generated ID and version

***

### currentVersion

> **currentVersion**: `number`

Defined in: [packages/do-core/src/event-store.ts:148](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L148)

Current stream version after append
