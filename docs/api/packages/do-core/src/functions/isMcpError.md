[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / isMcpError

# Function: isMcpError()

> **isMcpError**(`error`): `error is McpError`

Defined in: [packages/do-core/src/mcp-error.ts:212](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L212)

Type guard to check if an error is an McpError

## Parameters

### error

`unknown`

The error to check

## Returns

`error is McpError`

true if the error is an McpError instance

## Example

```typescript
try {
  await callMethod(request);
} catch (error) {
  if (isMcpError(error)) {
    // TypeScript knows error is McpError here
    console.log(error.code, error.data);
  }
}
```
