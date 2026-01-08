[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / WorkflowContext

# Interface: WorkflowContext

Defined in: [packages/do-core/src/actions-mixin.ts:162](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L162)

Runtime workflow context

## Properties

### workflowId

> **workflowId**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:164](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L164)

Workflow ID

***

### stepResults

> **stepResults**: `Map`\<`string`, [`ActionResult`](ActionResult.md)\<`unknown`\>\>

Defined in: [packages/do-core/src/actions-mixin.ts:166](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L166)

Results from completed steps keyed by step ID

***

### initialContext

> **initialContext**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/actions-mixin.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L168)

Initial context from workflow definition

***

### cancelled

> **cancelled**: `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:170](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L170)

Whether cancellation has been requested

***

### startedAt

> **startedAt**: `number`

Defined in: [packages/do-core/src/actions-mixin.ts:172](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L172)

Workflow start time
