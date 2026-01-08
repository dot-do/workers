[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/function](../README.md) / Function

# Class: Function

Defined in: [objects/function/index.ts:165](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L165)

Function - Durable Object for serverless function management

Extends the base DO class to provide:
- Function deployment with automatic versioning
- Execution tracking with structured logging
- Configurable per-function rate limiting
- Cold start optimization via instance pre-warming
- Real-time and historical metrics

## Extends

- [`DO`](../../variables/DO.md)

## Constructors

### Constructor

> **new Function**(): `Function`

#### Returns

`Function`

#### Inherited from

`DO.constructor`

## Properties

### db

> **db**: `DrizzleD1Database`\<\{ `functions`: `SQLiteTableWithColumns`\<\{ \}\>; `functionVersions`: `SQLiteTableWithColumns`\<\{ \}\>; `executions`: `SQLiteTableWithColumns`\<\{ \}\>; `logs`: `SQLiteTableWithColumns`\<\{ \}\>; `rateLimits`: `SQLiteTableWithColumns`\<\{ \}\>; `metrics`: `SQLiteTableWithColumns`\<\{ \}\>; `warmInstances`: `SQLiteTableWithColumns`\<\{ \}\>; \}\> & `object`

Defined in: [objects/function/index.ts:166](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L166)

## Methods

### deploy()

> **deploy**(`params`): `Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \}\>

Defined in: [objects/function/index.ts:178](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L178)

Deploy a new function or update an existing one

#### Parameters

##### params

###### name

`string`

###### code

`string`

###### runtime?

`"v8"` \| `"node"` \| `"python"` \| `"wasm"`

###### timeout?

`number`

###### memory?

`number`

###### env?

`Record`\<`string`, `string`\>

###### metadata?

`Record`\<`string`, `unknown`\>

###### changelog?

`string`

#### Returns

`Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \}\>

***

### get()

> **get**(`name`): `Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \} \| `undefined`\>

Defined in: [objects/function/index.ts:244](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L244)

Get a function by name

#### Parameters

##### name

`string`

#### Returns

`Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \} \| `undefined`\>

***

### list()

> **list**(`params?`): `Promise`\<`object`[]\>

Defined in: [objects/function/index.ts:251](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L251)

List all functions

#### Parameters

##### params?

###### status?

`"active"` \| `"disabled"` \| `"deprecated"`

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### versions()

> **versions**(`name`): `Promise`\<`object`[]\>

Defined in: [objects/function/index.ts:268](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L268)

Get function version history

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`object`[]\>

***

### rollback()

> **rollback**(`name`, `version`): `Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \}\>

Defined in: [objects/function/index.ts:283](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L283)

Rollback to a specific version

#### Parameters

##### name

`string`

##### version

`number`

#### Returns

`Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \}\>

***

### setStatus()

