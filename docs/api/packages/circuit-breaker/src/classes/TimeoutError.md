[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/circuit-breaker/src](../README.md) / TimeoutError

# Class: TimeoutError

Defined in: [packages/circuit-breaker/src/index.ts:69](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L69)

Timeout error for operations that take too long

## Extends

- `Error`

## Constructors

### Constructor

> **new TimeoutError**(`message`): `TimeoutError`

Defined in: [packages/circuit-breaker/src/index.ts:70](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L70)

#### Parameters

##### message

`string` = `'Operation timed out'`

#### Returns

`TimeoutError`

#### Overrides

`Error.constructor`
