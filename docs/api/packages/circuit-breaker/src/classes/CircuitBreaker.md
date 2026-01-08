[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/circuit-breaker/src](../README.md) / CircuitBreaker

# Class: CircuitBreaker

Defined in: [packages/circuit-breaker/src/index.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L84)

Circuit Breaker implementation for resilient service calls

States:
- CLOSED: Normal operation, requests pass through
- OPEN: Circuit is tripped, requests are rejected immediately
- HALF_OPEN: Testing if service has recovered

## Constructors

### Constructor

> **new CircuitBreaker**(`options?`): `CircuitBreaker`

Defined in: [packages/circuit-breaker/src/index.ts:100](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L100)

#### Parameters

##### options?

[`CircuitBreakerOptions`](../interfaces/CircuitBreakerOptions.md)

#### Returns

`CircuitBreaker`

## Methods

### getState()

> **getState**(): [`CircuitBreakerState`](../enumerations/CircuitBreakerState.md)

Defined in: [packages/circuit-breaker/src/index.ts:118](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L118)

Get the current circuit breaker state, automatically transitioning
from OPEN to HALF_OPEN if reset timeout has elapsed

#### Returns

[`CircuitBreakerState`](../enumerations/CircuitBreakerState.md)

***

### getOptions()

> **getOptions**(): `Required`\<`Pick`\<[`CircuitBreakerOptions`](../interfaces/CircuitBreakerOptions.md), `"failureThreshold"` \| `"successThreshold"` \| `"timeout"` \| `"resetTimeout"`\>\>

Defined in: [packages/circuit-breaker/src/index.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L128)

Get the configured options

#### Returns

`Required`\<`Pick`\<[`CircuitBreakerOptions`](../interfaces/CircuitBreakerOptions.md), `"failureThreshold"` \| `"successThreshold"` \| `"timeout"` \| `"resetTimeout"`\>\>

***

### getFailureCount()

> **getFailureCount**(): `number`

Defined in: [packages/circuit-breaker/src/index.ts:135](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L135)

Get the current failure count

#### Returns

`number`

***

### getSuccessCount()

> **getSuccessCount**(): `number`

Defined in: [packages/circuit-breaker/src/index.ts:142](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L142)

Get the current success count (for HALF_OPEN state)

#### Returns

`number`

***

### getMetrics()

> **getMetrics**(): [`CircuitBreakerMetrics`](../interfaces/CircuitBreakerMetrics.md)

Defined in: [packages/circuit-breaker/src/index.ts:149](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L149)

Get complete metrics

#### Returns

[`CircuitBreakerMetrics`](../interfaces/CircuitBreakerMetrics.md)

***

### execute()

> **execute**\<`T`\>(`operation`): `Promise`\<`T`\>

Defined in: [packages/circuit-breaker/src/index.ts:163](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L163)

Execute an operation through the circuit breaker

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### reset()

> **reset**(): `void`

Defined in: [packages/circuit-breaker/src/index.ts:191](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L191)

Manually reset the circuit breaker to CLOSED state

#### Returns

`void`

***

### trip()

> **trip**(): `void`

Defined in: [packages/circuit-breaker/src/index.ts:201](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L201)

Manually trip the circuit breaker to OPEN state

#### Returns

`void`
