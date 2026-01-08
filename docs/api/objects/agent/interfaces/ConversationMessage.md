[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / ConversationMessage

# Interface: ConversationMessage

Defined in: [objects/agent/index.ts:120](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L120)

Conversation message in agent's history

## Properties

### id

> **id**: `string`

Defined in: [objects/agent/index.ts:122](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L122)

Unique message ID

***

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool"`

Defined in: [objects/agent/index.ts:124](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L124)

Message role

***

### content

> **content**: `string`

Defined in: [objects/agent/index.ts:126](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L126)

Message content

***

### timestamp

> **timestamp**: `number`

Defined in: [objects/agent/index.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L128)

Unix timestamp

***

### toolCallId?

> `optional` **toolCallId**: `string`

Defined in: [objects/agent/index.ts:130](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L130)

Optional tool call ID

***

### toolName?

> `optional` **toolName**: `string`

Defined in: [objects/agent/index.ts:132](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L132)

Optional tool name if role is 'tool'

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [objects/agent/index.ts:134](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L134)

Optional metadata
