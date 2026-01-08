[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ActionResult

# Interface: ActionResult\<T\>

Defined in: [packages/do-core/src/actions-mixin.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L55)

Action result returned from action execution

## Type Parameters

### T

`T` = `unknown`

## Properties

### success

> **success**: `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L57)

Whether the action succeeded

***

### data?

> `optional` **data**: `T`

Defined in: [packages/do-core/src/actions-mixin.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L59)

Result data (if success is true)

***

### error?

> `optional` **error**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L61)

Error message (if success is false)

***

### errorCode?

> `optional` **errorCode**: `string`

Defined in: [packages/do-core/src/actions-mixin.ts:63](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L63)

Error code for programmatic handling

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [packages/do-core/src/actions-mixin.ts:65](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L65)

Execution metadata

#### durationMs

> **durationMs**: `number`

Execution duration in milliseconds

#### startedAt

> **startedAt**: `number`

Timestamp when action started

#### completedAt

> **completedAt**: `number`

Timestamp when action completed
