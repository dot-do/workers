[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/startup](../README.md) / Startup

# Class: Startup

Defined in: [objects/startup/index.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L55)

Startup Durable Object

Manages the complete startup lifecycle with:
- Core startup identity and stage
- Founder and team management
- Funding rounds and investor relations
- Pitch decks and key documents
- Metrics tracking (MRR, ARR, users, growth)
- Milestones and roadmap
- Investor updates
- Integration with Business DO for operations

## Extends

- [`DO`](../../variables/DO.md)

## Constructors

### Constructor

> **new Startup**(): `Startup`

#### Returns

`Startup`

#### Inherited from

`DO.constructor`

## Properties

### db

> **db**: `DrizzleD1Database`\<`__module`\> & `object`

Defined in: [objects/startup/index.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L56)

***

### env

> **env**: [`StartupEnv`](../interfaces/StartupEnv.md)

Defined in: [objects/startup/index.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L57)

## Methods

### create()

> **create**(`data`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:66](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L66)

Create a new startup

#### Parameters

##### data

`Omit`\<`NewStartup`, `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

***

### get()

> **get**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

Defined in: [objects/startup/index.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L80)

Get startup by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

***

### getBySlug()

> **getBySlug**(`slug`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

Defined in: [objects/startup/index.ts:91](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L91)

Get startup by slug

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \} \| `undefined`\>

***

### update()

> **update**(`id`, `data`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:102](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L102)

Update startup details

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewStartup`\>

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

***

### updateStage()

> **updateStage**(`id`, `stage`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:116](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L116)

Update startup stage (idea -> pre-seed -> seed -> series-a, etc.)

#### Parameters

##### id

`string`

##### stage

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

***

### launch()

> **launch**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:123](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L123)

Mark startup as launched

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

***

### archive()

> **archive**(`id`, `reason?`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:137](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L137)

Archive a startup

#### Parameters

##### id

`string`

##### reason?

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \}\>

***

### list()

> **list**(`includeArchived`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:151](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L151)

List all startups

#### Parameters

##### includeArchived

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### addFounder()

> **addFounder**(`data`): `Promise`\<\{ `bio`: `string` \| `null`; `departedAt`: `Date` \| `null`; `email`: `string`; `equity`: `number` \| `null`; `id`: `string`; `isLead`: `boolean` \| `null`; `joinedAt`: `Date` \| `null`; `linkedin`: `string` \| `null`; `name`: `string`; `role`: `string` \| `null`; `startupId`: `string`; `title`: `string` \| `null`; `twitter`: `string` \| `null`; `userId`: `string` \| `null`; `vesting`: `unknown`; \}\>

Defined in: [objects/startup/index.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L168)

Add a founder or team member

#### Parameters

##### data

`Omit`\<`NewFounder`, `"id"` \| `"joinedAt"`\>

#### Returns

`Promise`\<\{ `bio`: `string` \| `null`; `departedAt`: `Date` \| `null`; `email`: `string`; `equity`: `number` \| `null`; `id`: `string`; `isLead`: `boolean` \| `null`; `joinedAt`: `Date` \| `null`; `linkedin`: `string` \| `null`; `name`: `string`; `role`: `string` \| `null`; `startupId`: `string`; `title`: `string` \| `null`; `twitter`: `string` \| `null`; `userId`: `string` \| `null`; `vesting`: `unknown`; \}\>

***

### getFounders()

> **getFounders**(`startupId`, `includeDeparted`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:182](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L182)

Get all founders and team members for a startup

#### Parameters

##### startupId

`string`

##### includeDeparted

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### updateFounder()

> **updateFounder**(`founderId`, `data`): `Promise`\<\{ `bio`: `string` \| `null`; `departedAt`: `Date` \| `null`; `email`: `string`; `equity`: `number` \| `null`; `id`: `string`; `isLead`: `boolean` \| `null`; `joinedAt`: `Date` \| `null`; `linkedin`: `string` \| `null`; `name`: `string`; `role`: `string` \| `null`; `startupId`: `string`; `title`: `string` \| `null`; `twitter`: `string` \| `null`; `userId`: `string` \| `null`; `vesting`: `unknown`; \}\>

Defined in: [objects/startup/index.ts:203](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L203)

Update founder details

#### Parameters

##### founderId

`string`

##### data

`Partial`\<`NewFounder`\>

#### Returns

