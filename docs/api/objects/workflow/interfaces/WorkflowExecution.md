[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / WorkflowExecution

# Interface: WorkflowExecution

Defined in: [objects/workflow/index.ts:106](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L106)

## Properties

### id

> **id**: `string`

Defined in: [objects/workflow/index.ts:108](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L108)

Unique execution ID

***

### workflowId

> **workflowId**: `string`

Defined in: [objects/workflow/index.ts:110](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L110)

Workflow definition ID

***

### status

> **status**: [`WorkflowStatus`](../type-aliases/WorkflowStatus.md)

Defined in: [objects/workflow/index.ts:112](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L112)

Current status

***

### input

> **input**: `Record`\<`string`, `unknown`\>

Defined in: [objects/workflow/index.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L114)

Input provided when started

***

### state

> **state**: `Record`\<`string`, `unknown`\>

Defined in: [objects/workflow/index.ts:116](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L116)

Accumulated state/context

***

### output?

> `optional` **output**: `unknown`

Defined in: [objects/workflow/index.ts:118](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L118)

Final output when completed

***

### error?

> `optional` **error**: `string`

Defined in: [objects/workflow/index.ts:120](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L120)

Error message if failed

***

### currentStepIndex

> **currentStepIndex**: `number`

Defined in: [objects/workflow/index.ts:122](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L122)

Index of current step being executed

***

### completedSteps

> **completedSteps**: `string`[]

Defined in: [objects/workflow/index.ts:124](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L124)

IDs of completed steps

***

### stepResults

> **stepResults**: `Record`\<`string`, [`StepResult`](StepResult.md)\>

Defined in: [objects/workflow/index.ts:126](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L126)

Results for each step

***

### startedAt

> **startedAt**: `number`

Defined in: [objects/workflow/index.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L128)

When execution started

***

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [objects/workflow/index.ts:130](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L130)

When execution completed

***

### resumePoint?

> `optional` **resumePoint**: [`ResumePoint`](ResumePoint.md)

Defined in: [objects/workflow/index.ts:132](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L132)

Resume information for paused workflows

***

### history

> **history**: [`HistoryEntry`](HistoryEntry.md)[]

Defined in: [objects/workflow/index.ts:134](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L134)

Execution history for replay

***

### parentExecutionId?

> `optional` **parentExecutionId**: `string`

Defined in: [objects/workflow/index.ts:136](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L136)

Parent execution ID (for sub-workflows)

***

### triggeredBy?

> `optional` **triggeredBy**: `object`

Defined in: [objects/workflow/index.ts:138](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L138)

Trigger that started this execution

#### type

> **type**: `"manual"` \| `"event"` \| `"schedule"`

#### source?

> `optional` **source**: `string`
