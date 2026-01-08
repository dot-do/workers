[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/workflow](../README.md) / Workflow

# Class: Workflow

Defined in: [objects/workflow/index.ts:182](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L182)

@dotdo/objects - The building blocks of autonomous startups

All Durable Objects in one package for convenience.
Each object can also be imported individually from its own package.

## Example

```typescript
// Import everything
import { DO, Agent, Startup, Workflow } from '@dotdo/objects'

// Or import specific objects
import { Agent } from '@dotdo/objects/agent'
import { Startup } from '@dotdo/objects/startup'
```

## Extends

- [`DO`](../../variables/DO.md)

## Constructors

### Constructor

> **new Workflow**(): `Workflow`

#### Returns

`Workflow`

#### Inherited from

`DO.constructor`

## Methods

### configure()

> **configure**(`config`): `this`

Defined in: [objects/workflow/index.ts:188](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L188)

Configure the workflow engine

#### Parameters

##### config

[`WorkflowConfig`](../interfaces/WorkflowConfig.md)

#### Returns

`this`

***

### register()

> **register**(`definition`): `Promise`\<[`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\>

Defined in: [objects/workflow/index.ts:200](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L200)

Register a workflow definition

#### Parameters

##### definition

[`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)

#### Returns

`Promise`\<[`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\>

***

### getDefinition()

> **getDefinition**(`workflowId`): `Promise`\<`StoredWorkflowDefinition` \| `null`\>

Defined in: [objects/workflow/index.ts:220](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L220)

Get a workflow definition

#### Parameters

##### workflowId

`string`

#### Returns

`Promise`\<`StoredWorkflowDefinition` \| `null`\>

***

### listDefinitions()

> **listDefinitions**(): `Promise`\<`StoredWorkflowDefinition`[]\>

Defined in: [objects/workflow/index.ts:227](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L227)

List all workflow definitions

#### Returns

`Promise`\<`StoredWorkflowDefinition`[]\>

***

### deleteDefinition()

> **deleteDefinition**(`workflowId`): `Promise`\<`boolean`\>

Defined in: [objects/workflow/index.ts:235](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L235)

Delete a workflow definition

#### Parameters

##### workflowId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### start()

> **start**(`workflowId`, `input`, `options`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

Defined in: [objects/workflow/index.ts:250](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L250)

Start a new workflow execution

#### Parameters

##### workflowId

`string`

##### input

`Record`\<`string`, `unknown`\> = `{}`

##### options

###### executionId?

`string`

###### triggeredBy?

\{ `type`: `"manual"` \| `"event"` \| `"schedule"`; `source?`: `string`; \}

###### triggeredBy.type

`"manual"` \| `"event"` \| `"schedule"`

###### triggeredBy.source?

`string`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

***

### executeAction()

> `protected` **executeAction**(`action`, `params`, `state`): `Promise`\<`unknown`\>

Defined in: [objects/workflow/index.ts:458](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L458)

Execute an action - override this to provide custom action handlers

#### Parameters

##### action

`string`

##### params

`Record`\<`string`, `unknown`\>

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

***

### status()

> **status**(`executionId`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md) \| `null`\>

Defined in: [objects/workflow/index.ts:500](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L500)

Get execution status

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md) \| `null`\>

***

### pause()

> **pause**(`executionId`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

Defined in: [objects/workflow/index.ts:507](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L507)

Pause a running execution

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

***

### resume()

> **resume**(`executionId`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

Defined in: [objects/workflow/index.ts:530](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L530)

Resume a paused execution

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

***

### cancel()

> **cancel**(`executionId`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

Defined in: [objects/workflow/index.ts:556](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L556)

Cancel an execution

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

***

### retry()

> **retry**(`executionId`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

Defined in: [objects/workflow/index.ts:574](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L574)

Retry a failed execution

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

***

### history()

> **history**(`executionId`): `Promise`\<[`HistoryEntry`](../interfaces/HistoryEntry.md)[]\>

Defined in: [objects/workflow/index.ts:604](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L604)

Get execution history

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<[`HistoryEntry`](../interfaces/HistoryEntry.md)[]\>

***

### listExecutions()

> **listExecutions**(`filters?`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)[]\>

Defined in: [objects/workflow/index.ts:612](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L612)

List executions with optional filters

#### Parameters

##### filters?

###### workflowId?

`string`

###### status?

[`WorkflowStatus`](../type-aliases/WorkflowStatus.md)

###### limit?

`number`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)[]\>

***

### replay()

> **replay**(`executionId`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

Defined in: [objects/workflow/index.ts:640](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L640)

Replay an execution (re-run with same input)

#### Parameters

##### executionId

`string`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)\>

***

### handleEvent()

> **handleEvent**(`event`, `data`): `Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)[]\>

Defined in: [objects/workflow/index.ts:656](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L656)

Handle incoming events to trigger workflows

#### Parameters

##### event

`string`

##### data

`unknown`

#### Returns

`Promise`\<[`WorkflowExecution`](../interfaces/WorkflowExecution.md)[]\>

***

### alarm()

> **alarm**(): `Promise`\<`void`\>

Defined in: [objects/workflow/index.ts:683](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/workflow/index.ts#L683)

Handle Durable Object alarms for scheduled continuations

#### Returns

`Promise`\<`void`\>