`Promise`\<\{ `bio`: `string` \| `null`; `departedAt`: `Date` \| `null`; `email`: `string`; `equity`: `number` \| `null`; `id`: `string`; `isLead`: `boolean` \| `null`; `joinedAt`: `Date` \| `null`; `linkedin`: `string` \| `null`; `name`: `string`; `role`: `string` \| `null`; `startupId`: `string`; `title`: `string` \| `null`; `twitter`: `string` \| `null`; `userId`: `string` \| `null`; `vesting`: `unknown`; \}\>

***

### founderDeparture()

> **founderDeparture**(`founderId`): `Promise`\<\{ `bio`: `string` \| `null`; `departedAt`: `Date` \| `null`; `email`: `string`; `equity`: `number` \| `null`; `id`: `string`; `isLead`: `boolean` \| `null`; `joinedAt`: `Date` \| `null`; `linkedin`: `string` \| `null`; `name`: `string`; `role`: `string` \| `null`; `startupId`: `string`; `title`: `string` \| `null`; `twitter`: `string` \| `null`; `userId`: `string` \| `null`; `vesting`: `unknown`; \}\>

Defined in: [objects/startup/index.ts:217](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L217)

Record founder departure

#### Parameters

##### founderId

`string`

#### Returns

`Promise`\<\{ `bio`: `string` \| `null`; `departedAt`: `Date` \| `null`; `email`: `string`; `equity`: `number` \| `null`; `id`: `string`; `isLead`: `boolean` \| `null`; `joinedAt`: `Date` \| `null`; `linkedin`: `string` \| `null`; `name`: `string`; `role`: `string` \| `null`; `startupId`: `string`; `title`: `string` \| `null`; `twitter`: `string` \| `null`; `userId`: `string` \| `null`; `vesting`: `unknown`; \}\>

***

### createRound()

> **createRound**(`data`): `Promise`\<\{ `announcedAt`: `Date` \| `null`; `closedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `dilution`: `number` \| `null`; `id`: `string`; `leadInvestor`: `string` \| `null`; `raisedAmount`: `number` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetAmount`: `number` \| `null`; `termSheet`: `unknown`; `type`: `string`; `valuation`: `number` \| `null`; \}\>

Defined in: [objects/startup/index.ts:235](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L235)

Create a new funding round

#### Parameters

##### data

`Omit`\<`NewFundingRound`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `announcedAt`: `Date` \| `null`; `closedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `dilution`: `number` \| `null`; `id`: `string`; `leadInvestor`: `string` \| `null`; `raisedAmount`: `number` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetAmount`: `number` \| `null`; `termSheet`: `unknown`; `type`: `string`; `valuation`: `number` \| `null`; \}\>

***

### getRounds()

> **getRounds**(`startupId`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:249](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L249)

Get all funding rounds for a startup

#### Parameters

##### startupId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### updateRound()

> **updateRound**(`roundId`, `data`): `Promise`\<\{ `announcedAt`: `Date` \| `null`; `closedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `dilution`: `number` \| `null`; `id`: `string`; `leadInvestor`: `string` \| `null`; `raisedAmount`: `number` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetAmount`: `number` \| `null`; `termSheet`: `unknown`; `type`: `string`; `valuation`: `number` \| `null`; \}\>

Defined in: [objects/startup/index.ts:260](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L260)

Update funding round

#### Parameters

##### roundId

`string`

##### data

`Partial`\<`NewFundingRound`\>

#### Returns

`Promise`\<\{ `announcedAt`: `Date` \| `null`; `closedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `dilution`: `number` \| `null`; `id`: `string`; `leadInvestor`: `string` \| `null`; `raisedAmount`: `number` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetAmount`: `number` \| `null`; `termSheet`: `unknown`; `type`: `string`; `valuation`: `number` \| `null`; \}\>

***

### closeRound()

> **closeRound**(`roundId`, `raisedAmount`, `valuation?`): `Promise`\<\{ `announcedAt`: `Date` \| `null`; `closedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `dilution`: `number` \| `null`; `id`: `string`; `leadInvestor`: `string` \| `null`; `raisedAmount`: `number` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetAmount`: `number` \| `null`; `termSheet`: `unknown`; `type`: `string`; `valuation`: `number` \| `null`; \}\>

Defined in: [objects/startup/index.ts:274](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L274)

Close a funding round

