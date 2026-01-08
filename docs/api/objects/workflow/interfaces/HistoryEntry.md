[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / HistoryEntry

# Interface: HistoryEntry

Defined in: [objects/workflow/index.ts:152](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L152)

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [objects/workflow/index.ts:154](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L154)

When this entry was created

***

### type

> **type**: `"fail"` \| `"retry"` \| `"start"` \| `"step_start"` \| `"step_complete"` \| `"step_fail"` \| `"step_skip"` \| `"wait"` \| `"resume"` \| `"pause"` \| `"complete"` \| `"cancel"`

Defined in: [objects/workflow/index.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L156)

Type of event

***

### stepId?

> `optional` **stepId**: `string`

Defined in: [objects/workflow/index.ts:158](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L158)

Step ID if applicable

***

### data?

> `optional` **data**: `unknown`

Defined in: [objects/workflow/index.ts:160](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L160)

Event data

***

### message?

> `optional` **message**: `string`

Defined in: [objects/workflow/index.ts:162](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L162)

Human-readable message
