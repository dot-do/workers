[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/auth/src](../README.md) / PermissionDeniedError

# Class: PermissionDeniedError

Defined in: [packages/auth/src/index.ts:57](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L57)

Error thrown when permission check fails

## Extends

- `Error`

## Constructors

### Constructor

> **new PermissionDeniedError**(`message`, `missingPermissions`, `context`): `PermissionDeniedError`

Defined in: [packages/auth/src/index.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L61)

#### Parameters

##### message

`string`

##### missingPermissions

`string`[]

##### context

[`AuthContext`](../interfaces/AuthContext.md)

#### Returns

`PermissionDeniedError`

#### Overrides

`Error.constructor`

## Properties

### missingPermissions

> `readonly` **missingPermissions**: `string`[]

Defined in: [packages/auth/src/index.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L58)

***

### context

> `readonly` **context**: [`AuthContext`](../interfaces/AuthContext.md)

Defined in: [packages/auth/src/index.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/auth/src/index.ts#L59)
