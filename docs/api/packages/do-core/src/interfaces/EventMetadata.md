[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventMetadata

# Interface: EventMetadata

Defined in: [packages/do-core/src/event-store.ts:37](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L37)

Event metadata for tracking causation and correlation.

Metadata provides context for distributed tracing and event genealogy.
All fields are optional and custom fields can be added via index signature.

## Example

```typescript
const metadata: EventMetadata = {
  causationId: 'evt-123',      // Event that caused this one
  correlationId: 'req-abc',    // Request correlation ID
  userId: 'user-456',          // User who triggered the event
  tenantId: 'tenant-789',      // Custom field
}
```

## Indexable

\[`key`: `string`\]: `unknown`

Additional custom metadata

## Properties

### causationId?

> `optional` **causationId**: `string`

Defined in: [packages/do-core/src/event-store.ts:39](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L39)

ID of the event that caused this event

***

### correlationId?

> `optional` **correlationId**: `string`

Defined in: [packages/do-core/src/event-store.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L41)

Correlation ID for distributed tracing

***

### userId?

> `optional` **userId**: `string`

Defined in: [packages/do-core/src/event-store.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L43)

ID of the user who triggered this event
