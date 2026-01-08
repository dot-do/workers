[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/app](../README.md) / App

# Class: App

Defined in: [objects/app/index.ts:51](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L51)

App Durable Object

Manages a complete app with:
- User profiles and authentication state
- User preferences and settings
- Active sessions tracking
- App configuration
- Feature flags with targeting
- Analytics events and metrics
- Multi-tenant support
- Activity logging for audit trails

## Extends

- [`DO`](../../variables/DO.md)

## Constructors

### Constructor

> **new App**(): `App`

#### Returns

`App`

#### Inherited from

`DO.constructor`

## Properties

### db

> **db**: `DrizzleD1Database`\<`__module`\> & `object`

Defined in: [objects/app/index.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L52)

***

### env

> **env**: [`AppEnv`](../interfaces/AppEnv.md)

Defined in: [objects/app/index.ts:53](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L53)

## Methods

### init()

> **init**(`appId`): `Promise`\<`void`\>

Defined in: [objects/app/index.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L59)

Initialize the App DO with an app ID

#### Parameters

##### appId

`string`

#### Returns

`Promise`\<`void`\>

***

### createUser()

> **createUser**(`data`): `Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/app/index.ts:70](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L70)

Create a new user

#### Parameters

##### data

`Omit`\<`NewUser`, `"id"` \| `"appId"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### getUser()

> **getUser**(`id`): `Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/app/index.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L84)

Get user by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getUserByEmail()

> **getUserByEmail**(`email`): `Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/app/index.ts:95](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L95)

Get user by email

#### Parameters

##### email

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getUserByExternalId()

> **getUserByExternalId**(`externalId`): `Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/app/index.ts:106](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L106)

Get user by external ID (from auth provider)

#### Parameters

##### externalId

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### updateUser()

> **updateUser**(`id`, `data`): `Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/app/index.ts:117](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L117)

Update user

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewUser`\>

#### Returns

`Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### recordLogin()

> **recordLogin**(`userId`): `Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/app/index.ts:131](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L131)

Update user's last login timestamp

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### deleteUser()

> **deleteUser**(`id`): `Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/app/index.ts:145](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L145)

Soft delete a user

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `email`: `string`; `emailVerified`: `boolean` \| `null`; `externalId`: `string` \| `null`; `id`: `string`; `lastLoginAt`: `Date` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `role`: `string` \| `null`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### listUsers()

> **listUsers**(`options?`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:159](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L159)

List users with optional filters

#### Parameters

##### options?

###### role?

`string`

###### status?

`string`

###### includeDeleted?

`boolean`

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### setPreference()

> **setPreference**(`userId`, `key`, `value`, `category`): `Promise`\<\{ `category`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `key`: `string`; `updatedAt`: `Date` \| `null`; `userId`: `string`; `value`: `unknown`; \}\>

Defined in: [objects/app/index.ts:201](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L201)

Set a user preference

#### Parameters

##### userId

`string`

##### key

`string`

##### value

`unknown`

##### category

`string` = `'general'`

#### Returns

`Promise`\<\{ `category`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `key`: `string`; `updatedAt`: `Date` \| `null`; `userId`: `string`; `value`: `unknown`; \}\>

***

### getPreference()

> **getPreference**\<`T`\>(`userId`, `key`): `Promise`\<`T` \| `undefined`\>

Defined in: [objects/app/index.ts:224](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L224)

Get a user preference

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### userId

`string`

##### key

`string`

#### Returns

`Promise`\<`T` \| `undefined`\>

***

### getPreferences()

> **getPreferences**(`userId`, `category?`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:235](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L235)

Get all preferences for a user

#### Parameters

##### userId

`string`

##### category?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### deletePreference()

> **deletePreference**(`userId`, `key`): `Promise`\<`void`\>

Defined in: [objects/app/index.ts:246](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L246)

Delete a preference

#### Parameters

##### userId

`string`

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### createSession()

> **createSession**(`data`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/app/index.ts:260](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L260)

Create a new session

#### Parameters

##### data

`Omit`\<`NewSession`, `"id"` \| `"createdAt"` \| `"lastActiveAt"`\>

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \}\>

***