#### Parameters

##### roundId

`string`

##### raisedAmount

`number`

##### valuation?

`number`

#### Returns

`Promise`\<\{ `announcedAt`: `Date` \| `null`; `closedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `dilution`: `number` \| `null`; `id`: `string`; `leadInvestor`: `string` \| `null`; `raisedAmount`: `number` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetAmount`: `number` \| `null`; `termSheet`: `unknown`; `type`: `string`; `valuation`: `number` \| `null`; \}\>

***

### getTotalFunding()

> **getTotalFunding**(`startupId`): `Promise`\<\{ `total`: `number`; `rounds`: `number`; \}\>

Defined in: [objects/startup/index.ts:293](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L293)

Get total funding raised

#### Parameters

##### startupId

`string`

#### Returns

`Promise`\<\{ `total`: `number`; `rounds`: `number`; \}\>

***

### addInvestor()

> **addInvestor**(`data`): `Promise`\<\{ `boardSeat`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string` \| `null`; `firm`: `string` \| `null`; `id`: `string`; `investedAmount`: `number` \| `null`; `lastContactAt`: `Date` \| `null`; `name`: `string`; `notes`: `string` \| `null`; `ownership`: `number` \| `null`; `phone`: `string` \| `null`; `proRataRights`: `boolean` \| `null`; `relationship`: `string` \| `null`; `roundId`: `string` \| `null`; `startupId`: `string`; `type`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:315](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L315)

Add an investor

#### Parameters

##### data

`Omit`\<`NewInvestor`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `boardSeat`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string` \| `null`; `firm`: `string` \| `null`; `id`: `string`; `investedAmount`: `number` \| `null`; `lastContactAt`: `Date` \| `null`; `name`: `string`; `notes`: `string` \| `null`; `ownership`: `number` \| `null`; `phone`: `string` \| `null`; `proRataRights`: `boolean` \| `null`; `relationship`: `string` \| `null`; `roundId`: `string` \| `null`; `startupId`: `string`; `type`: `string` \| `null`; \}\>

***

### getInvestors()

> **getInvestors**(`startupId`, `relationship?`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:329](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L329)

Get all investors for a startup

#### Parameters

##### startupId

`string`

##### relationship?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### updateInvestor()

> **updateInvestor**(`investorId`, `data`): `Promise`\<\{ `boardSeat`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string` \| `null`; `firm`: `string` \| `null`; `id`: `string`; `investedAmount`: `number` \| `null`; `lastContactAt`: `Date` \| `null`; `name`: `string`; `notes`: `string` \| `null`; `ownership`: `number` \| `null`; `phone`: `string` \| `null`; `proRataRights`: `boolean` \| `null`; `relationship`: `string` \| `null`; `roundId`: `string` \| `null`; `startupId`: `string`; `type`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:350](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L350)

Update investor details

#### Parameters

##### investorId

`string`

##### data

`Partial`\<`NewInvestor`\>

#### Returns

`Promise`\<\{ `boardSeat`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string` \| `null`; `firm`: `string` \| `null`; `id`: `string`; `investedAmount`: `number` \| `null`; `lastContactAt`: `Date` \| `null`; `name`: `string`; `notes`: `string` \| `null`; `ownership`: `number` \| `null`; `phone`: `string` \| `null`; `proRataRights`: `boolean` \| `null`; `relationship`: `string` \| `null`; `roundId`: `string` \| `null`; `startupId`: `string`; `type`: `string` \| `null`; \}\>

***

### recordContact()

> **recordContact**(`investorId`, `notes?`): `Promise`\<\{ `boardSeat`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string` \| `null`; `firm`: `string` \| `null`; `id`: `string`; `investedAmount`: `number` \| `null`; `lastContactAt`: `Date` \| `null`; `name`: `string`; `notes`: `string` \| `null`; `ownership`: `number` \| `null`; `phone`: `string` \| `null`; `proRataRights`: `boolean` \| `null`; `relationship`: `string` \| `null`; `roundId`: `string` \| `null`; `startupId`: `string`; `type`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:364](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L364)

Record investor contact

#### Parameters

##### investorId

`string`

##### notes?

`string`

#### Returns

`Promise`\<\{ `boardSeat`: `boolean` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string` \| `null`; `firm`: `string` \| `null`; `id`: `string`; `investedAmount`: `number` \| `null`; `lastContactAt`: `Date` \| `null`; `name`: `string`; `notes`: `string` \| `null`; `ownership`: `number` \| `null`; `phone`: `string` \| `null`; `proRataRights`: `boolean` \| `null`; `relationship`: `string` \| `null`; `roundId`: `string` \| `null`; `startupId`: `string`; `type`: `string` \| `null`; \}\>

