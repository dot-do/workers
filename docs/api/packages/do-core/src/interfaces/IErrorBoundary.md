[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IErrorBoundary

# Interface: IErrorBoundary

Defined in: [packages/do-core/src/error-boundary.ts:77](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L77)

Error boundary interface

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/do-core/src/error-boundary.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L79)

The boundary name

## Methods

### wrap()

> **wrap**\<`T`\>(`fn`, `context?`): `Promise`\<`T`\>

Defined in: [packages/do-core/src/error-boundary.ts:81](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L81)

Wrap an async operation with error handling

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

() => `Promise`\<`T`\>

##### context?

`Partial`\<[`ErrorContext`](ErrorContext.md)\>

#### Returns

`Promise`\<`T`\>

***

### getMetrics()

> **getMetrics**(): [`ErrorBoundaryMetrics`](ErrorBoundaryMetrics.md)

Defined in: [packages/do-core/src/error-boundary.ts:83](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L83)

Get metrics for this boundary

#### Returns

[`ErrorBoundaryMetrics`](ErrorBoundaryMetrics.md)

***

### resetMetrics()

> **resetMetrics**(): `void`

Defined in: [packages/do-core/src/error-boundary.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L85)

Reset metrics

#### Returns

`void`

***

### isInErrorState()

> **isInErrorState**(): `boolean`

Defined in: [packages/do-core/src/error-boundary.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L87)

Check if boundary is in error state

#### Returns

`boolean`

***

### clearErrorState()

> **clearErrorState**(): `void`

Defined in: [packages/do-core/src/error-boundary.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L89)

Clear error state

#### Returns

`void`
