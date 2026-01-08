[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / createErrorBoundary

# Function: createErrorBoundary()

> **createErrorBoundary**(`options`): [`IErrorBoundary`](../interfaces/IErrorBoundary.md)

Defined in: [packages/do-core/src/error-boundary.ts:262](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/error-boundary.ts#L262)

Factory function for creating error boundaries.

## Parameters

### options

[`ErrorBoundaryOptions`](../interfaces/ErrorBoundaryOptions.md)

Error boundary configuration

## Returns

[`IErrorBoundary`](../interfaces/IErrorBoundary.md)

A new ErrorBoundary instance

## Throws

Error if name is empty or fallback is not provided