***

### addDocument()

> **addDocument**(`data`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \}\>

Defined in: [objects/startup/index.ts:382](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L382)

Add a document (pitch deck, one-pager, etc.)

#### Parameters

##### data

`Omit`\<`NewDocument`, `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \}\>

***

### getDocuments()

> **getDocuments**(`startupId`, `type?`, `latestOnly?`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:409](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L409)

Get documents for a startup

#### Parameters

##### startupId

`string`

##### type?

`string`

##### latestOnly?

`boolean` = `true`

#### Returns

`Promise`\<`object`[]\>

***

### getPitchDeck()

> **getPitchDeck**(`startupId`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \} \| `undefined`\>

Defined in: [objects/startup/index.ts:428](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L428)

Get the latest pitch deck

#### Parameters

##### startupId

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \} \| `undefined`\>

***

### recordDocumentView()

> **recordDocumentView**(`documentId`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \}\>

Defined in: [objects/startup/index.ts:445](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L445)

Record document view

#### Parameters

##### documentId

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \}\>

***

### recordMetrics()

> **recordMetrics**(`data`): `Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `dau`: `number` \| `null`; `gmv`: `number` \| `null`; `growth`: `number` \| `null`; `id`: `string`; `ltv`: `number` \| `null`; `ltvCacRatio`: `number` \| `null`; `mau`: `number` \| `null`; `mrr`: `number` \| `null`; `nrr`: `number` \| `null`; `paidCustomers`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; `startupId`: `string`; `users`: `number` \| `null`; \}\>

Defined in: [objects/startup/index.ts:468](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L468)

Record metrics for a period

#### Parameters

##### data

`Omit`\<`NewMetrics`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `dau`: `number` \| `null`; `gmv`: `number` \| `null`; `growth`: `number` \| `null`; `id`: `string`; `ltv`: `number` \| `null`; `ltvCacRatio`: `number` \| `null`; `mau`: `number` \| `null`; `mrr`: `number` \| `null`; `nrr`: `number` \| `null`; `paidCustomers`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; `startupId`: `string`; `users`: `number` \| `null`; \}\>

***

### getMetrics()

> **getMetrics**(`startupId`, `period`): `Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `dau`: `number` \| `null`; `gmv`: `number` \| `null`; `growth`: `number` \| `null`; `id`: `string`; `ltv`: `number` \| `null`; `ltvCacRatio`: `number` \| `null`; `mau`: `number` \| `null`; `mrr`: `number` \| `null`; `nrr`: `number` \| `null`; `paidCustomers`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; `startupId`: `string`; `users`: `number` \| `null`; \} \| `undefined`\>

Defined in: [objects/startup/index.ts:486](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L486)

Get metrics for a specific period

#### Parameters

##### startupId

`string`

##### period

`string`

#### Returns

`Promise`\<\{ `activeUsers`: `number` \| `null`; `arr`: `number` \| `null`; `burnRate`: `number` \| `null`; `cac`: `number` \| `null`; `churnRate`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customers`: `number` \| `null`; `customMetrics`: `unknown`; `dau`: `number` \| `null`; `gmv`: `number` \| `null`; `growth`: `number` \| `null`; `id`: `string`; `ltv`: `number` \| `null`; `ltvCacRatio`: `number` \| `null`; `mau`: `number` \| `null`; `mrr`: `number` \| `null`; `nrr`: `number` \| `null`; `paidCustomers`: `number` \| `null`; `period`: `string`; `revenue`: `number` \| `null`; `runway`: `number` \| `null`; `startupId`: `string`; `users`: `number` \| `null`; \} \| `undefined`\>

***

### getMetricsHistory()

> **getMetricsHistory**(`startupId`, `startPeriod?`, `endPeriod?`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:502](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L502)

Get metrics history

#### Parameters

##### startupId

`string`

##### startPeriod?

`string`

##### endPeriod?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### getCurrentMetrics()

> **getCurrentMetrics**(`startupId`): `Promise`\<\{ `mrr`: `number`; `arr`: `number`; `users`: `number`; `growth`: `number`; `runway`: `number`; \}\>

