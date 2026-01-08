[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/business](../README.md) / Business

# Class: Business

Defined in: [objects/business/index.ts:42](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L42)

Business Durable Object

Manages a single business entity with:
- Business profile and settings
- Team member management
- Revenue and metrics tracking
- Subscription and billing status
- Activity logging for audit trails

## Extends

- [`DO`](../../variables/DO.md)

## Constructors

### Constructor

> **new Business**(): `Business`

#### Returns

`Business`

#### Inherited from

`DO.constructor`

## Properties

### db

> **db**: `DrizzleD1Database`\<`__module`\> & `object`

Defined in: [objects/business/index.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L43)

***

### env

> **env**: [`BusinessEnv`](../interfaces/BusinessEnv.md)

Defined in: [objects/business/index.ts:44](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L44)

## Methods

### create()

> **create**(`data`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/business/index.ts:53](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L53)

Create a new business entity

#### Parameters

##### data

`Omit`\<`NewBusiness`, `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

***

### get()

> **get**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

Defined in: [objects/business/index.ts:67](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L67)

Get business by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

***

### getBySlug()

> **getBySlug**(`slug`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

Defined in: [objects/business/index.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L78)

Get business by slug

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

***

### update()

> **update**(`id`, `data`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/business/index.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L89)

Update business details

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewBusiness`\>

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

***

### archive()

> **archive**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/business/index.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L103)

Archive a business (soft delete)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

***

### restore()

> **restore**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/business/index.ts:117](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L117)

Restore an archived business

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \}\>

***

### list()

> **list**(`includeArchived`): `Promise`\<`object`[]\>

Defined in: [objects/business/index.ts:131](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L131)

List all active businesses

#### Parameters

##### includeArchived

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### addTeamMember()

> **addTeamMember**(`data`): `Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/business/index.ts:148](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L148)

Add a team member

#### Parameters

##### data

`Omit`\<`NewTeamMember`, `"id"` \| `"invitedAt"`\>

#### Returns

`Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

***

### getTeam()

> **getTeam**(`businessId`, `includeRemoved`): `Promise`\<`object`[]\>

Defined in: [objects/business/index.ts:162](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L162)

Get team members for a business

#### Parameters

##### businessId

`string`

##### includeRemoved

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### updateTeamMember()

> **updateTeamMember**(`memberId`, `data`): `Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/business/index.ts:183](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L183)

Update team member role or details

#### Parameters

##### memberId

`string`

##### data

`Partial`\<`NewTeamMember`\>

#### Returns

`Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

***

### removeTeamMember()

> **removeTeamMember**(`memberId`): `Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/business/index.ts:197](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L197)

Remove a team member (soft delete)

#### Parameters

##### memberId

`string`

#### Returns

`Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

***

### acceptInvite()

> **acceptInvite**(`memberId`): `Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/business/index.ts:211](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L211)

Accept an invitation and join the team

#### Parameters

##### memberId

`string`

#### Returns

`Promise`\<\{ `businessId`: `string`; `department`: `string` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `title`: `string` \| `null`; `userId`: `string`; \}\>

***

### recordMetrics()

> **recordMetrics**(`data`): `Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `businessId`: `string`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `costs`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `id`: `string`; `ltv`: `number` \| `null`; `mrr`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; \}\>

Defined in: [objects/business/index.ts:229](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L229)

Record metrics for a period

#### Parameters

##### data

`Omit`\<`NewMetrics`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `businessId`: `string`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `costs`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `id`: `string`; `ltv`: `number` \| `null`; `mrr`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; \}\>

***

### getMetrics()

> **getMetrics**(`businessId`, `period`): `Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `businessId`: `string`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `costs`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `id`: `string`; `ltv`: `number` \| `null`; `mrr`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; \} \| `undefined`\>

Defined in: [objects/business/index.ts:247](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L247)

Get metrics for a specific period

#### Parameters

##### businessId

`string`

##### period

`string`

#### Returns

`Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `businessId`: `string`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `costs`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `id`: `string`; `ltv`: `number` \| `null`; `mrr`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; \} \| `undefined`\>

***

### getMetricsHistory()

> **getMetricsHistory**(`businessId`, `startPeriod?`, `endPeriod?`): `Promise`\<`object`[]\>

Defined in: [objects/business/index.ts:263](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L263)

Get metrics history for a business

#### Parameters

##### businessId

`string`

##### startPeriod?

`string`

##### endPeriod?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### getCurrentRevenue()

> **getCurrentRevenue**(`businessId`): `Promise`\<\{ `mrr`: `number`; `arr`: `number`; \}\>

Defined in: [objects/business/index.ts:293](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L293)

Get current MRR/ARR snapshot

#### Parameters

##### businessId

`string`

#### Returns

`Promise`\<\{ `mrr`: `number`; `arr`: `number`; \}\>

***

