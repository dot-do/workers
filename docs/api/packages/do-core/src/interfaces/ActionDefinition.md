[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ActionDefinition

# Interface: ActionDefinition\<TParams, TResult\>

Defined in: [packages/do-core/src/actions-mixin.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L85)

Complete action definition with handler and metadata

## Type Parameters

### TParams

`TParams` = `unknown`

### TResult

`TResult` = `unknown`

## Properties

### name?

> `optional` **name**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L87)

Human-readable action name

***

### description?

> `optional` **description**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L89)

Action description

***

### parameters?

> `optional` **parameters**: `Record`\<`string`, [`ActionParameter`](ActionParameter.md)\>

Defined in: [packages/do-core/src/actions-mixin.ts:91](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L91)

Parameter schema

***

### handler

> **handler**: [`ActionHandler`](../type-aliases/ActionHandler.md)\<`TParams`, `TResult`\>

Defined in: [packages/do-core/src/actions-mixin.ts:93](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L93)

The handler function

***

### requiresAuth?

> `optional` **requiresAuth**: `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:95](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L95)

Whether this action requires authentication

***

### rateLimit?

> `optional` **rateLimit**: `number`

Defined in: [packages/do-core/src/actions-mixin.ts:97](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L97)

Rate limit configuration (requests per minute)
