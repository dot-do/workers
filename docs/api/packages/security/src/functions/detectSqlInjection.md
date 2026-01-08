[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / detectSqlInjection

# Function: detectSqlInjection()

> **detectSqlInjection**(`input`): [`SqlInjectionResult`](../interfaces/SqlInjectionResult.md)

Defined in: [packages/security/src/index.ts:76](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L76)

Detect SQL injection attempts in a string

## Parameters

### input

`string`

The string to check for SQL injection patterns

## Returns

[`SqlInjectionResult`](../interfaces/SqlInjectionResult.md)

Detection result with pattern information
