[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / WorkflowDefinition

# Interface: WorkflowDefinition

Defined in: [objects/workflow/index.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L50)

## Properties

### id

> **id**: `string`

Defined in: [objects/workflow/index.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L52)

Unique workflow identifier

***

### name?

> `optional` **name**: `string`

Defined in: [objects/workflow/index.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L54)

Human-readable name

***

### description?

> `optional` **description**: `string`

Defined in: [objects/workflow/index.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L56)

Description of what this workflow does

***

### steps

> **steps**: [`WorkflowStep`](WorkflowStep.md)[]

Defined in: [objects/workflow/index.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L58)

Workflow steps

***

### timeout?

> `optional` **timeout**: `string`

Defined in: [objects/workflow/index.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L60)

Default timeout for the entire workflow

***

### context?

> `optional` **context**: `Record`\<`string`, `unknown`\>

Defined in: [objects/workflow/index.ts:62](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L62)

Initial context/state

***

### triggers?

> `optional` **triggers**: [`WorkflowTrigger`](WorkflowTrigger.md)[]

Defined in: [objects/workflow/index.ts:64](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L64)

Event triggers ($.on.Noun.event patterns)

***

### schedules?

> `optional` **schedules**: [`WorkflowSchedule`](WorkflowSchedule.md)[]

Defined in: [objects/workflow/index.ts:66](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L66)

Schedule triggers ($.every patterns)

***

### version?

> `optional` **version**: `number`

Defined in: [objects/workflow/index.ts:68](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L68)

Version for optimistic locking
