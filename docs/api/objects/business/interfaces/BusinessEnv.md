[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/business](../README.md) / BusinessEnv

# Interface: BusinessEnv

Defined in: [objects/business/index.ts:26](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L26)

## Properties

### STRIPE?

> `optional` **STRIPE**: `object`

Defined in: [objects/business/index.ts:27](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L27)

#### charges

> **charges**: `object`

##### charges.create()

> **create**: (`opts`) => `Promise`\<`any`\>

###### Parameters

###### opts

`any`

###### Returns

`Promise`\<`any`\>

***

### ORG?

> `optional` **ORG**: `object`

Defined in: [objects/business/index.ts:28](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L28)

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

### LLM?

> `optional` **LLM**: `object`

Defined in: [objects/business/index.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L29)

#### complete()

> **complete**: (`opts`) => `Promise`\<`any`\>

##### Parameters

###### opts

`any`

##### Returns

`Promise`\<`any`\>
