[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/circuit-breaker/src](../README.md) / CircuitBreakerError

# Class: CircuitBreakerError

Defined in: [packages/circuit-breaker/src/index.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L59)

Custom error thrown when circuit breaker is open

## Extends

- `Error`

## Constructors

### Constructor

> **new CircuitBreakerError**(`message`): `CircuitBreakerError`

Defined in: [packages/circuit-breaker/src/index.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L60)

#### Parameters

##### message

`string` = `'Circuit breaker is OPEN'`

#### Returns

`CircuitBreakerError`

#### Overrides

`Error.constructor`
