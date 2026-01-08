[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / DOCore

# Class: DOCore\<Env\>

Defined in: [packages/do-core/src/core.ts:112](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L112)

Base class for slim Durable Objects
Tests define what this class must implement

## Extended by

- [`Agent`](Agent.md)

## Type Parameters

### Env

`Env` *extends* [`DOEnv`](../interfaces/DOEnv.md) = [`DOEnv`](../interfaces/DOEnv.md)

## Constructors

### Constructor

> **new DOCore**\<`Env`\>(`ctx`, `env`): `DOCore`\<`Env`\>

Defined in: [packages/do-core/src/core.ts:116](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L116)

#### Parameters

##### ctx

[`DOState`](../interfaces/DOState.md)

##### env

`Env`

#### Returns

`DOCore`\<`Env`\>

## Properties

### ctx

> `protected` `readonly` **ctx**: [`DOState`](../interfaces/DOState.md)

Defined in: [packages/do-core/src/core.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L113)

***

### env

> `protected` `readonly` **env**: `Env`

Defined in: [packages/do-core/src/core.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L114)

## Methods

### fetch()

> **fetch**(`_request`): `Promise`\<`Response`\>

Defined in: [packages/do-core/src/core.ts:125](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L125)

Handle incoming HTTP requests
This is the primary entry point for DO

#### Parameters

##### \_request

`Request`

#### Returns

`Promise`\<`Response`\>

***

### alarm()

> **alarm**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:133](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L133)

Handle scheduled alarms

#### Returns

`Promise`\<`void`\>

***

### webSocketMessage()

> **webSocketMessage**(`_ws`, `_message`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:141](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L141)

Handle WebSocket messages (hibernation-compatible)

#### Parameters

##### \_ws

`WebSocket`

##### \_message

`string` | `ArrayBuffer`

#### Returns

`Promise`\<`void`\>

***

### webSocketClose()

> **webSocketClose**(`_ws`, `_code`, `_reason`, `_wasClean`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:149](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L149)

Handle WebSocket close events (hibernation-compatible)

#### Parameters

##### \_ws

`WebSocket`

##### \_code

`number`

##### \_reason

`string`

##### \_wasClean

`boolean`

#### Returns

`Promise`\<`void`\>

***

### webSocketError()

> **webSocketError**(`_ws`, `_error`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:162](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L162)

Handle WebSocket errors (hibernation-compatible)

#### Parameters

##### \_ws

`WebSocket`

##### \_error

`unknown`

#### Returns

`Promise`\<`void`\>
