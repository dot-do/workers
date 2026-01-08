[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / HumanResponse

# Interface: HumanResponse

Defined in: [objects/human/types.ts:93](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L93)

Response from a human

## Properties

### decision

> **decision**: [`DecisionType`](../type-aliases/DecisionType.md)

Defined in: [objects/human/types.ts:95](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L95)

The decision made

***

### value?

> `optional` **value**: `unknown`

Defined in: [objects/human/types.ts:97](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L97)

Free-form value/data provided

***

### comment?

> `optional` **comment**: `string`

Defined in: [objects/human/types.ts:99](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L99)

Comment explaining the decision

***

### respondedBy

> **respondedBy**: `string`

Defined in: [objects/human/types.ts:101](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L101)

Who responded

***

### respondedAt

> **respondedAt**: `string`

Defined in: [objects/human/types.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L103)

When they responded

***

### responseTimeMs?

> `optional` **responseTimeMs**: `number`

Defined in: [objects/human/types.ts:105](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L105)

Time taken to respond (ms)

***

### confidence?

> `optional` **confidence**: `number`

Defined in: [objects/human/types.ts:107](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L107)

Confidence level (0-1)

***

### modifications?

> `optional` **modifications**: `Record`\<`string`, `unknown`\>

Defined in: [objects/human/types.ts:109](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L109)

Modifications made (for 'modify' decisions)
