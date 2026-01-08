[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / HumanFeedback

# Interface: HumanFeedback

Defined in: [objects/human/types.ts:216](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L216)

Feedback for AI improvement

## Properties

### \_id

> **\_id**: `string`

Defined in: [objects/human/types.ts:218](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L218)

Feedback ID

***

### taskId

> **taskId**: `string`

Defined in: [objects/human/types.ts:220](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L220)

Related task ID

***

### type

> **type**: `"correction"` \| `"suggestion"` \| `"rating"` \| `"annotation"`

Defined in: [objects/human/types.ts:222](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L222)

Feedback type

***

### content

> **content**: `unknown`

Defined in: [objects/human/types.ts:224](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L224)

Feedback content

***

### providedBy

> **providedBy**: `string`

Defined in: [objects/human/types.ts:226](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L226)

Who provided feedback

***

### providedAt

> **providedAt**: `string`

Defined in: [objects/human/types.ts:228](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L228)

When feedback was provided

***

### targetModel?

> `optional` **targetModel**: `string`

Defined in: [objects/human/types.ts:230](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L230)

Target model for learning

***

### processed?

> `optional` **processed**: `boolean`

Defined in: [objects/human/types.ts:232](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L232)

Whether feedback has been processed
