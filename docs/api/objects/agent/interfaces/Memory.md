[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / Memory

# Interface: Memory

Defined in: [objects/agent/index.ts:92](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L92)

Memory entry stored in agent's persistent memory

## Properties

### id

> **id**: `string`

Defined in: [objects/agent/index.ts:94](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L94)

Unique memory ID

***

### type

> **type**: `string`

Defined in: [objects/agent/index.ts:96](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L96)

Memory type for categorization

***

### content

> **content**: `unknown`

Defined in: [objects/agent/index.ts:98](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L98)

Memory content (structured data)

***

### importance

> **importance**: `number`

Defined in: [objects/agent/index.ts:100](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L100)

Importance score (0-1, higher = more important)

***

### createdAt

> **createdAt**: `number`

Defined in: [objects/agent/index.ts:102](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L102)

Unix timestamp when memory was created

***

### lastAccessedAt

> **lastAccessedAt**: `number`

Defined in: [objects/agent/index.ts:104](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L104)

Unix timestamp when memory was last accessed

***

### accessCount

> **accessCount**: `number`

Defined in: [objects/agent/index.ts:106](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L106)

Number of times this memory has been recalled

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [objects/agent/index.ts:108](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L108)

Optional tags for semantic retrieval

***

### embedding?

> `optional` **embedding**: `number`[]

Defined in: [objects/agent/index.ts:110](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L110)

Optional embedding vector for similarity search

***

### source?

> `optional` **source**: `string`

Defined in: [objects/agent/index.ts:112](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L112)

Optional source (conversation, action, learning, etc.)

***

### relatedMemories?

> `optional` **relatedMemories**: `string`[]

Defined in: [objects/agent/index.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L114)

Optional reference to related memories
