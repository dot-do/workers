[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/org](../README.md) / Org

# Class: Org

Defined in: [objects/org/index.ts:93](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L93)

Organization Durable Object

Each instance represents one organization. The DO ID is derived from the org ID.

## Extends

- [`DO`](../../variables/DO.md)\<[`OrgEnv`](../interfaces/OrgEnv.md)\>

## Constructors

### Constructor

> **new Org**(): `Org`

#### Returns

`Org`

#### Inherited from

`DO<OrgEnv>.constructor`

## Accessors

### db

#### Get Signature

> **get** **db**(): `DrizzleD1Database`\<`__module`\>

Defined in: [objects/org/index.ts:101](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L101)

Get the Drizzle database instance

##### Returns

`DrizzleD1Database`\<`__module`\>

***

### orgId

#### Get Signature

> **get** **orgId**(): `string`

Defined in: [objects/org/index.ts:111](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L111)

Get the organization ID for this DO instance

##### Returns

`string`

## Methods

### setActor()

> **setActor**(`actor`): `void`

Defined in: [objects/org/index.ts:121](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L121)

Set the current actor for audit logging

#### Parameters

##### actor

###### id

`string`

###### email?

`string`

###### ip?

`string`

###### type?

`"user"` \| `"system"` \| `"api_key"`

#### Returns

`void`

***

### createOrg()

> **createOrg**(`input`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `settings`: [`OrganizationSettings`](../../interfaces/OrganizationSettings.md) \| `null`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/org/index.ts:132](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L132)

Initialize a new organization

#### Parameters

##### input

[`CreateOrgInput`](../interfaces/CreateOrgInput.md)

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `settings`: [`OrganizationSettings`](../../interfaces/OrganizationSettings.md) \| `null`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \}\>

***

### getOrg()

> **getOrg**(): `Promise`\<\{ `createdAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `settings`: [`OrganizationSettings`](../../interfaces/OrganizationSettings.md) \| `null`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:168](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L168)

Get organization details

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `settings`: [`OrganizationSettings`](../../interfaces/OrganizationSettings.md) \| `null`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### updateOrg()

> **updateOrg**(`input`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `settings`: [`OrganizationSettings`](../../interfaces/OrganizationSettings.md) \| `null`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:176](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L176)

Update organization settings

#### Parameters

##### input

[`UpdateSettingsInput`](../interfaces/UpdateSettingsInput.md)

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `domain`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `settings`: [`OrganizationSettings`](../../interfaces/OrganizationSettings.md) \| `null`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### deleteOrg()

> **deleteOrg**(): `Promise`\<`void`\>

Defined in: [objects/org/index.ts:208](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L208)

Delete the organization and all associated data

#### Returns

`Promise`\<`void`\>

***

### inviteMember()

> **inviteMember**(`input`): `Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \}\>

Defined in: [objects/org/index.ts:220](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L220)

Invite a new member to the organization

#### Parameters

##### input

[`InviteMemberInput`](../interfaces/InviteMemberInput.md)

#### Returns

`Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \}\>

***

### acceptInvite()

> **acceptInvite**(`memberId`, `userId`): `Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

Defined in: [objects/org/index.ts:262](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L262)

Accept an invitation and link to a user ID

#### Parameters

##### memberId

`string`

##### userId

`string`

#### Returns

`Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

***

### getMember()

> **getMember**(`memberId`): `Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

Defined in: [objects/org/index.ts:284](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L284)

Get a member by ID

#### Parameters

##### memberId

`string`

#### Returns

`Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

***

### getMemberByUserId()

> **getMemberByUserId**(`userId`): `Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

Defined in: [objects/org/index.ts:296](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L296)

Get a member by user ID

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

***

### listMembers()

> **listMembers**(`options?`): `Promise`\<`object`[]\>

Defined in: [objects/org/index.ts:308](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L308)

List all members in the organization

#### Parameters

##### options?

###### status?

`"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"`

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### updateMember()

> **updateMember**(`memberId`, `updates`): `Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

Defined in: [objects/org/index.ts:322](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L322)

Update a member's role or status

#### Parameters

##### memberId

`string`

##### updates

###### roleId?

`string`

###### status?

`"active"` \| `"suspended"` \| `"deactivated"`

#### Returns

`Promise`\<\{ `avatarUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `email`: `string`; `id`: `string`; `invitedAt`: `Date` \| `null`; `joinedAt`: `Date` \| `null`; `name`: `string` \| `null`; `organizationId`: `string`; `roleId`: `string` \| `null`; `status`: `"active"` \| `"invited"` \| `"suspended"` \| `"deactivated"` \| `null`; `updatedAt`: `Date` \| `null`; `userId`: `string`; \} \| `null`\>

***

### removeMember()

> **removeMember**(`memberId`): `Promise`\<`void`\>

Defined in: [objects/org/index.ts:346](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L346)

Remove a member from the organization

#### Parameters

##### memberId

