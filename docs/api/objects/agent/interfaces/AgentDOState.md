[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / AgentDOState

# Interface: AgentDOState

Defined in: [objects/agent/index.ts:318](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L318)

Agent state

## Properties

### initialized

> **initialized**: `boolean`

Defined in: [objects/agent/index.ts:320](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L320)

Whether the agent has been initialized

***

### startedAt?

> `optional` **startedAt**: `number`

Defined in: [objects/agent/index.ts:322](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L322)

Unix timestamp when started

***

### lastActivity?

> `optional` **lastActivity**: `number`

Defined in: [objects/agent/index.ts:324](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L324)

Unix timestamp of last activity

***

### personality?

> `optional` **personality**: [`AgentPersonality`](AgentPersonality.md)

Defined in: [objects/agent/index.ts:326](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L326)

Agent personality configuration

***

### activeConversationId?

> `optional` **activeConversationId**: `string`

Defined in: [objects/agent/index.ts:328](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L328)

Current active conversation ID

***

### activeGoalsCount

> **activeGoalsCount**: `number`

Defined in: [objects/agent/index.ts:330](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L330)

Current active goals count

***

### memoriesCount

> **memoriesCount**: `number`

Defined in: [objects/agent/index.ts:332](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L332)

Total memories count

***

### learningsCount

> **learningsCount**: `number`

Defined in: [objects/agent/index.ts:334](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L334)

Total learnings count

***

### actionsExecuted

> **actionsExecuted**: `number`

Defined in: [objects/agent/index.ts:336](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L336)

Total actions executed
