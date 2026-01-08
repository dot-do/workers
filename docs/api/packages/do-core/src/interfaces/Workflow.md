[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / Workflow

# Interface: Workflow

Defined in: [packages/do-core/src/actions-mixin.ts:146](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L146)

Complete workflow definition

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:148](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L148)

Workflow identifier

***

### name?

> `optional` **name**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:150](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L150)

Human-readable name

***

### steps

> **steps**: [`WorkflowStep`](WorkflowStep.md)[]

Defined in: [packages/do-core/src/actions-mixin.ts:152](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L152)

Workflow steps

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [packages/do-core/src/actions-mixin.ts:154](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L154)

Maximum workflow execution time (ms)

***

### context?

> `optional` **context**: `Record`\<`string`, `unknown`\>

Defined in: [packages/do-core/src/actions-mixin.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L156)

Context data available to all steps