`string`

#### Returns

`Promise`\<`void`\>

***

### createRole()

> **createRole**(`input`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/org/index.ts:376](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L376)

Create a new role

#### Parameters

##### input

[`CreateRoleInput`](../interfaces/CreateRoleInput.md)

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### getRole()

> **getRole**(`roleId`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:398](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L398)

Get a role by ID

#### Parameters

##### roleId

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### getDefaultRole()

> **getDefaultRole**(): `Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:410](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L410)

Get the default role for new members

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### listRoles()

> **listRoles**(): `Promise`\<`object`[]\>

Defined in: [objects/org/index.ts:428](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L428)

List all roles in the organization

#### Returns

`Promise`\<`object`[]\>

***

### updateRole()

> **updateRole**(`roleId`, `updates`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:436](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L436)

Update a role

#### Parameters

##### roleId

`string`

##### updates

###### name?

`string`

###### description?

`string`

###### permissions?

`string`[]

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `id`: `string`; `isBuiltIn`: `boolean` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### deleteRole()

> **deleteRole**(`roleId`): `Promise`\<`void`\>

Defined in: [objects/org/index.ts:465](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L465)

Delete a role

#### Parameters

##### roleId

`string`

#### Returns

`Promise`\<`void`\>

***

### hasPermission()

> **hasPermission**(`memberId`, `permission`): `Promise`\<`boolean`\>

Defined in: [objects/org/index.ts:485](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L485)

Check if a member has a specific permission

#### Parameters

##### memberId

`string`

##### permission

`string`

#### Returns

`Promise`\<`boolean`\>

***

### configureSso()

> **configureSso**(`input`): `Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/org/index.ts:507](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L507)

Configure an SSO connection

#### Parameters

##### input

[`SSOConnectionInput`](../interfaces/SSOConnectionInput.md)

#### Returns

`Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \}\>

***

### activateSso()

> **activateSso**(`connectionId`): `Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:530](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L530)

Activate an SSO connection

#### Parameters

##### connectionId

`string`

#### Returns

`Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### getSsoConnection()

> **getSsoConnection**(`connectionId`): `Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:546](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L546)

Get an SSO connection

#### Parameters

##### connectionId

`string`

#### Returns

`Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### getSsoByDomain()

> **getSsoByDomain**(`domain`): `Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:558](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L558)

Get active SSO connection for a domain

#### Parameters

##### domain

`string`

#### Returns

