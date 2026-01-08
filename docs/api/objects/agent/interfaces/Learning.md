[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / Learning

# Interface: Learning

Defined in: [objects/agent/index.ts:266](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L266)

Learning record for improvement tracking

## Properties

### id

> **id**: `string`

Defined in: [objects/agent/index.ts:268](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L268)

Unique learning ID

***

### insight

> **insight**: `string`

Defined in: [objects/agent/index.ts:270](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L270)

What was learned

***

### category

> **category**: `"behavior"` \| `"knowledge"` \| `"skill"` \| `"preference"` \| `"error"`

Defined in: [objects/agent/index.ts:272](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L272)

Category of learning

***

### confidence

> **confidence**: `number`

Defined in: [objects/agent/index.ts:274](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L274)

Confidence in the learning (0-1)

***

### source

> **source**: `object`

Defined in: [objects/agent/index.ts:276](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L276)

Source of the learning

#### type

> **type**: `"error"` \| `"interaction"` \| `"feedback"` \| `"reflection"`

#### referenceId?

> `optional` **referenceId**: `string`

***

### learnedAt

> **learnedAt**: `number`

Defined in: [objects/agent/index.ts:281](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L281)

Unix timestamp when learned

***

### applicationCount

> **applicationCount**: `number`

Defined in: [objects/agent/index.ts:283](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L283)

Number of times this learning was applied

***

### valid

> **valid**: `boolean`

Defined in: [objects/agent/index.ts:285](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L285)

Whether this learning is still valid
