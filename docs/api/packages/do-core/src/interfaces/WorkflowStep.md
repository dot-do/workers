[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / WorkflowStep

# Interface: WorkflowStep

Defined in: [packages/do-core/src/actions-mixin.ts:126](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L126)

Workflow step definition

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L128)

Step identifier

***

### action

> **action**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:130](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L130)

Action to execute

***

### params?

> `optional` **params**: `unknown`

Defined in: [packages/do-core/src/actions-mixin.ts:132](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L132)

Parameters for the action

***

### condition()?

> `optional` **condition**: (`context`) => `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:134](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L134)

Condition for step execution (evaluated at runtime)

#### Parameters

##### context

[`WorkflowContext`](WorkflowContext.md)

#### Returns

`boolean`

***

### dependsOn?

> `optional` **dependsOn**: `string`[]

Defined in: [packages/do-core/src/actions-mixin.ts:136](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L136)

Steps that must complete before this one

***

### onError?

> `optional` **onError**: `"fail"` \| `"continue"` \| `"retry"`

Defined in: [packages/do-core/src/actions-mixin.ts:138](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L138)

Error handling strategy

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [packages/do-core/src/actions-mixin.ts:140](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L140)

Maximum retries if onError is 'retry'
