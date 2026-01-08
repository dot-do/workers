[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/human](../README.md) / Human

# Class: Human

Defined in: [objects/human/index.ts:54](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L54)

Human - A Durable Object for human-in-the-loop operations

Extends the base DO class to provide:
- Task queue management
- Approval/review workflows
- Escalation handling
- Human feedback collection
- SLA/deadline tracking

## Extends

- [`DO`](../../variables/DO.md)

## Constructors

### Constructor

> **new Human**(): `Human`

#### Returns

`Human`

#### Inherited from

`DO.constructor`

## Properties

### env

> **env**: [`HumanEnv`](../../interfaces/HumanEnv.md)

Defined in: [objects/human/index.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L55)

## Methods

### createTask()

> **createTask**(`input`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)\>

Defined in: [objects/human/index.ts:64](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L64)

Create a new human task

#### Parameters

##### input

[`CreateTaskInput`](../../interfaces/CreateTaskInput.md)

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)\>

***

### getTask()

> **getTask**(`taskId`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:111](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L111)

Get a task by ID

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### listTasks()

> **listTasks**(`options`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

Defined in: [objects/human/index.ts:118](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L118)

List tasks with optional filters

#### Parameters

##### options

[`ListTasksOptions`](../../interfaces/ListTasksOptions.md) = `{}`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

***

### updateTask()

> **updateTask**(`taskId`, `updates`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:146](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L146)

Update a task

#### Parameters

##### taskId

`string`

##### updates

`Partial`\<[`HumanTask`](../../interfaces/HumanTask.md)\>

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### assignTask()

> **assignTask**(`taskId`, `assignee`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:169](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L169)

Assign a task to a human

#### Parameters

##### taskId

`string`

##### assignee

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### unassignTask()

> **unassignTask**(`taskId`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:188](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L188)

Unassign a task

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### startTask()

> **startTask**(`taskId`, `worker`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:201](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L201)

Start working on a task

#### Parameters

##### taskId

`string`

##### worker

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### respondToTask()

> **respondToTask**(`taskId`, `response`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:222](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L222)

Respond to a task

#### Parameters

##### taskId

`string`

##### response

`Omit`\<[`HumanResponse`](../../interfaces/HumanResponse.md), `"respondedAt"` \| `"responseTimeMs"`\>

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### approve()

> **approve**(`taskId`, `comment?`, `respondedBy?`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:253](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L253)

Quick approve a task

#### Parameters

##### taskId

`string`

##### comment?

`string`

##### respondedBy?

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### reject()

> **reject**(`taskId`, `reason`, `respondedBy?`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:264](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L264)

Quick reject a task

#### Parameters

##### taskId

`string`

##### reason

`string`

##### respondedBy?

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### defer()

> **defer**(`taskId`, `reason?`, `respondedBy?`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:275](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L275)

Defer a task for later

#### Parameters

##### taskId

`string`

##### reason?

`string`

##### respondedBy?

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### escalate()

> **escalate**(`taskId`, `reason?`, `respondedBy?`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

Defined in: [objects/human/index.ts:286](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L286)

Escalate a task to the next level

#### Parameters

##### taskId

`string`

##### reason?

`string`

##### respondedBy?

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md) \| `null`\>

***

### getQueue()

> **getQueue**(`assignee?`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

Defined in: [objects/human/index.ts:326](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L326)

Get pending tasks queue for a user

#### Parameters

##### assignee?

`string`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

***

### getPendingCount()

> **getPendingCount**(`assignee?`): `Promise`\<`number`\>

Defined in: [objects/human/index.ts:338](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L338)

Get count of pending tasks

#### Parameters

##### assignee?

`string`

#### Returns

`Promise`\<`number`\>

***

### getStats()

> **getStats**(): `Promise`\<[`QueueStats`](../../interfaces/QueueStats.md)\>

Defined in: [objects/human/index.ts:346](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L346)

Get queue statistics

#### Returns

`Promise`\<[`QueueStats`](../../interfaces/QueueStats.md)\>

***

### submitFeedback()

> **submitFeedback**(`taskId`, `feedback`): `Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md)\>

Defined in: [objects/human/index.ts:420](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L420)

Submit feedback on AI output

#### Parameters

##### taskId

`string`

##### feedback

`Omit`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md), `"_id"` \| `"taskId"` \| `"providedAt"` \| `"processed"`\>

#### Returns

`Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md)\>

***

### getFeedback()

> **getFeedback**(`taskId`): `Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md)[]\>

Defined in: [objects/human/index.ts:439](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L439)

Get feedback for a task

#### Parameters

##### taskId

`string`

#### Returns

`Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md)[]\>

***

### getUnprocessedFeedback()

> **getUnprocessedFeedback**(): `Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md)[]\>

Defined in: [objects/human/index.ts:447](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L447)

Get all unprocessed feedback

#### Returns

`Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md)[]\>

***

### markFeedbackProcessed()

> **markFeedbackProcessed**(`feedbackId`): `Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md) \| `null`\>

Defined in: [objects/human/index.ts:455](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L455)

Mark feedback as processed

#### Parameters

##### feedbackId

`string`

#### Returns

`Promise`\<[`HumanFeedback`](../../interfaces/HumanFeedback.md) \| `null`\>

***

### getSLAAtRisk()

> **getSLAAtRisk**(`thresholdMs`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

Defined in: [objects/human/index.ts:471](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L471)

Get tasks breaching or about to breach SLA

#### Parameters

##### thresholdMs

`number` = `3600000`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

***

### getExpiringSoon()

> **getExpiringSoon**(`thresholdMs`): `Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

Defined in: [objects/human/index.ts:485](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L485)

Get tasks expiring soon

#### Parameters

##### thresholdMs

`number` = `3600000`

#### Returns

`Promise`\<[`HumanTask`](../../interfaces/HumanTask.md)[]\>

***

### alarm()

> **alarm**(): `Promise`\<`void`\>

Defined in: [objects/human/index.ts:503](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L503)

Handle scheduled alarms for expiration/escalation

#### Returns

`Promise`\<`void`\>

***

### hasMethod()

> **hasMethod**(`name`): `boolean`

Defined in: [objects/human/index.ts:550](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L550)

Check if a method is allowed for RPC

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### invoke()

> **invoke**(`method`, `params`): `Promise`\<`unknown`\>

Defined in: [objects/human/index.ts:580](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L580)

Invoke an RPC method

#### Parameters

##### method

`string`

##### params

`unknown`[]

#### Returns

`Promise`\<`unknown`\>

***

### fetch()

> **fetch**(`request`): `Promise`\<`Response`\>

Defined in: [objects/human/index.ts:595](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/index.ts#L595)

Handle HTTP requests

#### Parameters

##### request

`Request`

#### Returns

`Promise`\<`Response`\>
