[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AgentConfig

# Interface: AgentConfig

Defined in: [packages/do-core/src/agent.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L54)

Agent configuration options passed to the constructor.

Supports any custom properties needed by your agent implementation.

## Example

```typescript
const config: AgentConfig = {
  name: 'MyAgent',
  version: '1.0.0',
  maxRetries: 3,
  timeout: 5000
}
```

## Indexable

\[`key`: `string`\]: `unknown`

Custom configuration properties

## Properties

### name?

> `optional` **name**: `string`

Defined in: [packages/do-core/src/agent.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L56)

Human-readable name for the agent

***

### version?

> `optional` **version**: `string`

Defined in: [packages/do-core/src/agent.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L58)

Version identifier