### setSubscription()

> **setSubscription**(`businessId`, `data`): `Promise`\<\{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \}\>

Defined in: [objects/business/index.ts:311](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L311)

Create or update subscription

#### Parameters

##### businessId

`string`

##### data

`Omit`\<*typeof* `schema.subscriptions.$inferInsert`, `"id"` \| `"businessId"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \}\>

***

### getSubscription()

> **getSubscription**(`businessId`): `Promise`\<\{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \} \| `undefined`\>

Defined in: [objects/business/index.ts:332](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L332)

Get current subscription for a business

#### Parameters

##### businessId

`string`

#### Returns

`Promise`\<\{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \} \| `undefined`\>

***

### hasActiveSubscription()

> **hasActiveSubscription**(`businessId`): `Promise`\<`boolean`\>

Defined in: [objects/business/index.ts:343](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L343)

Check if business has active subscription

#### Parameters

##### businessId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### cancelSubscription()

> **cancelSubscription**(`businessId`, `atPeriodEnd`): `Promise`\<\{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \}\>

Defined in: [objects/business/index.ts:352](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L352)

Cancel subscription

#### Parameters

##### businessId

`string`

##### atPeriodEnd

`boolean` = `true`

#### Returns

`Promise`\<\{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \}\>

***

### setSetting()

> **setSetting**(`businessId`, `key`, `value`, `category`, `isSecret`): `Promise`\<\{ `businessId`: `string`; `category`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isSecret`: `boolean` \| `null`; `key`: `string`; `updatedAt`: `Date` \| `null`; `value`: `unknown`; \}\>

Defined in: [objects/business/index.ts:374](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L374)

Set a configuration value

#### Parameters

##### businessId

`string`

##### key

`string`

##### value

`unknown`

##### category

`string` = `'general'`

##### isSecret

`boolean` = `false`

#### Returns

`Promise`\<\{ `businessId`: `string`; `category`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isSecret`: `boolean` \| `null`; `key`: `string`; `updatedAt`: `Date` \| `null`; `value`: `unknown`; \}\>

***

### getSetting()

> **getSetting**\<`T`\>(`businessId`, `key`): `Promise`\<`T` \| `undefined`\>

Defined in: [objects/business/index.ts:398](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L398)

Get a configuration value

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### businessId

`string`

##### key

`string`

#### Returns

`Promise`\<`T` \| `undefined`\>

***

### getSettings()

> **getSettings**(`businessId`, `category?`): `Promise`\<`object`[]\>

Defined in: [objects/business/index.ts:414](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L414)

Get all settings for a business

#### Parameters

##### businessId

`string`

##### category?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### deleteSetting()

> **deleteSetting**(`businessId`, `key`): `Promise`\<`void`\>

Defined in: [objects/business/index.ts:428](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L428)

Delete a setting

#### Parameters

##### businessId

`string`

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### log()

> **log**(`action`, `resource`, `resourceId?`, `metadata?`, `actor?`): `Promise`\<`void`\>

Defined in: [objects/business/index.ts:447](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L447)

Log an activity

#### Parameters

##### action

`string`

##### resource

`string`

##### resourceId?

`string`

##### metadata?

`Record`\<`string`, `unknown`\>

##### actor?

###### id

`string`

###### type

`"user"` \| `"system"` \| `"ai"`

#### Returns

`Promise`\<`void`\>

***

### getActivityLog()

> **getActivityLog**(`businessId`, `limit`, `offset`): `Promise`\<`object`[]\>

Defined in: [objects/business/index.ts:470](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L470)

Get activity log for a business

#### Parameters

##### businessId

`string`

##### limit

`number` = `50`

##### offset

`number` = `0`

#### Returns

`Promise`\<`object`[]\>

***

### getDashboard()

> **getDashboard**(`businessId`): `Promise`\<\{ `business`: \{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \} \| `undefined`; `team`: \{ `members`: `object`[]; `count`: `number`; \}; `metrics`: \{ `mrr`: `number`; `arr`: `number`; \}; `subscription`: \{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \} \| `undefined`; `recentActivity`: `object`[]; \}\>

Defined in: [objects/business/index.ts:491](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/business/index.ts#L491)

Get a full business dashboard snapshot

#### Parameters

##### businessId

`string`

#### Returns

`Promise`\<\{ `business`: \{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `website`: `string` \| `null`; \} \| `undefined`; `team`: \{ `members`: `object`[]; `count`: `number`; \}; `metrics`: \{ `mrr`: `number`; `arr`: `number`; \}; `subscription`: \{ `businessId`: `string`; `cancelAtPeriodEnd`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `plan`: `string` \| `null`; `seats`: `number` \| `null`; `status`: `string` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; `usedSeats`: `number` \| `null`; \} \| `undefined`; `recentActivity`: `object`[]; \}\>
