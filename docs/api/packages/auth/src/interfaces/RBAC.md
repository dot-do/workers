[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/auth/src](../README.md) / RBAC

# Interface: RBAC

Defined in: [packages/auth/src/index.ts:42](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L42)

RBAC instance interface

## Methods

### getRoles()

> **getRoles**(): [`Role`](Role.md)[]

Defined in: [packages/auth/src/index.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L43)

#### Returns

[`Role`](Role.md)[]

***

### getDefaultRole()

> **getDefaultRole**(): `string` \| `undefined`

Defined in: [packages/auth/src/index.ts:44](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L44)

#### Returns

`string` \| `undefined`

***

### getRole()

> **getRole**(`roleId`): [`Role`](Role.md) \| `undefined`

Defined in: [packages/auth/src/index.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L45)

#### Parameters

##### roleId

`string`

#### Returns

[`Role`](Role.md) \| `undefined`

***

### getEffectivePermissions()

> **getEffectivePermissions**(`roleId`): `string`[]

Defined in: [packages/auth/src/index.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L46)

#### Parameters

##### roleId

`string`

#### Returns

`string`[]

***

### hasPermission()

> **hasPermission**(`context`, `permission`): `boolean`

Defined in: [packages/auth/src/index.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L47)

#### Parameters

##### context

[`AuthContext`](AuthContext.md)

##### permission

`string`

#### Returns

`boolean`

***

### checkPermission()

> **checkPermission**(`context`, `permission`): `boolean`

Defined in: [packages/auth/src/index.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L48)

#### Parameters

##### context

[`AuthContext`](AuthContext.md)

##### permission

`string`

#### Returns

`boolean`

***

### checkPermissions()

> **checkPermissions**(`context`, `permissions`): `boolean`

Defined in: [packages/auth/src/index.ts:49](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L49)

#### Parameters

##### context

[`AuthContext`](AuthContext.md)

##### permissions

`string`[]

#### Returns

`boolean`

***

### checkAnyPermission()

> **checkAnyPermission**(`context`, `permissions`): `boolean`

Defined in: [packages/auth/src/index.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L50)

#### Parameters

##### context

[`AuthContext`](AuthContext.md)

##### permissions

`string`[]

#### Returns

`boolean`

***

### checkResourcePermission()

> **checkResourcePermission**(`context`, `resource`, `permission`): `boolean`

Defined in: [packages/auth/src/index.ts:51](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L51)

#### Parameters

##### context

[`AuthContext`](AuthContext.md)

##### resource

`string`

##### permission

`string`

#### Returns

`boolean`
