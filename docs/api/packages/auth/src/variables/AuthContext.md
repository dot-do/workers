[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/auth/src](../README.md) / AuthContext

# Variable: AuthContext

> **AuthContext**: `object`

Defined in: [packages/auth/src/index.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L31)

AuthContext factory and utilities

## Type Declaration

### anonymous()

> **anonymous**(): [`AuthContext`](../interfaces/AuthContext.md)

Create an anonymous (unauthenticated) context

#### Returns

[`AuthContext`](../interfaces/AuthContext.md)

### system()

> **system**(): [`AuthContext`](../interfaces/AuthContext.md)

Create a system context with full permissions

#### Returns

[`AuthContext`](../interfaces/AuthContext.md)

### merge()

> **merge**(`base`, `additional`): [`AuthContext`](../interfaces/AuthContext.md)

Merge two contexts, combining roles and permissions

#### Parameters

##### base

[`AuthContext`](../interfaces/AuthContext.md)

##### additional

`Partial`\<[`AuthContext`](../interfaces/AuthContext.md)\>

#### Returns

[`AuthContext`](../interfaces/AuthContext.md)
