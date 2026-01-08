[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / ActionDefinition

# Interface: ActionDefinition\<TParams, TResult\>

Defined in: [objects/agent/index.ts:197](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L197)

Complete action definition

## Type Parameters

### TParams

`TParams` = `unknown`

### TResult

`TResult` = `unknown`

## Properties

### name?

> `optional` **name**: `string`

Defined in: [objects/agent/index.ts:198](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L198)

***

### description?

> `optional` **description**: `string`

Defined in: [objects/agent/index.ts:199](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L199)

***

### parameters?

> `optional` **parameters**: `Record`\<`string`, [`ActionParameter`](ActionParameter.md)\>

Defined in: [objects/agent/index.ts:200](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L200)

***

### handler

> **handler**: [`ActionHandler`](../type-aliases/ActionHandler.md)\<`TParams`, `TResult`\>

Defined in: [objects/agent/index.ts:201](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L201)

***

### requiresAuth?

> `optional` **requiresAuth**: `boolean`

Defined in: [objects/agent/index.ts:202](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L202)

***

### rateLimit?

> `optional` **rateLimit**: `number`

Defined in: [objects/agent/index.ts:203](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L203)
