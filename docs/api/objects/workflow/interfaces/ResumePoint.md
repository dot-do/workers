[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / ResumePoint

# Interface: ResumePoint

Defined in: [objects/workflow/index.ts:141](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L141)

## Properties

### stepId

> **stepId**: `string`

Defined in: [objects/workflow/index.ts:143](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L143)

Step ID to resume from

***

### stepIndex

> **stepIndex**: `number`

Defined in: [objects/workflow/index.ts:145](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L145)

Step index to resume from

***

### retryCount

> **retryCount**: `number`

Defined in: [objects/workflow/index.ts:147](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L147)

Current retry count

***

### pausedState?

> `optional` **pausedState**: `Record`\<`string`, `unknown`\>

Defined in: [objects/workflow/index.ts:149](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L149)

State at pause time
