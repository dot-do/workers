[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/auth/src](../README.md) / requireRole

# Function: requireRole()

> **requireRole**(`roles`): (`context`) => `Promise`\<`void`\>

Defined in: [packages/auth/src/index.ts:319](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L319)

Create a guard function that requires any of the specified roles

## Parameters

### roles

`string`[]

## Returns

A function that throws PermissionDeniedError if no required role is present

> (`context`): `Promise`\<`void`\>

### Parameters

#### context

[`AuthContext`](../interfaces/AuthContext.md)

### Returns

`Promise`\<`void`\>