### getSessionByToken()

> **getSessionByToken**(`token`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \} \| `undefined`\>

Defined in: [objects/app/index.ts:276](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L276)

Get session by token

#### Parameters

##### token

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \} \| `undefined`\>

***

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:287](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L287)

Get active sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### touchSession()

> **touchSession**(`sessionId`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/app/index.ts:304](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L304)

Update session activity

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \}\>

***

### revokeSession()

> **revokeSession**(`sessionId`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/app/index.ts:316](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L316)

Revoke a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `deviceType`: `string` \| `null`; `expiresAt`: `Date`; `id`: `string`; `ipAddress`: `string` \| `null`; `lastActiveAt`: `Date` \| `null`; `location`: `string` \| `null`; `revokedAt`: `Date` \| `null`; `token`: `string`; `userAgent`: `string` \| `null`; `userId`: `string`; \}\>

***

### revokeAllUserSessions()

> **revokeAllUserSessions**(`userId`): `Promise`\<`number`\>

Defined in: [objects/app/index.ts:330](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L330)

Revoke all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`number`\>

***

### cleanupExpiredSessions()

> **cleanupExpiredSessions**(): `Promise`\<`number`\>

Defined in: [objects/app/index.ts:343](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L343)

Clean up expired sessions

#### Returns

`Promise`\<`number`\>

***

### setConfig()

> **setConfig**(`key`, `value`, `options?`): `Promise`\<\{ `appId`: `string`; `category`: `string` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isSecret`: `boolean` \| `null`; `key`: `string`; `updatedAt`: `Date` \| `null`; `value`: `unknown`; \}\>

Defined in: [objects/app/index.ts:357](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L357)

Set an app config value

#### Parameters

##### key

`string`

##### value

`unknown`

##### options?

###### category?

`string`

###### description?

`string`

###### isSecret?

`boolean`

#### Returns

`Promise`\<\{ `appId`: `string`; `category`: `string` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isSecret`: `boolean` \| `null`; `key`: `string`; `updatedAt`: `Date` \| `null`; `value`: `unknown`; \}\>

***

### getConfig()

> **getConfig**\<`T`\>(`key`): `Promise`\<`T` \| `undefined`\>

Defined in: [objects/app/index.ts:393](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L393)

Get an app config value

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`T` \| `undefined`\>

***

### getAllConfig()

> **getAllConfig**(`category?`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:404](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L404)

Get all app config

#### Parameters

##### category?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### deleteConfig()

> **deleteConfig**(`key`): `Promise`\<`void`\>

Defined in: [objects/app/index.ts:415](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L415)

Delete a config value

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### setFeatureFlag()

> **setFeatureFlag**(`key`, `data`): `Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `enabled`: `boolean` \| `null`; `id`: `string`; `key`: `string`; `name`: `string`; `rolloutPercentage`: `number` \| `null`; `rules`: `unknown`; `targetRoles`: `unknown`; `targetTenants`: `unknown`; `targetUserIds`: `unknown`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/app/index.ts:429](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L429)

Create or update a feature flag

#### Parameters

##### key

`string`

##### data

`Omit`\<`NewFeatureFlag`, `"id"` \| `"appId"` \| `"key"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `enabled`: `boolean` \| `null`; `id`: `string`; `key`: `string`; `name`: `string`; `rolloutPercentage`: `number` \| `null`; `rules`: `unknown`; `targetRoles`: `unknown`; `targetTenants`: `unknown`; `targetUserIds`: `unknown`; `updatedAt`: `Date` \| `null`; \}\>

***

### getFeatureFlag()