Defined in: [objects/startup/index.ts:525](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L525)

Get current MRR/ARR and key metrics

#### Parameters

##### startupId

`string`

#### Returns

`Promise`\<\{ `mrr`: `number`; `arr`: `number`; `users`: `number`; `growth`: `number`; `runway`: `number`; \}\>

***

### addMilestone()

> **addMilestone**(`data`): `Promise`\<\{ `completedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `evidence`: `string` \| `null`; `id`: `string`; `impact`: `string` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetDate`: `Date` \| `null`; `title`: `string`; `type`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:555](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L555)

Create a milestone

#### Parameters

##### data

`Omit`\<`NewMilestone`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `completedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `evidence`: `string` \| `null`; `id`: `string`; `impact`: `string` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetDate`: `Date` \| `null`; `title`: `string`; `type`: `string` \| `null`; \}\>

***

### getMilestones()

> **getMilestones**(`startupId`, `status?`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:569](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L569)

Get milestones for a startup

#### Parameters

##### startupId

`string`

##### status?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### completeMilestone()

> **completeMilestone**(`milestoneId`, `evidence?`): `Promise`\<\{ `completedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `evidence`: `string` \| `null`; `id`: `string`; `impact`: `string` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetDate`: `Date` \| `null`; `title`: `string`; `type`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:585](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L585)

Complete a milestone

#### Parameters

##### milestoneId

`string`

##### evidence?

`string`

#### Returns

`Promise`\<\{ `completedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `evidence`: `string` \| `null`; `id`: `string`; `impact`: `string` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetDate`: `Date` \| `null`; `title`: `string`; `type`: `string` \| `null`; \}\>

***

### updateMilestone()

> **updateMilestone**(`milestoneId`, `data`): `Promise`\<\{ `completedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `evidence`: `string` \| `null`; `id`: `string`; `impact`: `string` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetDate`: `Date` \| `null`; `title`: `string`; `type`: `string` \| `null`; \}\>

Defined in: [objects/startup/index.ts:599](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L599)

Update milestone

#### Parameters

##### milestoneId

`string`

##### data

`Partial`\<`NewMilestone`\>

#### Returns

