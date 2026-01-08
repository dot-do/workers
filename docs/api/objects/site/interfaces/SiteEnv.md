[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/site](../README.md) / SiteEnv

# Interface: SiteEnv

Defined in: [objects/site/index.ts:30](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L30)

## Properties

### R2?

> `optional` **R2**: `object`

Defined in: [objects/site/index.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L31)

#### put()

> **put**: (`key`, `data`) => `Promise`\<`any`\>

##### Parameters

###### key

`string`

###### data

`any`

##### Returns

`Promise`\<`any`\>

#### get()

> **get**: (`key`) => `Promise`\<`any`\>

##### Parameters

###### key

`string`

##### Returns

`Promise`\<`any`\>

***

### LLM?

> `optional` **LLM**: `object`

Defined in: [objects/site/index.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L32)

#### complete()

> **complete**: (`opts`) => `Promise`\<`any`\>

##### Parameters

###### opts

`any`

##### Returns

`Promise`\<`any`\>

***

### ANALYTICS?

> `optional` **ANALYTICS**: `object`

Defined in: [objects/site/index.ts:33](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L33)

#### track()

> **track**: (`event`, `data`) => `Promise`\<`void`\>

##### Parameters

###### event

`string`

###### data

`any`

##### Returns

`Promise`\<`void`\>
