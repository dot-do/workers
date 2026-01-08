[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / SqlInjectionError

# Class: SqlInjectionError

Defined in: [packages/security/src/index.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L45)

Error thrown when SQL injection is detected

## Extends

- `Error`

## Constructors

### Constructor

> **new SqlInjectionError**(`message`, `result`): `SqlInjectionError`

Defined in: [packages/security/src/index.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L48)

#### Parameters

##### message

`string`

##### result

[`SqlInjectionResult`](../interfaces/SqlInjectionResult.md)

#### Returns

`SqlInjectionError`

#### Overrides

`Error.constructor`

## Properties

### result

> `readonly` **result**: [`SqlInjectionResult`](../interfaces/SqlInjectionResult.md)

Defined in: [packages/security/src/index.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L46)
