[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / Goal

# Interface: Goal

Defined in: [objects/agent/index.ts:234](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L234)

Goal definition for agent planning

## Properties

### id

> **id**: `string`

Defined in: [objects/agent/index.ts:236](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L236)

Unique goal ID

***

### description

> **description**: `string`

Defined in: [objects/agent/index.ts:238](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L238)

Human-readable goal description

***

### status

> **status**: `"active"` \| `"completed"` \| `"failed"` \| `"paused"`

Defined in: [objects/agent/index.ts:240](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L240)

Goal status

***

### priority

> **priority**: `number`

Defined in: [objects/agent/index.ts:242](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L242)

Goal priority (1-5, 1 = highest)

***

### metric?

> `optional` **metric**: `string`

Defined in: [objects/agent/index.ts:244](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L244)

Optional metric to track

***

### target?

> `optional` **target**: `number`

Defined in: [objects/agent/index.ts:246](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L246)

Optional target value for metric

***

### progress

> **progress**: `number`

Defined in: [objects/agent/index.ts:248](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L248)

Current progress (0-1)

***

### createdAt

> **createdAt**: `number`

Defined in: [objects/agent/index.ts:250](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L250)

Unix timestamp when goal was created

***

### deadline?

> `optional` **deadline**: `number`

Defined in: [objects/agent/index.ts:252](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L252)

Optional deadline timestamp

***

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [objects/agent/index.ts:254](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L254)

Optional completion timestamp

***

### subGoals?

> `optional` **subGoals**: `Goal`[]

Defined in: [objects/agent/index.ts:256](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L256)

Sub-goals for complex objectives

***

### parentGoalId?

> `optional` **parentGoalId**: `string`

Defined in: [objects/agent/index.ts:258](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L258)

Parent goal ID if this is a sub-goal

***

### notes?

> `optional` **notes**: `string`[]

Defined in: [objects/agent/index.ts:260](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L260)

Optional notes on progress
