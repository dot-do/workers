[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / WorkflowConfig

# Interface: WorkflowConfig

Defined in: [objects/workflow/index.ts:165](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L165)

## Properties

### maxConcurrent?

> `optional` **maxConcurrent**: `number`

Defined in: [objects/workflow/index.ts:167](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L167)

Maximum concurrent executions per workflow

***

### defaultRetry?

> `optional` **defaultRetry**: `object`

Defined in: [objects/workflow/index.ts:169](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L169)

Default retry configuration

#### maxAttempts

> **maxAttempts**: `number`

#### delay

> **delay**: `string`

***

### defaultStepTimeout?

> `optional` **defaultStepTimeout**: `string`

Defined in: [objects/workflow/index.ts:171](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L171)

Default timeout for steps

***

### defaultWorkflowTimeout?

> `optional` **defaultWorkflowTimeout**: `string`

Defined in: [objects/workflow/index.ts:173](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L173)

Default timeout for workflows

***

### historyRetention?

> `optional` **historyRetention**: `string`

Defined in: [objects/workflow/index.ts:175](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L175)

How long to keep completed execution history
