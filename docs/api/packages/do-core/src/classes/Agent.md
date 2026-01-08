[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / Agent

# Class: Agent\<Env, State\>

Defined in: [packages/do-core/src/agent.ts:176](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L176)

Base Agent class for building Durable Object agents.

Extends DOCore with structured lifecycle management, message handling,
and state tracking. Designed for inheritance - subclasses implement
the abstract methods `init()`, `cleanup()`, and `handleMessage()`.

## Lifecycle
```
constructor() -> start() -> [init() -> onStart()] -> ... -> stop() -> [onStop() -> cleanup()]
```

## Extension Points
- `init()`: Load persisted state, initialize resources (required)
- `cleanup()`: Persist state, release resources (required)
- `handleMessage()`: Process incoming messages (required)
- `onStart()`: Post-initialization setup (optional)
- `onStop()`: Pre-shutdown tasks (optional)
- `onError()`: Error recovery (optional)

## Example

```typescript
class MyAgent extends Agent {
  private data: Map<string, unknown> = new Map()

  async init(): Promise<void> {
    const saved = await this.ctx.storage.get('data')
    if (saved) this.data = new Map(Object.entries(saved))
    await this.markInitialized()
  }

  async cleanup(): Promise<void> {
    await this.ctx.storage.put('data', Object.fromEntries(this.data))
  }

  async handleMessage(message: AgentMessage): Promise<unknown> {
    const handler = this.getHandler(message.type)
    if (handler) return handler(message)
    throw new Error(`Unknown: ${message.type}`)
  }
}
```

## Extends

- [`DOCore`](DOCore.md)\<`Env`\>

## Type Parameters

### Env

`Env` *extends* [`DOEnv`](../interfaces/DOEnv.md) = [`DOEnv`](../interfaces/DOEnv.md)

Environment bindings type (extends DOEnv)

### State

`State` *extends* [`AgentState`](../interfaces/AgentState.md) = [`AgentState`](../interfaces/AgentState.md)

Agent state type (extends AgentState)

## Constructors

### Constructor

> **new Agent**\<`Env`, `State`\>(`ctx`, `env`, `config?`): `Agent`\<`Env`, `State`\>

Defined in: [packages/do-core/src/agent.ts:200](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L200)

Create a new Agent instance.

#### Parameters

##### ctx

[`DOState`](../interfaces/DOState.md)

Durable Object state (id, storage, etc.)

##### env

`Env`

Environment bindings

##### config?

[`AgentConfig`](../interfaces/AgentConfig.md)

Optional agent configuration

#### Returns

`Agent`\<`Env`, `State`\>

#### Overrides

[`DOCore`](DOCore.md).[`constructor`](DOCore.md#constructor)

## Properties

### config?

> `protected` `readonly` `optional` **config**: [`AgentConfig`](../interfaces/AgentConfig.md)

Defined in: [packages/do-core/src/agent.ts:181](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L181)

Agent configuration passed to constructor

***

### ctx

> `protected` `readonly` **ctx**: [`DOState`](../interfaces/DOState.md)

Defined in: [packages/do-core/src/core.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L113)

#### Inherited from

[`DOCore`](DOCore.md).[`ctx`](DOCore.md#ctx)

***

### env

> `protected` `readonly` **env**: `Env`

Defined in: [packages/do-core/src/core.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L114)

#### Inherited from

[`DOCore`](DOCore.md).[`env`](DOCore.md#env-1)

## Accessors

### id

#### Get Signature

> **get** **id**(): `string`

Defined in: [packages/do-core/src/agent.ts:208](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L208)

Get the unique agent ID (derived from Durable Object ID).

##### Returns

`string`

## Methods

### init()

> **init**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/agent.ts:236](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L236)

Initialize the agent (required override).

Called by `start()` when the agent is first created or restored.
Subclasses must implement this to:
- Load persisted state from storage
- Initialize resources and connections
- Call `markInitialized()` when complete

#### Returns

`Promise`\<`void`\>

#### Throws

Error if not implemented (subclass must override)

#### Example

```typescript
async init(): Promise<void> {
  const data = await this.ctx.storage.get('agent-state')
  if (data) this.restoreFrom(data)
  await this.markInitialized()
}
```

***

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/agent.ts:259](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L259)

Clean up agent resources (required override).

Called by `stop()` before agent shutdown.
Subclasses must implement this to:
- Persist current state to storage
- Release resources and close connections
- Perform any necessary cleanup

#### Returns

`Promise`\<`void`\>

#### Throws

Error if not implemented (subclass must override)

#### Example

```typescript
async cleanup(): Promise<void> {
  await this.ctx.storage.put('agent-state', this.serialize())
  this.connections.forEach(conn => conn.close())
}
```

***

### onStart()

> **onStart**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/agent.ts:269](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L269)

Hook called after init() completes (optional override).

Use for post-initialization setup that depends on init() being complete.
Default implementation is a no-op.

#### Returns

`Promise`\<`void`\>

***

### onStop()

> **onStop**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/agent.ts:279](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L279)

Hook called before cleanup() (optional override).

Use for pre-shutdown tasks like flushing buffers or notifying peers.
Default implementation is a no-op.

