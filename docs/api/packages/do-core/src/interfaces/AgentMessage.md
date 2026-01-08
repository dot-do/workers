[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AgentMessage

# Interface: AgentMessage

Defined in: [packages/do-core/src/agent.ts:107](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L107)

Message structure for agent communication.

Messages are routed to handlers based on their `type` field.
Use `correlationId` to track request/response pairs.

## Example

```typescript
const message: AgentMessage = {
  id: crypto.randomUUID(),
  type: 'process-order',
  payload: { orderId: '12345', items: [...] },
  timestamp: Date.now(),
  correlationId: 'req-abc',
  source: 'order-service'
}
```

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/agent.ts:109](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L109)

Unique message identifier

***

### type

> **type**: `string`

Defined in: [packages/do-core/src/agent.ts:111](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L111)

Message type for routing to registered handlers

***

### payload

> **payload**: `unknown`

Defined in: [packages/do-core/src/agent.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L113)

Message payload data (type-specific)

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/do-core/src/agent.ts:115](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L115)

Unix timestamp (ms) when message was created

***

### correlationId?

> `optional` **correlationId**: `string`

Defined in: [packages/do-core/src/agent.ts:117](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L117)

Optional correlation ID for request/response tracking

***

### source?

> `optional` **source**: `string`

Defined in: [packages/do-core/src/agent.ts:119](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L119)

Optional source agent ID for multi-agent communication
