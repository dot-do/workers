[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / HumanTask

# Interface: HumanTask

Defined in: [objects/human/types.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L41)

Human-in-the-loop task

## Properties

### \_id

> **\_id**: `string`

Defined in: [objects/human/types.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L43)

Unique task identifier

***

### type

> **type**: [`TaskType`](../type-aliases/TaskType.md)

Defined in: [objects/human/types.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L45)

Type of human intervention required

***

### title

> **title**: `string`

Defined in: [objects/human/types.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L47)

Short task title

***

### description?

> `optional` **description**: `string`

Defined in: [objects/human/types.ts:49](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L49)

Detailed description

***

### context?

> `optional` **context**: `Record`\<`string`, `unknown`\>

Defined in: [objects/human/types.ts:51](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L51)

Context data for the human

***

### requiredBy?

> `optional` **requiredBy**: `string`

Defined in: [objects/human/types.ts:53](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L53)

Who needs to handle this (role or user)

***

### assignee?

> `optional` **assignee**: `string`

Defined in: [objects/human/types.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L55)

Currently assigned human

***

### status

> **status**: [`TaskStatus`](../type-aliases/TaskStatus.md)

Defined in: [objects/human/types.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L57)

Current task status

***

### priority

> **priority**: [`TaskPriority`](../type-aliases/TaskPriority.md)

Defined in: [objects/human/types.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L59)

Task priority

***

### createdAt

> **createdAt**: `string`

Defined in: [objects/human/types.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L61)

Task creation time

***

### updatedAt

> **updatedAt**: `string`

Defined in: [objects/human/types.ts:63](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L63)

Last update time

***

### deadline?

> `optional` **deadline**: `string`

Defined in: [objects/human/types.ts:65](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L65)

Deadline for completion

***

### expiresAt?

> `optional` **expiresAt**: `string`

Defined in: [objects/human/types.ts:67](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L67)

When the task expires (auto-calculated from timeoutMs)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [objects/human/types.ts:69](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L69)

Timeout in milliseconds

***

### response?

> `optional` **response**: [`HumanResponse`](HumanResponse.md)

Defined in: [objects/human/types.ts:71](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L71)

Human's response

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [objects/human/types.ts:73](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L73)

Additional metadata

***

### options?

> `optional` **options**: [`TaskOption`](TaskOption.md)[]

Defined in: [objects/human/types.ts:75](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L75)

Options for decision tasks

***

### escalationChain?

> `optional` **escalationChain**: [`EscalationLevel`](EscalationLevel.md)[]

Defined in: [objects/human/types.ts:77](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L77)

Escalation chain

***

### escalationLevel?

> `optional` **escalationLevel**: `number`

Defined in: [objects/human/types.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L79)

Current escalation level

***

### sla?

> `optional` **sla**: [`SLAConfig`](SLAConfig.md)

Defined in: [objects/human/types.ts:81](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L81)

SLA configuration

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [objects/human/types.ts:83](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L83)

Tags for filtering

***

### source?

> `optional` **source**: [`TaskSource`](TaskSource.md)

Defined in: [objects/human/types.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L85)

Source system/workflow that created this task

***

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [objects/human/types.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L87)

Callback URL for webhooks