> **setStatus**(`name`, `status`): `Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \}\>

Defined in: [objects/function/index.ts:305](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L305)

Disable or deprecate a function

#### Parameters

##### name

`string`

##### status

`"active"` | `"disabled"` | `"deprecated"`

#### Returns

`Promise`\<\{ `code`: `string`; `createdAt`: `Date` \| `null`; `env`: `string` \| `null`; `id`: `string`; `memory`: `number` \| `null`; `metadata`: `string` \| `null`; `name`: `string`; `runtime`: `string`; `status`: `string`; `timeout`: `number` \| `null`; `updatedAt`: `Date` \| `null`; `version`: `number`; \}\>

***

### delete()

> **delete**(`name`): `Promise`\<`void`\>

Defined in: [objects/function/index.ts:321](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L321)

Delete a function and all its data

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`void`\>

***

### invoke()

> **invoke**\<`T`\>(`name`, `input?`, `options?`): `Promise`\<[`ExecutionResult`](../interfaces/ExecutionResult.md)\<`T`\>\>

Defined in: [objects/function/index.ts:342](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L342)

Execute a function with full tracking

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### name

`string`

##### input?

`unknown`

##### options?

###### rateLimitKey?

`string`

#### Returns

`Promise`\<[`ExecutionResult`](../interfaces/ExecutionResult.md)\<`T`\>\>

***

### invokeAsync()

> **invokeAsync**(`name`, `input?`): `Promise`\<\{ `executionId`: `string`; \}\>

Defined in: [objects/function/index.ts:442](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L442)

Execute function asynchronously (fire and forget)

#### Parameters

##### name

`string`

##### input?

`unknown`

#### Returns

`Promise`\<\{ `executionId`: `string`; \}\>

***

### status()

> **status**(`executionId`): `Promise`\<\{ `coldStart`: `boolean` \| `null`; `completedAt`: `Date` \| `null`; `cpuTime`: `number` \| `null`; `createdAt`: `Date` \| `null`; `duration`: `number` \| `null`; `error`: `string` \| `null`; `functionId`: `string`; `functionVersion`: `number`; `id`: `string`; `input`: `string` \| `null`; `memoryUsed`: `number` \| `null`; `output`: `string` \| `null`; `startedAt`: `Date` \| `null`; `status`: `string`; \} \| `undefined`\>

Defined in: [objects/function/index.ts:470](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L470)

Get execution status

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<\{ `coldStart`: `boolean` \| `null`; `completedAt`: `Date` \| `null`; `cpuTime`: `number` \| `null`; `createdAt`: `Date` \| `null`; `duration`: `number` \| `null`; `error`: `string` \| `null`; `functionId`: `string`; `functionVersion`: `number`; `id`: `string`; `input`: `string` \| `null`; `memoryUsed`: `number` \| `null`; `output`: `string` \| `null`; `startedAt`: `Date` \| `null`; `status`: `string`; \} \| `undefined`\>

***

### executions()

> **executions**(`name`, `params?`): `Promise`\<`object`[]\>

Defined in: [objects/function/index.ts:477](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L477)

List recent executions

#### Parameters

##### name

`string`

##### params?

###### status?

`string`

###### limit?

`number`

###### from?

`Date`

###### to?

`Date`

#### Returns

`Promise`\<`object`[]\>

***

### log()

> **log**(`executionId`, `level`, `message`, `data?`): `Promise`\<`void`\>

Defined in: [objects/function/index.ts:512](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L512)

Add a log entry for an execution

#### Parameters

##### executionId

`string`

##### level

`"error"` | `"info"` | `"debug"` | `"warn"`

##### message

`string`

##### data?

`unknown`

#### Returns

`Promise`\<`void`\>

***

### logs()

> **logs**(`name`, `params?`): `Promise`\<`object`[]\>

Defined in: [objects/function/index.ts:534](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L534)

Get logs for a function

#### Parameters

##### name

`string`

##### params?

###### level?

`string`

###### limit?

`number`

###### from?

`Date`

###### executionId?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### setRateLimit()

> **setRateLimit**(`name`, `config`): `void`

Defined in: [objects/function/index.ts:569](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L569)

Configure rate limit for a function

#### Parameters

##### name

`string`

##### config

[`RateLimitConfig`](../interfaces/RateLimitConfig.md)

#### Returns

`void`

***

### prewarm()

> **prewarm**(`name`, `count`): `Promise`\<`void`\>

Defined in: [objects/function/index.ts:631](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L631)

Pre-warm function instances

#### Parameters

##### name

`string`

##### count

`number` = `1`

#### Returns

`Promise`\<`void`\>

***

### releaseInstance()

> **releaseInstance**(`instanceId`): `Promise`\<`void`\>

Defined in: [objects/function/index.ts:669](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L669)

Release a warm instance back to the pool

#### Parameters

##### instanceId

`string`

#### Returns

`Promise`\<`void`\>

***

### cleanupWarmInstances()

> **cleanupWarmInstances**(`maxAge`): `Promise`\<`void`\>

Defined in: [objects/function/index.ts:679](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L679)

Clean up expired warm instances

#### Parameters

##### maxAge

`number` = `300000`

#### Returns

`Promise`\<`void`\>

***

### metrics()

> **metrics**(`name`, `params?`): `Promise`\<[`FunctionMetrics`](../interfaces/FunctionMetrics.md)\>

Defined in: [objects/function/index.ts:734](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L734)

Get metrics for a function

#### Parameters

##### name

`string`

##### params?

###### from?

`Date`

###### to?

`Date`

#### Returns

`Promise`\<[`FunctionMetrics`](../interfaces/FunctionMetrics.md)\>

***

### dailyMetrics()

> **dailyMetrics**(`name`, `params?`): `Promise`\<`object`[]\>

Defined in: [objects/function/index.ts:806](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L806)

Get daily metrics breakdown

#### Parameters

##### name

`string`

##### params?

###### from?

`Date`

###### to?

`Date`

#### Returns

`Promise`\<`object`[]\>

***

### executeCode()

> `protected` **executeCode**\<`T`\>(`fn`, `input`): `Promise`\<`T`\>

Defined in: [objects/function/index.ts:837](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/function/index.ts#L837)

Execute function code - override this for custom runtimes

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

###### code

`string`

###### createdAt

`Date` \| `null`

###### env

`string` \| `null`

###### id

`string`

###### memory

`number` \| `null`

###### metadata

`string` \| `null`

###### name

`string`

###### runtime

`string`

###### status

`string`

###### timeout

`number` \| `null`

###### updatedAt

`Date` \| `null`

###### version

`number`

##### input

`unknown`

#### Returns

`Promise`\<`T`\>