> **getFeatureFlag**(`key`): `Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `enabled`: `boolean` \| `null`; `id`: `string`; `key`: `string`; `name`: `string`; `rolloutPercentage`: `number` \| `null`; `rules`: `unknown`; `targetRoles`: `unknown`; `targetTenants`: `unknown`; `targetUserIds`: `unknown`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/app/index.ts:450](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L450)

Get a feature flag

#### Parameters

##### key

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `enabled`: `boolean` \| `null`; `id`: `string`; `key`: `string`; `name`: `string`; `rolloutPercentage`: `number` \| `null`; `rules`: `unknown`; `targetRoles`: `unknown`; `targetTenants`: `unknown`; `targetUserIds`: `unknown`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### isFeatureEnabled()

> **isFeatureEnabled**(`key`, `userId?`, `tenantId?`): `Promise`\<`boolean`\>

Defined in: [objects/app/index.ts:461](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L461)

Check if a feature is enabled for a user

#### Parameters

##### key

`string`

##### userId?

`string`

##### tenantId?

`string`

#### Returns

`Promise`\<`boolean`\>

***

### listFeatureFlags()

> **listFeatureFlags**(): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:501](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L501)

List all feature flags

#### Returns

`Promise`\<`object`[]\>

***

### deleteFeatureFlag()

> **deleteFeatureFlag**(`key`): `Promise`\<`void`\>

Defined in: [objects/app/index.ts:512](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L512)

Delete a feature flag

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### trackEvent()

> **trackEvent**(`event`, `data?`): `Promise`\<\{ `appId`: `string`; `category`: `string` \| `null`; `event`: `string`; `id`: `string`; `ipAddress`: `string` \| `null`; `page`: `string` \| `null`; `properties`: `unknown`; `referrer`: `string` \| `null`; `sessionId`: `string` \| `null`; `timestamp`: `Date` \| `null`; `userAgent`: `string` \| `null`; `userId`: `string` \| `null`; \}\>

Defined in: [objects/app/index.ts:526](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L526)

Track an analytics event

#### Parameters

##### event

`string`

##### data?

###### userId?

`string`

###### sessionId?

`string`

###### category?

`string`

###### properties?

`Record`\<`string`, `unknown`\>

###### page?

`string`

###### referrer?

`string`

###### ipAddress?

`string`

###### userAgent?

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `category`: `string` \| `null`; `event`: `string`; `id`: `string`; `ipAddress`: `string` \| `null`; `page`: `string` \| `null`; `properties`: `unknown`; `referrer`: `string` \| `null`; `sessionId`: `string` \| `null`; `timestamp`: `Date` \| `null`; `userAgent`: `string` \| `null`; `userId`: `string` \| `null`; \}\>

***

### getEvents()

> **getEvents**(`options?`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:563](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L563)

Get analytics events with filters

#### Parameters

##### options?

###### event?

`string`

###### userId?

`string`

###### category?

`string`

###### since?

`Date`

###### until?

`Date`

###### limit?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### recordMetrics()

> **recordMetrics**(`period`, `data`): `Promise`\<\{ `activeUsers`: `number` \| `null`; `appId`: `string`; `avgSessionDuration`: `number` \| `null`; `bounceRate`: `number` \| `null`; `conversionRate`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customMetrics`: `unknown`; `granularity`: `string` \| `null`; `id`: `string`; `newUsers`: `number` \| `null`; `pageViews`: `number` \| `null`; `period`: `string`; `sessions`: `number` \| `null`; \}\>

Defined in: [objects/app/index.ts:605](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L605)

Record aggregated metrics for a period

#### Parameters

##### period

`string`

##### data

`Omit`\<*typeof* `schema.analyticsMetrics.$inferInsert`, `"id"` \| `"appId"` \| `"period"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `activeUsers`: `number` \| `null`; `appId`: `string`; `avgSessionDuration`: `number` \| `null`; `bounceRate`: `number` \| `null`; `conversionRate`: `number` \| `null`; `createdAt`: `Date` \| `null`; `customMetrics`: `unknown`; `granularity`: `string` \| `null`; `id`: `string`; `newUsers`: `number` \| `null`; `pageViews`: `number` \| `null`; `period`: `string`; `sessions`: `number` \| `null`; \}\>

***

### getMetrics()

> **getMetrics**(`startPeriod`, `endPeriod?`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:625](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L625)

Get metrics for a period range

#### Parameters

##### startPeriod

`string`

##### endPeriod?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### getAnalyticsSummary()

> **getAnalyticsSummary**(): `Promise`\<\{ `totalUsers`: `number`; `activeUsers`: `number`; `totalSessions`: `number`; `activeSessions`: `number`; \}\>

Defined in: [objects/app/index.ts:644](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L644)

Get current analytics snapshot

#### Returns

`Promise`\<\{ `totalUsers`: `number`; `activeUsers`: `number`; `totalSessions`: `number`; `activeSessions`: `number`; \}\>

***

### createTenant()

> **createTenant**(`data`): `Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/app/index.ts:693](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L693)

