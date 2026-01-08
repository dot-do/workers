[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / CreateTaskInput

# Interface: CreateTaskInput

Defined in: [objects/human/types.ts:179](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L179)

Input for creating a task

## Properties

### type

> **type**: [`TaskType`](../type-aliases/TaskType.md)

Defined in: [objects/human/types.ts:180](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L180)

***

### title

> **title**: `string`

Defined in: [objects/human/types.ts:181](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L181)

***

### description?

> `optional` **description**: `string`

Defined in: [objects/human/types.ts:182](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L182)

***

### context?

> `optional` **context**: `Record`\<`string`, `unknown`\>

Defined in: [objects/human/types.ts:183](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L183)

***

### requiredBy?

> `optional` **requiredBy**: `string`

Defined in: [objects/human/types.ts:184](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L184)

***

### assignee?

> `optional` **assignee**: `string`

Defined in: [objects/human/types.ts:185](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L185)

***

### priority?

> `optional` **priority**: [`TaskPriority`](../type-aliases/TaskPriority.md)

Defined in: [objects/human/types.ts:186](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L186)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [objects/human/types.ts:187](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L187)

***

### deadline?

> `optional` **deadline**: `string`

Defined in: [objects/human/types.ts:188](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L188)

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [objects/human/types.ts:189](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L189)

***

### options?

> `optional` **options**: [`TaskOption`](TaskOption.md)[]

Defined in: [objects/human/types.ts:190](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L190)

***

### escalationChain?

> `optional` **escalationChain**: [`EscalationLevel`](EscalationLevel.md)[]

Defined in: [objects/human/types.ts:191](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L191)

***

### sla?

> `optional` **sla**: [`SLAConfig`](SLAConfig.md)

Defined in: [objects/human/types.ts:192](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L192)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [objects/human/types.ts:193](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L193)

***

### source?

> `optional` **source**: [`TaskSource`](TaskSource.md)

Defined in: [objects/human/types.ts:194](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L194)

***

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [objects/human/types.ts:195](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L195)
