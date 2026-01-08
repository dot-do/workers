[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ActionParameter

# Interface: ActionParameter

Defined in: [packages/do-core/src/actions-mixin.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L41)

Parameter definition for action schema

## Properties

### type

> **type**: `"string"` \| `"number"` \| `"boolean"` \| `"object"` \| `"array"`

Defined in: [packages/do-core/src/actions-mixin.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L43)

Parameter type

***

### required?

> `optional` **required**: `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L45)

Whether this parameter is required

***

### description?

> `optional` **description**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L47)

Human-readable description

***

### default?

> `optional` **default**: `unknown`

Defined in: [packages/do-core/src/actions-mixin.ts:49](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L49)

Default value if not provided
