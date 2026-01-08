[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ErrorBoundary

# Class: ErrorBoundary

Defined in: [packages/do-core/src/error-boundary.ts:105](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L105)

ErrorBoundary class for error isolation and graceful degradation.

Provides:
- Error catching and fallback execution
- Retry mechanism for transient failures
- Metrics tracking
- Error state management

## Implements

- [`IErrorBoundary`](../interfaces/IErrorBoundary.md)

## Constructors

### Constructor

> **new ErrorBoundary**(`options`): `ErrorBoundary`

Defined in: [packages/do-core/src/error-boundary.ts:112](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L112)

#### Parameters

##### options

[`ErrorBoundaryOptions`](../interfaces/ErrorBoundaryOptions.md)

#### Returns

`ErrorBoundary`

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/do-core/src/error-boundary.ts:106](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L106)

The boundary name

#### Implementation of

[`IErrorBoundary`](../interfaces/IErrorBoundary.md).[`name`](../interfaces/IErrorBoundary.md#name)

## Methods

### wrap()

> **wrap**\<`T`\>(`fn`, `partialContext?`): `Promise`\<`T`\>

Defined in: [packages/do-core/src/error-boundary.ts:131](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L131)

Wrap an async operation with error handling.

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

() => `Promise`\<`T`\>

The async function to execute

##### partialContext?

`Partial`\<[`ErrorContext`](../interfaces/ErrorContext.md)\>

#### Returns

`Promise`\<`T`\>

The result of fn, or the fallback response on error

#### Implementation of

[`IErrorBoundary`](../interfaces/IErrorBoundary.md).[`wrap`](../interfaces/IErrorBoundary.md#wrap)

***

### getMetrics()

> **getMetrics**(): [`ErrorBoundaryMetrics`](../interfaces/ErrorBoundaryMetrics.md)

Defined in: [packages/do-core/src/error-boundary.ts:194](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L194)

Get metrics for this boundary.

#### Returns

[`ErrorBoundaryMetrics`](../interfaces/ErrorBoundaryMetrics.md)

#### Implementation of

[`IErrorBoundary`](../interfaces/IErrorBoundary.md).[`getMetrics`](../interfaces/IErrorBoundary.md#getmetrics)

***

### resetMetrics()

> **resetMetrics**(): `void`

Defined in: [packages/do-core/src/error-boundary.ts:206](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L206)

Reset all metrics.

#### Returns

`void`

#### Implementation of

[`IErrorBoundary`](../interfaces/IErrorBoundary.md).[`resetMetrics`](../interfaces/IErrorBoundary.md#resetmetrics)

***

### isInErrorState()

> **isInErrorState**(): `boolean`

Defined in: [packages/do-core/src/error-boundary.ts:220](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L220)

Check if boundary is in error state.

#### Returns

`boolean`

#### Implementation of

[`IErrorBoundary`](../interfaces/IErrorBoundary.md).[`isInErrorState`](../interfaces/IErrorBoundary.md#isinerrorstate)

***

### clearErrorState()

> **clearErrorState**(): `void`

Defined in: [packages/do-core/src/error-boundary.ts:227](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L227)

Clear error state.

#### Returns

`void`

#### Implementation of

[`IErrorBoundary`](../interfaces/IErrorBoundary.md).[`clearErrorState`](../interfaces/IErrorBoundary.md#clearerrorstate)
