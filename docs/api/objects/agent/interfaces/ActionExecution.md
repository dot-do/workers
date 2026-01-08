[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / ActionExecution

# Interface: ActionExecution

Defined in: [objects/agent/index.ts:209](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L209)

Action execution record for tracking

## Properties

### id

> **id**: `string`

Defined in: [objects/agent/index.ts:211](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L211)

Unique execution ID

***

### action

> **action**: `string`

Defined in: [objects/agent/index.ts:213](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L213)

Action name that was executed

***

### params

> **params**: `unknown`

Defined in: [objects/agent/index.ts:215](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L215)

Parameters passed to action

***

### result

> **result**: [`ActionResult`](ActionResult.md)

Defined in: [objects/agent/index.ts:217](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L217)

Action result

***

### startedAt

> **startedAt**: `number`

Defined in: [objects/agent/index.ts:219](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L219)

Unix timestamp when execution started

***

### completedAt

> **completedAt**: `number`

Defined in: [objects/agent/index.ts:221](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L221)

Unix timestamp when execution completed

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [objects/agent/index.ts:223](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L223)

Optional conversation ID this action was part of

***

### feedback?

> `optional` **feedback**: `object`

Defined in: [objects/agent/index.ts:225](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L225)

Optional feedback on the action (for learning)

#### rating

> **rating**: `number`

#### comment?

> `optional` **comment**: `string`