#### Returns

`Promise`\<`void`\>

***

### onError()

> **onError**(`_error`, `_context`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/agent.ts:293](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L293)

Error recovery hook (optional override).

Called when an error occurs during message handling.
Use for logging, metrics, or recovery logic.
Default implementation is a no-op.

#### Parameters

##### \_error

`Error`

The error that occurred

##### \_context

`unknown`

Context in which error occurred (typically the message)

#### Returns

`Promise`\<`void`\>

***

### start()

> **start**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/agent.ts:303](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L303)

Start the agent by calling init() then onStart().

Records the start timestamp in agent state.
Call this to fully initialize an agent before use.

#### Returns

`Promise`\<`void`\>

***

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/agent.ts:314](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L314)

Stop the agent by calling onStop() then cleanup().

Call this for graceful shutdown before the agent is destroyed.

#### Returns

`Promise`\<`void`\>

***

### markInitialized()

> `protected` **markInitialized**(): `void`

Defined in: [packages/do-core/src/agent.ts:327](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L327)

Mark the agent as initialized.

Call this from your init() implementation after setup is complete.
This updates the state.initialized flag to true.

#### Returns

`void`

***

### updateActivity()

> `protected` **updateActivity**(): `void`

Defined in: [packages/do-core/src/agent.ts:339](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L339)

Update the last activity timestamp.

Call this when the agent performs significant work.
Useful for tracking agent activity and implementing timeouts.

#### Returns

`void`

***

### getState()

> **getState**(): `State`

Defined in: [packages/do-core/src/agent.ts:355](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L355)

Get a copy of the current agent state.

Returns a shallow copy to prevent external mutation.
For custom state, override this method in your subclass.

#### Returns

`State`

Copy of current agent state

***

### handleMessage()

> **handleMessage**(`_message`): `Promise`\<`unknown`\>

Defined in: [packages/do-core/src/agent.ts:392](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L392)

Handle an incoming message (required override).

Subclasses must implement this to:
- Route messages to registered handlers by type
- Process message payloads
- Return appropriate responses

#### Parameters

##### \_message

[`AgentMessage`](../interfaces/AgentMessage.md)

The incoming message to handle

#### Returns

`Promise`\<`unknown`\>

Response data (type depends on message type)

#### Throws

Error if not implemented (subclass must override)

#### Example

```typescript
async handleMessage(message: AgentMessage): Promise<unknown> {
  await this.updateActivity()
  const handler = this.getHandler(message.type)
  if (handler) {
    try {
      return await handler(message)
    } catch (error) {
      await this.onError(error as Error, message)
      throw error
    }
  }
  throw new Error(`Unknown message type: ${message.type}`)
}
```

***

### registerHandler()

> **registerHandler**(`type`, `handler`): `void`

Defined in: [packages/do-core/src/agent.ts:413](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L413)

Register a handler for a message type.

Handlers are stored by type and can be retrieved via `getHandler()`.
Registering a handler for an existing type replaces the previous handler.

#### Parameters

##### type

`string`

The message type to handle

##### handler

[`MessageHandler`](../type-aliases/MessageHandler.md)

The handler function

#### Returns

`void`

#### Example

```typescript
this.registerHandler('greet', async (msg) => {
  const { name } = msg.payload as { name: string }
  return `Hello, ${name}!`
})
```

***

### getHandler()

> **getHandler**(`type`): [`MessageHandler`](../type-aliases/MessageHandler.md) \| `undefined`

Defined in: [packages/do-core/src/agent.ts:423](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L423)

Get the registered handler for a message type.

#### Parameters

##### type

`string`

The message type to look up

#### Returns

[`MessageHandler`](../type-aliases/MessageHandler.md) \| `undefined`

The handler function, or undefined if not registered

***

### unregisterHandler()

> **unregisterHandler**(`type`): `void`

Defined in: [packages/do-core/src/agent.ts:432](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L432)

Unregister a handler for a message type.

#### Parameters

##### type

`string`

The message type to unregister

#### Returns

`void`

***

### hasHandler()

> **hasHandler**(`type`): `boolean`

Defined in: [packages/do-core/src/agent.ts:442](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L442)

Check if a handler is registered for a message type.

#### Parameters

##### type

`string`

The message type to check

#### Returns

`boolean`

true if a handler is registered

***

### getHandlerTypes()

> **getHandlerTypes**(): `string`[]

Defined in: [packages/do-core/src/agent.ts:451](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/agent.ts#L451)

Get all registered handler types.

#### Returns

`string`[]

Array of registered message types

***

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

#### Inherited from

[`DOCore`](DOCore.md).[`fetch`](DOCore.md#fetch)

***

### alarm()

> **alarm**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:133](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L133)

Handle scheduled alarms

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`DOCore`](DOCore.md).[`alarm`](DOCore.md#alarm)

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

#### Inherited from

[`DOCore`](DOCore.md).[`webSocketMessage`](DOCore.md#websocketmessage)

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

#### Inherited from

[`DOCore`](DOCore.md).[`webSocketClose`](DOCore.md#websocketclose)

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

#### Inherited from

[`DOCore`](DOCore.md).[`webSocketError`](DOCore.md#websocketerror)
