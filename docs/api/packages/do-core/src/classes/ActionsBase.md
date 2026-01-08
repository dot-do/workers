[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ActionsBase

# Class: ActionsBase\<Env\>

Defined in: [packages/do-core/src/actions-mixin.ts:748](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L748)

## Extends

- `ActionsMixinBase`

## Type Parameters

### Env

`Env` *extends* [`DOEnv`](../interfaces/DOEnv.md) = [`DOEnv`](../interfaces/DOEnv.md)

## Constructors

### Constructor

> **new ActionsBase**\<`Env`\>(`ctx`, `env`): `ActionsBase`\<`Env`\>

Defined in: [packages/do-core/src/actions-mixin.ts:751](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L751)

#### Parameters

##### ctx

[`DOState`](../interfaces/DOState.md)

##### env

`Env`

#### Returns

`ActionsBase`\<`Env`\>

#### Overrides

`ActionsMixinBase.constructor`

## Properties

### env

> `protected` `readonly` **env**: `Env`

Defined in: [packages/do-core/src/actions-mixin.ts:749](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L749)

#### Overrides

`ActionsMixinBase.env`

***

### ctx

> `protected` `readonly` **ctx**: [`DOState`](../interfaces/DOState.md)

Defined in: [packages/do-core/src/core.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L113)

#### Inherited from

`ActionsMixinBase.ctx`

## Accessors

### runningWorkflowCount

#### Get Signature

> **get** **runningWorkflowCount**(): `number`

Defined in: [packages/do-core/src/actions-mixin.ts:717](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L717)

Get the number of running workflows

##### Returns

`number`

#### Inherited from

`ActionsMixinBase.runningWorkflowCount`

## Methods

### registerAction()

> **registerAction**\<`TParams`, `TResult`\>(`name`, `definition`): `void`

Defined in: [packages/do-core/src/actions-mixin.ts:278](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L278)

Register an action handler

#### Type Parameters

##### TParams

`TParams` = `unknown`

##### TResult

`TResult` = `unknown`

#### Parameters

##### name

`string`

Unique action name

##### definition

[`ActionDefinition`](../interfaces/ActionDefinition.md)\<`TParams`, `TResult`\>

Action definition with handler

#### Returns

`void`

#### Example

```typescript
this.registerAction('greet', {
  description: 'Greet a user by name',
  parameters: {
    name: { type: 'string', required: true, description: 'User name' }
  },
  handler: async ({ name }) => `Hello, ${name}!`
})
```

#### Inherited from

`ActionsMixinBase.registerAction`

***

### unregisterAction()

> **unregisterAction**(`name`): `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:291](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L291)

Unregister an action

#### Parameters

##### name

`string`

Action name to remove

#### Returns

`boolean`

true if action was removed, false if not found

#### Inherited from

`ActionsMixinBase.unregisterAction`

***

### hasAction()

> **hasAction**(`name`): `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:301](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L301)

Check if an action is registered

#### Parameters

##### name

`string`

Action name to check

#### Returns

`boolean`

true if action exists

#### Inherited from

`ActionsMixinBase.hasAction`

***

### executeAction()

> **executeAction**\<`TResult`\>(`name`, `params`): `Promise`\<[`ActionResult`](../interfaces/ActionResult.md)\<`TResult`\>\>

Defined in: [packages/do-core/src/actions-mixin.ts:326](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L326)

Execute a registered action

#### Type Parameters

##### TResult

`TResult` = `unknown`

#### Parameters

##### name

`string`

Action name to execute

##### params

`unknown` = `{}`

Parameters to pass to the action

#### Returns

`Promise`\<[`ActionResult`](../interfaces/ActionResult.md)\<`TResult`\>\>

Action result with success status and data

#### Example

```typescript
const result = await this.executeAction('greet', { name: 'World' })
if (result.success) {
  console.log(result.data) // 'Hello, World!'
} else {
  console.error(result.error)
}
```

