[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / DOState

# Interface: DOState

Defined in: [packages/do-core/src/core.ts:11](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L11)

Minimal Durable Object state interface

## Properties

### id

> `readonly` **id**: [`DurableObjectId`](DurableObjectId.md)

Defined in: [packages/do-core/src/core.ts:13](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L13)

Unique ID of this DO instance

***

### storage

> `readonly` **storage**: [`DOStorage`](DOStorage.md)

Defined in: [packages/do-core/src/core.ts:15](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L15)

Storage interface for persisting data

## Methods

### blockConcurrencyWhile()

> **blockConcurrencyWhile**(`callback`): `void`

Defined in: [packages/do-core/src/core.ts:17](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L17)

Block concurrent requests while initializing

#### Parameters

##### callback

() => `Promise`\<`void`\>

#### Returns

`void`

***

### acceptWebSocket()

> **acceptWebSocket**(`ws`, `tags?`): `void`

Defined in: [packages/do-core/src/core.ts:19](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L19)

Accept a WebSocket for hibernation

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

Defined in: [packages/do-core/src/core.ts:21](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L21)

Get WebSockets by tag

#### Parameters

##### tag?

`string`

#### Returns

`WebSocket`[]

***

### setWebSocketAutoResponse()

> **setWebSocketAutoResponse**(`pair`): `void`

Defined in: [packages/do-core/src/core.ts:23](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L23)

Set auto-response for hibernated WebSockets

#### Parameters

##### pair

[`WebSocketRequestResponsePair`](WebSocketRequestResponsePair.md)

#### Returns

`void`
