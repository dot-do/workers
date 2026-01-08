[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / PrototypePollutionError

# Class: PrototypePollutionError

Defined in: [packages/security/src/prototype-pollution.ts:17](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L17)

Error thrown when prototype pollution is detected

## Extends

- `Error`

## Constructors

### Constructor

> **new PrototypePollutionError**(`message`, `result`): `PrototypePollutionError`

Defined in: [packages/security/src/prototype-pollution.ts:20](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L20)

#### Parameters

##### message

`string`

##### result

[`PrototypePollutionResult`](../interfaces/PrototypePollutionResult.md)

#### Returns

`PrototypePollutionError`

#### Overrides

`Error.constructor`

## Properties

### result

> `readonly` **result**: [`PrototypePollutionResult`](../interfaces/PrototypePollutionResult.md)

Defined in: [packages/security/src/prototype-pollution.ts:18](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L18)
