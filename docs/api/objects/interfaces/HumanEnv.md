[**@dotdo/workers API Documentation v0.0.1**](../../README.md)

***

[@dotdo/workers API Documentation](../../modules.md) / [objects](../README.md) / HumanEnv

# Interface: HumanEnv

Defined in: [objects/human/types.ts:260](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L260)

Human.do environment bindings

## Properties

### HUMAN\_DO?

> `optional` **HUMAN\_DO**: `DurableObjectNamespace`\<`undefined`\>

Defined in: [objects/human/types.ts:262](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L262)

Reference to self for Workers RPC

***

### AI?

> `optional` **AI**: `unknown`

Defined in: [objects/human/types.ts:264](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L264)

AI binding for assistance

***

### NOTIFY?

> `optional` **NOTIFY**: `object`

Defined in: [objects/human/types.ts:266](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L266)

Notification service

#### send()

> **send**: (`message`) => `Promise`\<`void`\>

##### Parameters

###### message

[`NotificationMessage`](NotificationMessage.md)

##### Returns

`Promise`\<`void`\>

***

### LLM?

> `optional` **LLM**: `unknown`

Defined in: [objects/human/types.ts:270](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L270)

LLM binding for AI feedback

***

### WEBHOOKS?

> `optional` **WEBHOOKS**: `object`

Defined in: [objects/human/types.ts:272](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/human/types.ts#L272)

Webhook sender

#### send()

> **send**: (`url`, `payload`) => `Promise`\<`void`\>

##### Parameters

###### url

`string`

###### payload

`unknown`

##### Returns

`Promise`\<`void`\>
