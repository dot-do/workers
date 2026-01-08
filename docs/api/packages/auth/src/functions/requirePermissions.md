[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/auth/src](../README.md) / requirePermissions

# Function: requirePermissions()

> **requirePermissions**(`rbac`, `permissions`): (`context`) => `Promise`\<`void`\>

Defined in: [packages/auth/src/index.ts:298](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L298)

Create a guard function that requires specific permissions

## Parameters

### rbac

[`RBAC`](../interfaces/RBAC.md)

### permissions

`string`[]

## Returns

A function that throws PermissionDeniedError if permissions are missing

> (`context`): `Promise`\<`void`\>

### Parameters

#### context

[`AuthContext`](../interfaces/AuthContext.md)

### Returns

`Promise`\<`void`\>