`Promise`\<\{ `config`: [`SSOConfig`](../../interfaces/SSOConfig.md) \| `null`; `createdAt`: `Date` \| `null`; `domains`: `string`[] \| `null`; `id`: `string`; `organizationId`: `string`; `provider`: `string` \| `null`; `status`: `"active"` \| `"pending"` \| `"inactive"` \| `null`; `type`: `"saml"` \| `"oidc"` \| `"oauth"`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### listSsoConnections()

> **listSsoConnections**(): `Promise`\<`object`[]\>

Defined in: [objects/org/index.ts:571](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L571)

List all SSO connections

#### Returns

`Promise`\<`object`[]\>

***

### deleteSsoConnection()

> **deleteSsoConnection**(`connectionId`): `Promise`\<`void`\>

Defined in: [objects/org/index.ts:579](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L579)

Delete an SSO connection

#### Parameters

##### connectionId

`string`

#### Returns

`Promise`\<`void`\>

***

### getSubscription()

> **getSubscription**(): `Promise`\<\{ `cancelAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `organizationId`: `string`; `plan`: `"free"` \| `"starter"` \| `"pro"` \| `"enterprise"` \| `null`; `seats`: `number` \| `null`; `seatsUsed`: `number` \| `null`; `status`: `"active"` \| `"trialing"` \| `"past_due"` \| `"canceled"` \| `"unpaid"` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:596](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L596)

Get the organization's subscription

#### Returns

`Promise`\<\{ `cancelAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `organizationId`: `string`; `plan`: `"free"` \| `"starter"` \| `"pro"` \| `"enterprise"` \| `null`; `seats`: `number` \| `null`; `seatsUsed`: `number` \| `null`; `status`: `"active"` \| `"trialing"` \| `"past_due"` \| `"canceled"` \| `"unpaid"` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### updateSubscription()

> **updateSubscription**(`updates`): `Promise`\<\{ `cancelAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `organizationId`: `string`; `plan`: `"free"` \| `"starter"` \| `"pro"` \| `"enterprise"` \| `null`; `seats`: `number` \| `null`; `seatsUsed`: `number` \| `null`; `status`: `"active"` \| `"trialing"` \| `"past_due"` \| `"canceled"` \| `"unpaid"` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:605](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L605)

Update subscription (typically called from Stripe webhook)

#### Parameters

##### updates

###### stripeCustomerId?

`string`

###### stripeSubscriptionId?

`string`

###### plan?

`"free"` \| `"starter"` \| `"pro"` \| `"enterprise"`

###### status?

`"active"` \| `"trialing"` \| `"past_due"` \| `"canceled"` \| `"unpaid"`

###### seats?

`number`

###### currentPeriodStart?

`Date`

###### currentPeriodEnd?

`Date`

###### trialEnd?

`Date`

###### cancelAt?

`Date`

#### Returns

`Promise`\<\{ `cancelAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `currentPeriodEnd`: `Date` \| `null`; `currentPeriodStart`: `Date` \| `null`; `id`: `string`; `organizationId`: `string`; `plan`: `"free"` \| `"starter"` \| `"pro"` \| `"enterprise"` \| `null`; `seats`: `number` \| `null`; `seatsUsed`: `number` \| `null`; `status`: `"active"` \| `"trialing"` \| `"past_due"` \| `"canceled"` \| `"unpaid"` \| `null`; `stripeCustomerId`: `string` \| `null`; `stripeSubscriptionId`: `string` \| `null`; `trialEnd`: `Date` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `null`\>

***

### canAddSeat()

> **canAddSeat**(): `Promise`\<`boolean`\>

Defined in: [objects/org/index.ts:636](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L636)

Check if the organization can add more seats

#### Returns

`Promise`\<`boolean`\>

***

### getPlanUsage()

> **getPlanUsage**(): `Promise`\<\{ `plan`: `string`; `seats`: \{ `used`: `number`; `limit`: `number`; \}; `status`: `string`; `periodEnd?`: `Date`; \}\>

Defined in: [objects/org/index.ts:645](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L645)

Get plan limits and usage

#### Returns

`Promise`\<\{ `plan`: `string`; `seats`: \{ `used`: `number`; `limit`: `number`; \}; `status`: `string`; `periodEnd?`: `Date`; \}\>

***

### log()

> **log**(`input`): `Promise`\<`void`\>

Defined in: [objects/org/index.ts:671](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L671)

Log an audit event

#### Parameters

##### input

[`AuditLogInput`](../interfaces/AuditLogInput.md)

#### Returns

`Promise`\<`void`\>

***

### getAuditLogs()

> **getAuditLogs**(`options?`): `Promise`\<`object`[]\>

Defined in: [objects/org/index.ts:692](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L692)

Get audit logs with optional filters

#### Parameters

##### options?

###### action?

`string`

###### resource?

`string`

###### actorId?

`string`

###### limit?

`number`

###### offset?

`number`

###### since?

`Date`

###### until?

`Date`

#### Returns

`Promise`\<`object`[]\>

***

### createApiKey()

> **createApiKey**(`input`): `Promise`\<\{ `key`: `string`; `apiKey`: \{ `createdAt`: `Date` \| `null`; `createdBy`: `string` \| `null`; `expiresAt`: `Date` \| `null`; `id`: `string`; `keyHash`: `string`; `keyPrefix`: `string`; `lastUsedAt`: `Date` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `revokedAt`: `Date` \| `null`; \}; \}\>

Defined in: [objects/org/index.ts:720](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L720)

Create an API key

#### Parameters

##### input

###### name

`string`

###### permissions?

`string`[]

###### expiresAt?

`Date`

#### Returns

`Promise`\<\{ `key`: `string`; `apiKey`: \{ `createdAt`: `Date` \| `null`; `createdBy`: `string` \| `null`; `expiresAt`: `Date` \| `null`; `id`: `string`; `keyHash`: `string`; `keyPrefix`: `string`; `lastUsedAt`: `Date` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `revokedAt`: `Date` \| `null`; \}; \}\>

***

### validateApiKey()

> **validateApiKey**(`rawKey`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `createdBy`: `string` \| `null`; `expiresAt`: `Date` \| `null`; `id`: `string`; `keyHash`: `string`; `keyPrefix`: `string`; `lastUsedAt`: `Date` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `revokedAt`: `Date` \| `null`; \} \| `null`\>

Defined in: [objects/org/index.ts:752](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L752)

Validate an API key and return its details

#### Parameters

##### rawKey

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `createdBy`: `string` \| `null`; `expiresAt`: `Date` \| `null`; `id`: `string`; `keyHash`: `string`; `keyPrefix`: `string`; `lastUsedAt`: `Date` \| `null`; `name`: `string`; `organizationId`: `string`; `permissions`: `string`[] \| `null`; `revokedAt`: `Date` \| `null`; \} \| `null`\>

***

### listApiKeys()

> **listApiKeys**(): `Promise`\<`object`[]\>

Defined in: [objects/org/index.ts:781](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L781)

List API keys (without secrets)

#### Returns

`Promise`\<`object`[]\>

***

### revokeApiKey()

> **revokeApiKey**(`keyId`): `Promise`\<`void`\>

Defined in: [objects/org/index.ts:792](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/index.ts#L792)

Revoke an API key

#### Parameters

##### keyId

`string`

#### Returns

`Promise`\<`void`\>
