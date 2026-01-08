[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/auth/src](../README.md) / hasPermission

# Function: hasPermission()

> **hasPermission**(`context`, `permission`): `boolean`

Defined in: [packages/auth/src/index.ts:283](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L283)

Check if context has a specific permission (direct permissions only, no role resolution)
For role-resolved permissions, use rbac.hasPermission()

## Parameters

### context

[`AuthContext`](../interfaces/AuthContext.md)

### permission

`string`

## Returns

`boolean`
