[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ActionInfo

# Interface: ActionInfo

Defined in: [packages/do-core/src/actions-mixin.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L103)

Public action info returned by listActions()

## Properties

### name

> **name**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:105](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L105)

Action name/key

***

### description?

> `optional` **description**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:107](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L107)

Human-readable description

***

### parameters?

> `optional` **parameters**: `Record`\<`string`, [`ActionParameter`](ActionParameter.md)\>

Defined in: [packages/do-core/src/actions-mixin.ts:109](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L109)

Parameter schema

***

### requiresAuth?

> `optional` **requiresAuth**: `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:111](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L111)

Whether this action requires authentication
