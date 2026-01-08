[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / StepResult

# Interface: StepResult

Defined in: [objects/workflow/index.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L85)

## Properties

### stepId

> **stepId**: `string`

Defined in: [objects/workflow/index.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L87)

Step ID

***

### status

> **status**: [`StepStatus`](../type-aliases/StepStatus.md)

Defined in: [objects/workflow/index.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L89)

Execution status

***

### output?

> `optional` **output**: `unknown`

Defined in: [objects/workflow/index.ts:91](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L91)

Step output data

***

### error?

> `optional` **error**: `string`

Defined in: [objects/workflow/index.ts:93](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L93)

Error message if failed

***

### stack?

> `optional` **stack**: `string`

Defined in: [objects/workflow/index.ts:95](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L95)

Error stack trace

***

### startedAt?

> `optional` **startedAt**: `number`

Defined in: [objects/workflow/index.ts:97](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L97)

When the step started

***

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [objects/workflow/index.ts:99](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L99)

When the step completed

***

### retries?

> `optional` **retries**: `number`

Defined in: [objects/workflow/index.ts:101](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L101)

Number of retry attempts

***

### duration?

> `optional` **duration**: `number`

Defined in: [objects/workflow/index.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L103)

Duration in milliseconds
