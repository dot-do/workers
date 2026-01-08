[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/agent](../README.md) / Agent

# Class: Agent\<Env\>

Defined in: [objects/agent/index.ts:421](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L421)

Agent - Persistent AI Agent Durable Object

A base class for building AI agents with:
- Long-term memory persistence
- Conversation history tracking
- Action execution logging
- Goal tracking and planning
- Learning and improvement over time

## Example

```typescript
export class MyAgent extends Agent {
  async init() {
    await super.init()

    // Configure personality
    await this.setPersonality({
      name: 'Assistant',
      role: 'Customer Support Agent',
      traits: ['helpful', 'patient', 'knowledgeable'],
      style: 'friendly'
    })

    // Register actions
    this.registerAction('lookup', {
      description: 'Look up information in knowledge base',
      handler: async ({ query }) => this.lookup(query)
    })
  }
}
```

## Type Parameters

### Env

`Env` *extends* [`DOEnv`](../interfaces/DOEnv.md) = [`DOEnv`](../interfaces/DOEnv.md)

## Constructors

### Constructor

> **new Agent**\<`Env`\>(`ctx`, `env`, `config?`): `Agent`\<`Env`\>

Defined in: [objects/agent/index.ts:438](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L438)

#### Parameters

##### ctx

[`DOState`](../interfaces/DOState.md)

##### env

`Env`

##### config?

[`AgentConfig`](../interfaces/AgentConfig.md)

#### Returns

`Agent`\<`Env`\>

## Properties

### ctx

> `protected` `readonly` **ctx**: [`DOState`](../interfaces/DOState.md)

Defined in: [objects/agent/index.ts:422](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L422)

***

### env

> `protected` `readonly` **env**: `Env`

Defined in: [objects/agent/index.ts:423](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L423)

***

### config?

> `protected` `readonly` `optional` **config**: [`AgentConfig`](../interfaces/AgentConfig.md)

Defined in: [objects/agent/index.ts:424](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L424)

## Accessors

### id

#### Get Signature

> **get** **id**(): `string`

Defined in: [objects/agent/index.ts:447](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L447)

Get the unique agent ID

##### Returns

`string`

## Methods

### init()

> **init**(): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:461](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L461)

Initialize the agent

Loads persisted state including memories, goals, and learnings.
Subclasses should call super.init() first.

#### Returns

`Promise`\<`void`\>

***

### start()

> **start**(): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:479](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L479)

Start the agent

#### Returns

`Promise`\<`void`\>

***

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:487](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L487)

Stop the agent and persist state

#### Returns

`Promise`\<`void`\>

***

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:494](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L494)

Clean up and persist agent state

#### Returns

`Promise`\<`void`\>

***

### fetch()

> **fetch**(`_request`): `Promise`\<`Response`\>

Defined in: [objects/agent/index.ts:501](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L501)

Handle HTTP requests

#### Parameters

##### \_request

`Request`

#### Returns

`Promise`\<`Response`\>

***

### registerAction()

> **registerAction**\<`TParams`, `TResult`\>(`name`, `definition`): `void`

Defined in: [objects/agent/index.ts:512](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L512)

Register an action handler

#### Type Parameters

##### TParams

`TParams` = `unknown`

##### TResult

`TResult` = `unknown`

#### Parameters

##### name

`string`

##### definition

[`ActionDefinition`](../interfaces/ActionDefinition.md)\<`TParams`, `TResult`\>

#### Returns

`void`

***

### unregisterAction()

> **unregisterAction**(`name`): `boolean`

Defined in: [objects/agent/index.ts:522](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L522)

Unregister an action

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### hasAction()

> **hasAction**(`name`): `boolean`

Defined in: [objects/agent/index.ts:529](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L529)

Check if an action is registered

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### listActions()

> **listActions**(): `object`[]

Defined in: [objects/agent/index.ts:536](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L536)

List all registered actions

#### Returns

`object`[]

***

### executeAction()

> **executeAction**\<`TResult`\>(`name`, `params`): `Promise`\<[`ActionResult`](../interfaces/ActionResult.md)\<`TResult`\>\>

