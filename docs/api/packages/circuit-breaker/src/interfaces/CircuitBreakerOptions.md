[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/circuit-breaker/src](../README.md) / CircuitBreakerOptions

# Interface: CircuitBreakerOptions

Defined in: [packages/circuit-breaker/src/index.ts:13](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L13)

Circuit Breaker Options

## Properties

### failureThreshold?

> `optional` **failureThreshold**: `number`

Defined in: [packages/circuit-breaker/src/index.ts:15](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L15)

Number of failures before opening the circuit (default: 5)

***

### successThreshold?

> `optional` **successThreshold**: `number`

Defined in: [packages/circuit-breaker/src/index.ts:17](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L17)

Number of successes needed to close the circuit from half-open (default: 2)

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [packages/circuit-breaker/src/index.ts:19](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L19)

Timeout for operations in milliseconds (default: 10000)

***

### resetTimeout?

> `optional` **resetTimeout**: `number`

Defined in: [packages/circuit-breaker/src/index.ts:21](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L21)

Time to wait before attempting recovery in milliseconds (default: 60000)

***

### onStateChange()?

> `optional` **onStateChange**: (`newState`, `oldState`) => `void`

Defined in: [packages/circuit-breaker/src/index.ts:23](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L23)

Callback when state changes

#### Parameters

##### newState

[`CircuitBreakerState`](../enumerations/CircuitBreakerState.md)

##### oldState

[`CircuitBreakerState`](../enumerations/CircuitBreakerState.md)

#### Returns

`void`

***

### onSuccess()?

> `optional` **onSuccess**: (`result`) => `void`

Defined in: [packages/circuit-breaker/src/index.ts:25](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L25)

Callback on successful operation

#### Parameters

##### result

`unknown`

#### Returns

`void`

***

### onFailure()?

> `optional` **onFailure**: (`error`) => `void`

Defined in: [packages/circuit-breaker/src/index.ts:27](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L27)

Callback on failed operation

#### Parameters

##### error

`Error`

#### Returns

`void`

***

### isFailure()?

> `optional` **isFailure**: (`error`) => `boolean`

Defined in: [packages/circuit-breaker/src/index.ts:29](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L29)

Custom function to determine if an error should count as a failure

#### Parameters

##### error

`Error`

#### Returns

`boolean`

***

### fallback()?

> `optional` **fallback**: () => `Promise`\<`unknown`\>

Defined in: [packages/circuit-breaker/src/index.ts:31](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/circuit-breaker/src/index.ts#L31)

Fallback function to call when circuit is open

#### Returns

`Promise`\<`unknown`\>
