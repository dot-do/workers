[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / Conversation

# Interface: Conversation

Defined in: [objects/agent/index.ts:140](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L140)

Conversation session grouping messages

## Properties

### id

> **id**: `string`

Defined in: [objects/agent/index.ts:142](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L142)

Unique conversation ID

***

### messages

> **messages**: [`ConversationMessage`](ConversationMessage.md)[]

Defined in: [objects/agent/index.ts:144](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L144)

Conversation messages

***

### startedAt

> **startedAt**: `number`

Defined in: [objects/agent/index.ts:146](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L146)

Unix timestamp when conversation started

***

### lastMessageAt

> **lastMessageAt**: `number`

Defined in: [objects/agent/index.ts:148](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L148)

Unix timestamp of last message

***

### title?

> `optional` **title**: `string`

Defined in: [objects/agent/index.ts:150](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L150)

Optional conversation title/summary

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [objects/agent/index.ts:152](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L152)

Optional tags

***

### active

> **active**: `boolean`

Defined in: [objects/agent/index.ts:154](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L154)

Whether conversation is active
