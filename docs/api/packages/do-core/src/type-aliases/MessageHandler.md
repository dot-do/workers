[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / MessageHandler

# Type Alias: MessageHandler()

> **MessageHandler** = (`message`) => `Promise`\<`unknown`\>

Defined in: [packages/do-core/src/agent.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L128)

Message handler function type.

Handlers receive the full AgentMessage and return a response.
The response type is application-specific.

## Parameters

### message

[`AgentMessage`](../interfaces/AgentMessage.md)

## Returns

`Promise`\<`unknown`\>
