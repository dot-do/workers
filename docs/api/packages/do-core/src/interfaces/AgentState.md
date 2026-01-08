[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AgentState

# Interface: AgentState

Defined in: [packages/do-core/src/agent.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L80)

Agent state interface for tracking lifecycle status.

Extend this interface to add custom state properties:

## Example

```typescript
interface MyAgentState extends AgentState {
  taskCount: number
  lastError: string | null
}

class MyAgent extends Agent<DOEnv, MyAgentState> {
  // ...
}
```

## Properties

### initialized

> **initialized**: `boolean`

Defined in: [packages/do-core/src/agent.ts:82](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L82)

Whether the agent has been initialized via init()

***

### startedAt?

> `optional` **startedAt**: `number`

Defined in: [packages/do-core/src/agent.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L84)

Unix timestamp (ms) when start() was called

***

### lastActivity?

> `optional` **lastActivity**: `number`

Defined in: [packages/do-core/src/agent.ts:86](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L86)

Unix timestamp (ms) of last activity via updateActivity()
