[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ErrorBoundaryMetrics

# Interface: ErrorBoundaryMetrics

Defined in: [packages/do-core/src/error-boundary.ts:61](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L61)

Error boundary metrics

## Properties

### errorCount

> **errorCount**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:63](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L63)

Total number of errors caught

***

### fallbackCount

> **fallbackCount**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:65](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L65)

Number of fallback invocations

***

### recoveryCount

> **recoveryCount**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:67](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L67)

Number of successful recoveries

***

### lastErrorAt?

> `optional` **lastErrorAt**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:69](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L69)

Last error timestamp

***

### errorRate

> **errorRate**: `number`

Defined in: [packages/do-core/src/error-boundary.ts:71](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L71)

Error rate (errors per minute)
