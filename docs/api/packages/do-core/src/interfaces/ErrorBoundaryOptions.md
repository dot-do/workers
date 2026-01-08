[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ErrorBoundaryOptions

# Interface: ErrorBoundaryOptions

Defined in: [packages/do-core/src/error-boundary.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L43)

Error boundary configuration options

## Properties

### name

> **name**: `string`

Defined in: [packages/do-core/src/error-boundary.ts:45](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L45)

Human-readable name for the boundary (debugging/metrics)

***

### fallback()

> **fallback**: (`error`, `context?`) => `Response` \| `Promise`\<`Response`\>

Defined in: [packages/do-core/src/error-boundary.ts:47](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L47)

Fallback function to execute when an error occurs

#### Parameters

##### error

`Error`

##### context?

[`ErrorContext`](ErrorContext.md)

#### Returns

`Response` \| `Promise`\<`Response`\>

***

### onError()?

> `optional` **onError**: (`error`, `context?`) => `void` \| `Promise`\<`void`\>

Defined in: [packages/do-core/src/error-boundary.ts:49](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L49)

Optional error handler for logging/metrics

#### Parameters

##### error

`Error`

##### context?

[`ErrorContext`](ErrorContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

***

### rethrow?

> `optional` **rethrow**: `boolean`

Defined in: [packages/do-core/src/error-boundary.ts:51](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L51)

Whether to rethrow the error after handling

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:53](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L53)

Maximum retries before falling back

***

### retryDelay?

> `optional` **retryDelay**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:55](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L55)

Retry delay in ms
