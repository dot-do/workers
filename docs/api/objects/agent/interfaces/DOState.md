[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / DOState

# Interface: DOState

Defined in: [objects/agent/index.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L57)

Minimal Durable Object state interface

## Properties

### id

> `readonly` **id**: [`DurableObjectId`](DurableObjectId.md)

Defined in: [objects/agent/index.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L58)

***

### storage

> `readonly` **storage**: [`DOStorage`](DOStorage.md)

Defined in: [objects/agent/index.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L59)

## Methods

### blockConcurrencyWhile()

> **blockConcurrencyWhile**(`callback`): `void`

Defined in: [objects/agent/index.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L60)

#### Parameters

##### callback

() => `Promise`\<`void`\>

#### Returns

`void`

***

### acceptWebSocket()

> **acceptWebSocket**(`ws`, `tags?`): `void`

Defined in: [objects/agent/index.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L61)

#### Parameters

##### ws

`WebSocket`

##### tags?

`string`[]

#### Returns

`void`

***

### getWebSockets()

> **getWebSockets**(`tag?`): `WebSocket`[]

Defined in: [objects/agent/index.ts:62](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L62)

#### Parameters

##### tag?

`string`

#### Returns

`WebSocket`[]