#### Inherited from

`ActionsMixinBase.executeAction`

***

### listActions()

> **listActions**(): [`ActionInfo`](../interfaces/ActionInfo.md)[]

Defined in: [packages/do-core/src/actions-mixin.ts:476](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L476)

List all registered actions with their metadata

#### Returns

[`ActionInfo`](../interfaces/ActionInfo.md)[]

Array of action info objects

#### Example

```typescript
const actions = this.listActions()
// [{ name: 'greet', description: 'Greet a user', parameters: {...} }]
```

#### Inherited from

`ActionsMixinBase.listActions`

***

### useMiddleware()

> **useMiddleware**(`middleware`): `void`

Defined in: [packages/do-core/src/actions-mixin.ts:513](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L513)

Add middleware to the action execution chain

Middleware is executed in the order it was added, wrapping the action execution.

#### Parameters

##### middleware

[`ActionMiddleware`](../type-aliases/ActionMiddleware.md)

Middleware function

#### Returns

`void`

#### Example

```typescript
// Logging middleware
this.useMiddleware(async (action, params, next) => {
  console.log(`Executing ${action}`)
  const result = await next()
  console.log(`Completed ${action}: ${result.success}`)
  return result
})
```

#### Inherited from

`ActionsMixinBase.useMiddleware`

***

### clearMiddleware()

> **clearMiddleware**(): `void`

Defined in: [packages/do-core/src/actions-mixin.ts:520](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L520)

Clear all middleware

#### Returns

`void`

#### Inherited from

`ActionsMixinBase.clearMiddleware`

***

### runWorkflow()

> **runWorkflow**(`workflow`): `Promise`\<[`WorkflowResult`](../interfaces/WorkflowResult.md)\>

Defined in: [packages/do-core/src/actions-mixin.ts:548](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L548)

Run a multi-step workflow

Workflows execute steps in dependency order, tracking results and
supporting cancellation.

#### Parameters

##### workflow

[`Workflow`](../interfaces/Workflow.md)

Workflow definition

#### Returns

`Promise`\<[`WorkflowResult`](../interfaces/WorkflowResult.md)\>

Workflow result with step outcomes

#### Example

```typescript
const result = await this.runWorkflow({
  id: 'onboarding',
  steps: [
    { id: 'create-user', action: 'createUser', params: { name: 'Alice' } },
    { id: 'send-email', action: 'sendWelcome', dependsOn: ['create-user'] }
  ]
})
```

#### Inherited from

`ActionsMixinBase.runWorkflow`

***

### cancelWorkflow()

> **cancelWorkflow**(`id`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/actions-mixin.ts:697](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L697)

Cancel a running workflow

#### Parameters

##### id

`string`

Workflow ID to cancel

#### Returns

`Promise`\<`void`\>

true if workflow was cancelled, false if not found

#### Example

```typescript
// Start workflow in background
const workflowPromise = this.runWorkflow(myWorkflow)

// Cancel it
await this.cancelWorkflow(myWorkflow.id)
```

#### Inherited from

`ActionsMixinBase.cancelWorkflow`

***

### isWorkflowRunning()

> **isWorkflowRunning**(`id`): `boolean`

Defined in: [packages/do-core/src/actions-mixin.ts:710](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/actions-mixin.ts#L710)

Check if a workflow is currently running

#### Parameters

##### id

`string`

Workflow ID to check

#### Returns

`boolean`

true if workflow is running

#### Inherited from

`ActionsMixinBase.isWorkflowRunning`

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

`ActionsMixinBase.fetch`

***

### alarm()

> **alarm**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/core.ts:133](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/core.ts#L133)

Handle scheduled alarms

#### Returns

`Promise`\<`void`\>

#### Inherited from

`ActionsMixinBase.alarm`

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

`ActionsMixinBase.webSocketMessage`

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

`ActionsMixinBase.webSocketClose`

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

`ActionsMixinBase.webSocketError`
