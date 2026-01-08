[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / EscalationLevel

# Interface: EscalationLevel

Defined in: [objects/human/types.ts:133](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L133)

Escalation level configuration

## Properties

### level

> **level**: `number`

Defined in: [objects/human/types.ts:135](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L135)

Level number (0 = first, higher = more senior)

***

### assignees

> **assignees**: `string`[]

Defined in: [objects/human/types.ts:137](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L137)

Role or users at this level

***

### timeoutMs

> **timeoutMs**: `number`

Defined in: [objects/human/types.ts:139](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L139)

Time before escalating to next level (ms)

***

### notifyVia?

> `optional` **notifyVia**: (`"email"` \| `"webhook"` \| `"slack"` \| `"sms"`)[]

Defined in: [objects/human/types.ts:141](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L141)

Notification method
