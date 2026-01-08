[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / WorkflowResult

# Interface: WorkflowResult

Defined in: [packages/do-core/src/actions-mixin.ts:178](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L178)

Workflow execution result

## Properties

### workflowId

> **workflowId**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:180](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L180)

Workflow ID

***

### success

> **success**: `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:182](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L182)

Whether the workflow completed successfully

***

### stepResults

> **stepResults**: `Record`\<`string`, [`ActionResult`](ActionResult.md)\>

Defined in: [packages/do-core/src/actions-mixin.ts:184](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L184)

Results from each step

***

### error?

> `optional` **error**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:186](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L186)

Overall workflow error (if failed)

***

### totalDurationMs

> **totalDurationMs**: `number`

Defined in: [packages/do-core/src/actions-mixin.ts:188](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L188)

Total execution time in milliseconds

***

### cancelled

> **cancelled**: `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:190](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L190)

Whether workflow was cancelled
