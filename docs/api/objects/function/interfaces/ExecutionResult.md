[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/function](../README.md) / ExecutionResult

# Interface: ExecutionResult\<T\>

Defined in: [objects/function/index.ts:127](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L127)

## Type Parameters

### T

`T` = `unknown`

## Properties

### id

> **id**: `string`

Defined in: [objects/function/index.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L128)

***

### output?

> `optional` **output**: `T`

Defined in: [objects/function/index.ts:129](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L129)

***

### error?

> `optional` **error**: `string`

Defined in: [objects/function/index.ts:130](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L130)

***

### status

> **status**: `"completed"` \| `"failed"` \| `"timeout"`

Defined in: [objects/function/index.ts:131](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L131)

***

### duration

> **duration**: `number`

Defined in: [objects/function/index.ts:132](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L132)

***

### coldStart

> **coldStart**: `boolean`

Defined in: [objects/function/index.ts:133](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L133)