Defined in: [objects/agent/index.ts:551](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L551)

Execute a registered action

#### Type Parameters

##### TResult

`TResult` = `unknown`

#### Parameters

##### name

`string`

##### params

`unknown` = `{}`

#### Returns

`Promise`\<[`ActionResult`](../interfaces/ActionResult.md)\<`TResult`\>\>

***

### remember()

> **remember**(`memory`): `Promise`\<[`Memory`](../interfaces/Memory.md)\>

Defined in: [objects/agent/index.ts:605](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L605)

Store a memory

#### Parameters

##### memory

`Omit`\<[`Memory`](../interfaces/Memory.md), `"id"` \| `"createdAt"` \| `"lastAccessedAt"` \| `"accessCount"`\>

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)\>

***

### recall()

> **recall**(`memoryId`): `Promise`\<[`Memory`](../interfaces/Memory.md) \| `null`\>

Defined in: [objects/agent/index.ts:628](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L628)

Recall a specific memory by ID

#### Parameters

##### memoryId

`string`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md) \| `null`\>

***

### getMemories()

> **getMemories**(`options?`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Defined in: [objects/agent/index.ts:643](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L643)

Query memories based on criteria

#### Parameters

##### options?

[`MemoryQueryOptions`](../interfaces/MemoryQueryOptions.md)

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

***

### getRelevantMemories()

> **getRelevantMemories**(`_query`, `limit`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Defined in: [objects/agent/index.ts:691](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L691)

Get memories relevant to a query

#### Parameters

##### \_query

`string`

##### limit

`number` = `10`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

***

### forget()

> **forget**(`memoryId`): `Promise`\<`boolean`\>

Defined in: [objects/agent/index.ts:705](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L705)

Forget a memory

#### Parameters

##### memoryId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### clearMemories()

> **clearMemories**(`type?`): `Promise`\<`number`\>

Defined in: [objects/agent/index.ts:716](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L716)

Clear all memories of a specific type

#### Parameters

##### type?

`string`

#### Returns

`Promise`\<`number`\>

***

### startConversation()

> **startConversation**(`title?`, `tags?`): `Promise`\<[`Conversation`](../interfaces/Conversation.md)\>

Defined in: [objects/agent/index.ts:741](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L741)

Start a new conversation

#### Parameters

##### title?

`string`

##### tags?

`string`[]

#### Returns

`Promise`\<[`Conversation`](../interfaces/Conversation.md)\>

***

### addMessage()

> **addMessage**(`conversationId`, `message`): `Promise`\<[`ConversationMessage`](../interfaces/ConversationMessage.md)\>

Defined in: [objects/agent/index.ts:764](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L764)

Add a message to a conversation

#### Parameters

##### conversationId

`string`

##### message

`Omit`\<[`ConversationMessage`](../interfaces/ConversationMessage.md), `"id"` \| `"timestamp"`\>

#### Returns

`Promise`\<[`ConversationMessage`](../interfaces/ConversationMessage.md)\>

***

### getConversation()

> **getConversation**(`conversationId`): `Promise`\<[`Conversation`](../interfaces/Conversation.md) \| `null`\>

Defined in: [objects/agent/index.ts:791](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L791)

Get a conversation by ID

#### Parameters

##### conversationId

`string`

#### Returns

`Promise`\<[`Conversation`](../interfaces/Conversation.md) \| `null`\>

***

### getActiveConversation()

> **getActiveConversation**(): `Promise`\<[`Conversation`](../interfaces/Conversation.md) \| `null`\>

Defined in: [objects/agent/index.ts:798](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L798)

Get the current active conversation

#### Returns

`Promise`\<[`Conversation`](../interfaces/Conversation.md) \| `null`\>

***

### getConversations()

> **getConversations**(`options?`): `Promise`\<[`Conversation`](../interfaces/Conversation.md)[]\>

Defined in: [objects/agent/index.ts:806](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L806)

List conversations

#### Parameters

##### options?

[`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)

#### Returns

`Promise`\<[`Conversation`](../interfaces/Conversation.md)[]\>

***

### endConversation()

> **endConversation**(`conversationId`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:837](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L837)

End a conversation

#### Parameters

##### conversationId

`string`

#### Returns

`Promise`\<`void`\>

***

### executeTrackedAction()

> **executeTrackedAction**\<`TResult`\>(`name`, `params`, `conversationId?`): `Promise`\<[`ActionExecution`](../interfaces/ActionExecution.md)\>

Defined in: [objects/agent/index.ts:856](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L856)

Execute and track an action

#### Type Parameters

##### TResult

`TResult` = `unknown`

#### Parameters

##### name

`string`

##### params

`unknown` = `{}`

##### conversationId?

`string`

#### Returns

`Promise`\<[`ActionExecution`](../interfaces/ActionExecution.md)\>

***

### recordFeedback()

> **recordFeedback**(`executionId`, `feedback`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:887](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L887)

Record feedback on an action execution

#### Parameters

##### executionId

`string`

##### feedback

\{ `rating`: `number`; `comment?`: `string`; \} | `undefined`

#### Returns

`Promise`\<`void`\>

***

### getExecutions()

> **getExecutions**(`options?`): `Promise`\<[`ActionExecution`](../interfaces/ActionExecution.md)[]\>

Defined in: [objects/agent/index.ts:911](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L911)

Get recent action executions

#### Parameters

##### options?

###### action?

`string`

###### conversationId?

`string`

###### since?

`number`

###### limit?

`number`

#### Returns

`Promise`\<[`ActionExecution`](../interfaces/ActionExecution.md)[]\>

***

### setGoal()

> **setGoal**(`goal`): `Promise`\<[`Goal`](../interfaces/Goal.md)\>

Defined in: [objects/agent/index.ts:949](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L949)

Set a new goal

#### Parameters

##### goal

`Omit`\<[`Goal`](../interfaces/Goal.md), `"id"` \| `"status"` \| `"progress"` \| `"createdAt"`\>

#### Returns

`Promise`\<[`Goal`](../interfaces/Goal.md)\>

***

### updateGoalProgress()

> **updateGoalProgress**(`goalId`, `progress`, `notes?`): `Promise`\<[`Goal`](../interfaces/Goal.md) \| `null`\>

Defined in: [objects/agent/index.ts:971](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L971)

Update goal progress

#### Parameters

##### goalId

`string`

##### progress

`number`

##### notes?

`string`

#### Returns

`Promise`\<[`Goal`](../interfaces/Goal.md) \| `null`\>

***

### getGoal()

> **getGoal**(`goalId`): `Promise`\<[`Goal`](../interfaces/Goal.md) \| `null`\>

Defined in: [objects/agent/index.ts:997](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L997)

Get a goal by ID

#### Parameters

##### goalId

`string`

#### Returns

`Promise`\<[`Goal`](../interfaces/Goal.md) \| `null`\>

***

### getGoals()

> **getGoals**(`options?`): `Promise`\<[`Goal`](../interfaces/Goal.md)[]\>

Defined in: [objects/agent/index.ts:1004](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1004)

List goals

#### Parameters

##### options?

###### status?

`"active"` \| `"completed"` \| `"failed"` \| `"paused"`

###### priority?

`number`

###### limit?

`number`

#### Returns

`Promise`\<[`Goal`](../interfaces/Goal.md)[]\>

***

### completeGoal()

> **completeGoal**(`goalId`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:1036](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1036)

Complete a goal

#### Parameters

##### goalId

`string`

#### Returns

`Promise`\<`void`\>

***

### failGoal()

> **failGoal**(`goalId`, `reason?`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:1050](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1050)

Fail a goal

#### Parameters

##### goalId

`string`

##### reason?

`string`

#### Returns

`Promise`\<`void`\>

***

### learn()

> **learn**(`learning`): `Promise`\<[`Learning`](../interfaces/Learning.md)\>

Defined in: [objects/agent/index.ts:1071](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1071)

Record a learning

#### Parameters

##### learning

`Omit`\<[`Learning`](../interfaces/Learning.md), `"id"` \| `"learnedAt"` \| `"applicationCount"` \| `"valid"`\>

#### Returns

`Promise`\<[`Learning`](../interfaces/Learning.md)\>

***

### getLearnings()

> **getLearnings**(`options?`): `Promise`\<[`Learning`](../interfaces/Learning.md)[]\>

Defined in: [objects/agent/index.ts:1093](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1093)

Get learnings

#### Parameters

##### options?

###### category?

`"behavior"` \| `"knowledge"` \| `"skill"` \| `"preference"` \| `"error"`

###### minConfidence?

`number`

###### validOnly?

`boolean`

###### limit?

`number`

#### Returns

`Promise`\<[`Learning`](../interfaces/Learning.md)[]\>

***

### applyLearning()

> **applyLearning**(`learningId`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:1132](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1132)

Apply a learning (increment application count)

#### Parameters

##### learningId

`string`

#### Returns

`Promise`\<`void`\>

***

### invalidateLearning()

> **invalidateLearning**(`learningId`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:1143](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1143)

Invalidate a learning

#### Parameters

##### learningId

`string`

#### Returns

`Promise`\<`void`\>

***

### setPersonality()

> **setPersonality**(`personality`): `Promise`\<`void`\>

Defined in: [objects/agent/index.ts:1158](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1158)

Set agent personality

#### Parameters

##### personality

[`AgentPersonality`](../interfaces/AgentPersonality.md)

#### Returns

`Promise`\<`void`\>

***

### getPersonality()

> **getPersonality**(): [`AgentPersonality`](../interfaces/AgentPersonality.md) \| `undefined`

Defined in: [objects/agent/index.ts:1166](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1166)

Get agent personality

#### Returns

[`AgentPersonality`](../interfaces/AgentPersonality.md) \| `undefined`

***

### think()

> **think**(`_query`, `_context?`): `Promise`\<`string`\>

Defined in: [objects/agent/index.ts:1179](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1179)

Think about a query using context and learnings

Override this method to implement your AI reasoning logic.

#### Parameters

##### \_query

`string`

##### \_context?

[`Memory`](../interfaces/Memory.md)[]

#### Returns

`Promise`\<`string`\>

***

### plan()

> **plan**(`_goal`): `Promise`\<[`Workflow`](../interfaces/Workflow.md)\>

Defined in: [objects/agent/index.ts:1188](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1188)

Plan steps to achieve a goal

Override this method to implement planning logic.

#### Parameters

##### \_goal

[`Goal`](../interfaces/Goal.md)

#### Returns

`Promise`\<[`Workflow`](../interfaces/Workflow.md)\>

***

### reflect()

> **reflect**(): `Promise`\<[`Learning`](../interfaces/Learning.md)[]\>

Defined in: [objects/agent/index.ts:1195](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1195)

Reflect on past actions and generate learnings

#### Returns

`Promise`\<[`Learning`](../interfaces/Learning.md)[]\>

***

### getState()

> **getState**(): [`AgentDOState`](../interfaces/AgentDOState.md)

Defined in: [objects/agent/index.ts:1221](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1221)

Get agent state

#### Returns

[`AgentDOState`](../interfaces/AgentDOState.md)

***

### getStats()

> **getStats**(): `Promise`\<\{ `memories`: `number`; `conversations`: `number`; `activeGoals`: `number`; `completedGoals`: `number`; `learnings`: `number`; `actionsExecuted`: `number`; `uptime`: `number`; \}\>

Defined in: [objects/agent/index.ts:1228](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1228)

Get agent statistics summary

#### Returns

`Promise`\<\{ `memories`: `number`; `conversations`: `number`; `activeGoals`: `number`; `completedGoals`: `number`; `learnings`: `number`; `actionsExecuted`: `number`; `uptime`: `number`; \}\>

***

### updateActivity()

> `protected` **updateActivity**(): `void`

Defined in: [objects/agent/index.ts:1268](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/agent/index.ts#L1268)

Update last activity timestamp

#### Returns

`void`
