[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / ActionResult

# Interface: ActionResult\<T\>

Defined in: [objects/agent/index.ts:160](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L160)

Action result returned from action execution

## Type Parameters

### T

`T` = `unknown`

## Properties

### success

> **success**: `boolean`

Defined in: [objects/agent/index.ts:162](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L162)

Whether the action succeeded

***

### data?

> `optional` **data**: `T`

Defined in: [objects/agent/index.ts:164](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L164)

Result data (if success is true)

***

### error?

> `optional` **error**: `string`

Defined in: [objects/agent/index.ts:166](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L166)

Error message (if success is false)

***

### errorCode?

> `optional` **errorCode**: `string`

Defined in: [objects/agent/index.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L168)

Error code for programmatic handling

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [objects/agent/index.ts:170](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L170)

Execution metadata

#### durationMs

> **durationMs**: `number`

#### startedAt

> **startedAt**: `number`

#### completedAt

> **completedAt**: `number`
