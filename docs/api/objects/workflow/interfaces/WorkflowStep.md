[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / WorkflowStep

# Interface: WorkflowStep

Defined in: [objects/workflow/index.ts:23](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L23)

## Properties

### id

> **id**: `string`

Defined in: [objects/workflow/index.ts:25](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L25)

Unique step identifier

***

### name?

> `optional` **name**: `string`

Defined in: [objects/workflow/index.ts:27](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L27)

Human-readable name

***

### action

> **action**: `string`

Defined in: [objects/workflow/index.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L29)

Action to execute (function name or service call)

***

### params?

> `optional` **params**: `Record`\<`string`, `unknown`\>

Defined in: [objects/workflow/index.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L31)

Input parameters for the action

***

### dependsOn?

> `optional` **dependsOn**: `string`[]

Defined in: [objects/workflow/index.ts:33](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L33)

Steps that must complete before this one

***

### condition?

> `optional` **condition**: `string`

Defined in: [objects/workflow/index.ts:35](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L35)

Condition expression - step runs only if true

***

### wait?

> `optional` **wait**: `string`

Defined in: [objects/workflow/index.ts:37](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L37)

Wait duration before executing (e.g., '5m', '1h', '7d')

***

### onError?

> `optional` **onError**: `"fail"` \| `"continue"` \| `"retry"` \| `"branch"`

Defined in: [objects/workflow/index.ts:39](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L39)

Error handling strategy

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [objects/workflow/index.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L41)

Maximum retry attempts

***

### retryDelay?

> `optional` **retryDelay**: `string`

Defined in: [objects/workflow/index.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L43)

Delay between retries (e.g., '30s', '5m')

***

### errorBranch?

> `optional` **errorBranch**: `string`

Defined in: [objects/workflow/index.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L45)

Branch to execute on error

***

### timeout?

> `optional` **timeout**: `string`

Defined in: [objects/workflow/index.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L47)

Timeout for this step
