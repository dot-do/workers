[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / SLAConfig

# Interface: SLAConfig

Defined in: [objects/human/types.ts:147](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L147)

SLA configuration

## Properties

### targetResponseMs

> **targetResponseMs**: `number`

Defined in: [objects/human/types.ts:149](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L149)

Target response time (ms)

***

### maxResponseMs

> **maxResponseMs**: `number`

Defined in: [objects/human/types.ts:151](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L151)

Maximum response time before breach (ms)

***

### warningThresholdMs?

> `optional` **warningThresholdMs**: `number`

Defined in: [objects/human/types.ts:153](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L153)

Warning threshold (ms)

***

### onBreach?

> `optional` **onBreach**: `"escalate"` \| `"auto-approve"` \| `"auto-reject"` \| `"notify"`

Defined in: [objects/human/types.ts:155](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L155)

Action on breach

***

### notifyOnBreach?

> `optional` **notifyOnBreach**: `string`[]

Defined in: [objects/human/types.ts:157](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L157)

Notification channels
