[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / WorkflowStep

# Interface: WorkflowStep

Defined in: [objects/agent/index.ts:364](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L364)

Workflow step definition

## Properties

### id

> **id**: `string`

Defined in: [objects/agent/index.ts:365](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L365)

***

### action

> **action**: `string`

Defined in: [objects/agent/index.ts:366](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L366)

***

### params?

> `optional` **params**: `unknown`

Defined in: [objects/agent/index.ts:367](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L367)

***

### dependsOn?

> `optional` **dependsOn**: `string`[]

Defined in: [objects/agent/index.ts:368](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L368)

***

### onError?

> `optional` **onError**: `"fail"` \| `"continue"` \| `"retry"`

Defined in: [objects/agent/index.ts:369](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L369)

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [objects/agent/index.ts:370](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L370)