`Promise`\<\{ `completedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `evidence`: `string` \| `null`; `id`: `string`; `impact`: `string` \| `null`; `startupId`: `string`; `status`: `string` \| `null`; `targetDate`: `Date` \| `null`; `title`: `string`; `type`: `string` \| `null`; \}\>

***

### createUpdate()

> **createUpdate**(`data`): `Promise`\<\{ `asks`: `unknown`; `content`: `string`; `createdAt`: `Date` \| `null`; `highlights`: `unknown`; `id`: `string`; `lowlights`: `unknown`; `metricsSnapshot`: `unknown`; `openRate`: `number` \| `null`; `period`: `string`; `recipientCount`: `number` \| `null`; `sentAt`: `Date` \| `null`; `startupId`: `string`; `subject`: `string`; \}\>

Defined in: [objects/startup/index.ts:617](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L617)

Create an investor update

#### Parameters

##### data

`Omit`\<`NewInvestorUpdate`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `asks`: `unknown`; `content`: `string`; `createdAt`: `Date` \| `null`; `highlights`: `unknown`; `id`: `string`; `lowlights`: `unknown`; `metricsSnapshot`: `unknown`; `openRate`: `number` \| `null`; `period`: `string`; `recipientCount`: `number` \| `null`; `sentAt`: `Date` \| `null`; `startupId`: `string`; `subject`: `string`; \}\>

***

### getUpdates()

> **getUpdates**(`startupId`, `limit`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:631](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L631)

Get investor updates

#### Parameters

##### startupId

`string`

##### limit

`number` = `12`

#### Returns

`Promise`\<`object`[]\>

***

### sendUpdate()

> **sendUpdate**(`updateId`, `recipientCount`): `Promise`\<\{ `asks`: `unknown`; `content`: `string`; `createdAt`: `Date` \| `null`; `highlights`: `unknown`; `id`: `string`; `lowlights`: `unknown`; `metricsSnapshot`: `unknown`; `openRate`: `number` \| `null`; `period`: `string`; `recipientCount`: `number` \| `null`; `sentAt`: `Date` \| `null`; `startupId`: `string`; `subject`: `string`; \}\>

Defined in: [objects/startup/index.ts:643](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L643)

Send investor update (mark as sent)

#### Parameters

##### updateId

`string`

##### recipientCount

`number`

#### Returns

`Promise`\<\{ `asks`: `unknown`; `content`: `string`; `createdAt`: `Date` \| `null`; `highlights`: `unknown`; `id`: `string`; `lowlights`: `unknown`; `metricsSnapshot`: `unknown`; `openRate`: `number` \| `null`; `period`: `string`; `recipientCount`: `number` \| `null`; `sentAt`: `Date` \| `null`; `startupId`: `string`; `subject`: `string`; \}\>

***

### generateUpdateDraft()

> **generateUpdateDraft**(`startupId`, `period`): `Promise`\<`string` \| `null`\>

Defined in: [objects/startup/index.ts:657](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L657)

Generate investor update draft using AI

#### Parameters

##### startupId

`string`

##### period

`string`

#### Returns

`Promise`\<`string` \| `null`\>

***

### log()

> **log**(`action`, `resource`, `resourceId?`, `metadata?`, `actor?`): `Promise`\<`void`\>

Defined in: [objects/startup/index.ts:695](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L695)

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

`"user"` \| `"system"` \| `"ai"` \| `"investor"`

#### Returns

`Promise`\<`void`\>

***

### getActivityLog()

> **getActivityLog**(`startupId`, `limit`, `offset`): `Promise`\<`object`[]\>

Defined in: [objects/startup/index.ts:718](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L718)

Get activity log

#### Parameters

##### startupId

`string`

##### limit

`number` = `50`

##### offset

`number` = `0`

#### Returns

`Promise`\<`object`[]\>

***

### getDashboard()

> **getDashboard**(`startupId`): `Promise`\<\{ `startup`: \{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \} \| `undefined`; `team`: \{ `founders`: `object`[]; `count`: `number`; \}; `funding`: \{ `total`: `number`; `rounds`: `number`; `investors`: `number`; \}; `metrics`: \{ `mrr`: `number`; `arr`: `number`; `users`: `number`; `growth`: `number`; `runway`: `number`; \}; `milestones`: \{ `upcoming`: `object`[]; `completed`: `number`; `total`: `number`; \}; `pitchDeck`: \{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \} \| `undefined`; `recentActivity`: `object`[]; \}\>

Defined in: [objects/startup/index.ts:739](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L739)

Get a full startup dashboard snapshot

#### Parameters

##### startupId

`string`

#### Returns

`Promise`\<\{ `startup`: \{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `foundedAt`: `Date` \| `null`; `id`: `string`; `industry`: `string` \| `null`; `launchedAt`: `Date` \| `null`; `logoUrl`: `string` \| `null`; `name`: `string`; `slug`: `string`; `stage`: `string` \| `null`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `updatedAt`: `Date` \| `null`; `vertical`: `string` \| `null`; `website`: `string` \| `null`; \} \| `undefined`; `team`: \{ `founders`: `object`[]; `count`: `number`; \}; `funding`: \{ `total`: `number`; `rounds`: `number`; `investors`: `number`; \}; `metrics`: \{ `mrr`: `number`; `arr`: `number`; `users`: `number`; `growth`: `number`; `runway`: `number`; \}; `milestones`: \{ `upcoming`: `object`[]; `completed`: `number`; `total`: `number`; \}; `pitchDeck`: \{ `createdAt`: `Date` \| `null`; `id`: `string`; `isLatest`: `boolean` \| `null`; `mimeType`: `string` \| `null`; `name`: `string`; `r2Key`: `string` \| `null`; `sharedWith`: `unknown`; `size`: `number` \| `null`; `startupId`: `string`; `type`: `string`; `updatedAt`: `Date` \| `null`; `url`: `string` \| `null`; `version`: `string` \| `null`; `viewCount`: `number` \| `null`; \} \| `undefined`; `recentActivity`: `object`[]; \}\>

***

### getBusinessOps()

> **getBusinessOps**(`startupId`): `Promise`\<`DurableObjectStub`\<`undefined`\>\>

Defined in: [objects/startup/index.ts:791](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/startup/index.ts#L791)

Link to Business DO for detailed operations

#### Parameters

##### startupId

`string`

#### Returns

`Promise`\<`DurableObjectStub`\<`undefined`\>\>