Create a tenant

#### Parameters

##### data

`Omit`\<`NewTenant`, `"id"` \| `"appId"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### getTenant()

> **getTenant**(`id`): `Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/app/index.ts:707](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L707)

Get tenant by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getTenantBySlug()

> **getTenantBySlug**(`slug`): `Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/app/index.ts:718](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L718)

Get tenant by slug

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### updateTenant()

> **updateTenant**(`id`, `data`): `Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/app/index.ts:729](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L729)

Update tenant

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewTenant`\>

#### Returns

`Promise`\<\{ `appId`: `string`; `createdAt`: `Date` \| `null`; `deletedAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `metadata`: `unknown`; `name`: `string`; `plan`: `string` \| `null`; `settings`: `unknown`; `slug`: `string`; `status`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### listTenants()

> **listTenants**(`includeDeleted`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:743](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L743)

List tenants

#### Parameters

##### includeDeleted

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### addUserToTenant()

> **addUserToTenant**(`tenantId`, `userId`, `role`): `Promise`\<\{ `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `tenantId`: `string`; `userId`: `string`; \}\>

Defined in: [objects/app/index.ts:758](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L758)

Add user to tenant

#### Parameters

##### tenantId

`string`

##### userId

`string`

##### role

`string` = `'member'`

#### Returns

`Promise`\<\{ `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `tenantId`: `string`; `userId`: `string`; \}\>

***

### getTenantMembers()

> **getTenantMembers**(`tenantId`, `includeRemoved`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:776](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L776)

Get tenant members

#### Parameters

##### tenantId

`string`

##### includeRemoved

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### getUserTenants()

> **getUserTenants**(`userId`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:790](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L790)

Get user's tenants

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### removeUserFromTenant()

> **removeUserFromTenant**(`tenantId`, `userId`): `Promise`\<\{ `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `tenantId`: `string`; `userId`: `string`; \}\>

Defined in: [objects/app/index.ts:808](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L808)

Remove user from tenant

#### Parameters

##### tenantId

`string`

##### userId

`string`

#### Returns

`Promise`\<\{ `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `removedAt`: `Date` \| `null`; `role`: `string` \| `null`; `tenantId`: `string`; `userId`: `string`; \}\>

***

### log()

> **log**(`action`, `resource`, `resourceId?`, `metadata?`, `actor?`): `Promise`\<`void`\>

Defined in: [objects/app/index.ts:831](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L831)

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

###### userId?

`string`

###### tenantId?

`string`

###### type?

`"user"` \| `"system"` \| `"ai"` \| `"api"`

#### Returns

`Promise`\<`void`\>

***

### getActivityLog()

> **getActivityLog**(`options?`): `Promise`\<`object`[]\>

Defined in: [objects/app/index.ts:855](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L855)

Get activity log

#### Parameters

##### options?

###### tenantId?

`string`

###### userId?

`string`

###### resource?

`string`

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### getDashboard()

> **getDashboard**(): `Promise`\<\{ `analytics`: \{ `totalUsers`: `number`; `activeUsers`: `number`; `totalSessions`: `number`; `activeSessions`: `number`; \}; `featureFlags`: \{ `total`: `number`; `enabled`: `number`; `flags`: `object`[]; \}; `config`: `object`[]; `recentActivity`: `object`[]; \}\>

Defined in: [objects/app/index.ts:897](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/app/index.ts#L897)

Get a full app dashboard snapshot

#### Returns

`Promise`\<\{ `analytics`: \{ `totalUsers`: `number`; `activeUsers`: `number`; `totalSessions`: `number`; `activeSessions`: `number`; \}; `featureFlags`: \{ `total`: `number`; `enabled`: `number`; `flags`: `object`[]; \}; `config`: `object`[]; `recentActivity`: `object`[]; \}\>
