[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / TaskSource

# Interface: TaskSource

Defined in: [objects/human/types.ts:163](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L163)

Source of the task

## Properties

### system

> **system**: `string`

Defined in: [objects/human/types.ts:165](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L165)

Workflow/system name

***

### workflowId?

> `optional` **workflowId**: `string`

Defined in: [objects/human/types.ts:167](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L167)

Workflow instance ID

***

### stepId?

> `optional` **stepId**: `string`

Defined in: [objects/human/types.ts:169](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L169)

Step ID within workflow

***

### model?

> `optional` **model**: `string`

Defined in: [objects/human/types.ts:171](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L171)

AI model that triggered this

***

### requestId?

> `optional` **requestId**: `string`

Defined in: [objects/human/types.ts:173](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L173)

Request ID for tracing
