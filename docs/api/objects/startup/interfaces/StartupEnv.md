[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/startup](../README.md) / StartupEnv

# Interface: StartupEnv

Defined in: [objects/startup/index.ts:35](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L35)

## Properties

### BUSINESS?

> `optional` **BUSINESS**: `DurableObjectStub`\<`undefined`\>

Defined in: [objects/startup/index.ts:36](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L36)

***

### LLM?

> `optional` **LLM**: `object`

Defined in: [objects/startup/index.ts:37](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L37)

#### complete()

> **complete**: (`opts`) => `Promise`\<`any`\>

##### Parameters

###### opts

`any`

##### Returns

`Promise`\<`any`\>

***

### ORG?

> `optional` **ORG**: `object`

Defined in: [objects/startup/index.ts:38](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L38)

#### users

> **users**: `object`

##### users.get()

> **get**: (`id`) => `Promise`\<`any`\>

###### Parameters

###### id

`string`

###### Returns

`Promise`\<`any`\>

***

### R2?

> `optional` **R2**: `R2Bucket`

Defined in: [objects/startup/index.ts:39](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L39)
