[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / QueueStats

# Interface: QueueStats

Defined in: [objects/human/types.ts:238](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L238)

Queue statistics

## Properties

### total

> **total**: `number`

Defined in: [objects/human/types.ts:240](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L240)

Total tasks

***

### byStatus

> **byStatus**: `Record`\<[`TaskStatus`](../type-aliases/TaskStatus.md), `number`\>

Defined in: [objects/human/types.ts:242](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L242)

Tasks by status

***

### byPriority

> **byPriority**: `Record`\<[`TaskPriority`](../type-aliases/TaskPriority.md), `number`\>

Defined in: [objects/human/types.ts:244](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L244)

Tasks by priority

***

### byType

> **byType**: `Record`\<[`TaskType`](../type-aliases/TaskType.md), `number`\>

Defined in: [objects/human/types.ts:246](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L246)

Tasks by type

***

### avgResponseTimeMs

> **avgResponseTimeMs**: `number`

Defined in: [objects/human/types.ts:248](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L248)

Average response time (ms)

***

### slaComplianceRate

> **slaComplianceRate**: `number`

Defined in: [objects/human/types.ts:250](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L250)

SLA compliance rate (0-1)

***

### slaBreaches

> **slaBreaches**: `number`

Defined in: [objects/human/types.ts:252](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L252)

Tasks breaching SLA

***

### expiringSoon

> **expiringSoon**: `number`

Defined in: [objects/human/types.ts:254](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L254)

Tasks expiring soon
