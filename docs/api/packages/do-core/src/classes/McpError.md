[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / McpError

# Class: McpError

Defined in: [packages/do-core/src/mcp-error.ts:73](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L73)

Typed error class for MCP protocol errors

Provides proper TypeScript typing for error codes and optional data payload.
Supports serialization to JSON-RPC error format.

## Example

```typescript
// Create a method not found error
const error = new McpError(
  McpErrorCode.MethodNotFound,
  `Method '${method}' not found`
);

// Create an invalid params error with additional data
const error = new McpError(
  McpErrorCode.InvalidParams,
  'Missing required parameter: id',
  { requiredParams: ['id', 'name'] }
);

// Serialize for JSON-RPC response
const response = {
  jsonrpc: '2.0',
  error: error.toJsonRpc(),
  id: null
};
```

## Extends

- `Error`

## Constructors

### Constructor

> **new McpError**(`code`, `message`, `data?`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:86](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L86)

Create a new MCP error

#### Parameters

##### code

[`McpErrorCode`](../enumerations/McpErrorCode.md)

The MCP/JSON-RPC error code

##### message

`string`

Human-readable error message

##### data?

`unknown`

Optional additional error data

#### Returns

`McpError`

#### Overrides

`Error.constructor`

## Properties

### name

> `readonly` **name**: `"McpError"` = `'McpError'`

Defined in: [packages/do-core/src/mcp-error.ts:77](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L77)

The error name, always 'McpError'

#### Overrides

`Error.name`

***

### code

> `readonly` **code**: [`McpErrorCode`](../enumerations/McpErrorCode.md)

Defined in: [packages/do-core/src/mcp-error.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L87)

The MCP/JSON-RPC error code

***

### data?

> `readonly` `optional` **data**: `unknown`

Defined in: [packages/do-core/src/mcp-error.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L89)

Optional additional error data

## Methods

### toJsonRpc()

> **toJsonRpc**(): [`JsonRpcErrorResponse`](../interfaces/JsonRpcErrorResponse.md)

Defined in: [packages/do-core/src/mcp-error.ts:104](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L104)

Serialize the error to JSON-RPC error format

#### Returns

[`JsonRpcErrorResponse`](../interfaces/JsonRpcErrorResponse.md)

JSON-RPC compatible error object

***

### parseError()

> `static` **parseError**(`message`, `data?`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:123](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L123)

Create a ParseError (-32700)

#### Parameters

##### message

`string` = `'Parse error'`

Optional custom message (default: 'Parse error')

##### data?

`unknown`

Optional additional error data

#### Returns

`McpError`

***

### invalidRequest()

> `static` **invalidRequest**(`message`, `data?`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:133](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L133)

Create an InvalidRequest error (-32600)

#### Parameters

##### message

`string` = `'Invalid Request'`

Optional custom message (default: 'Invalid Request')

##### data?

`unknown`

Optional additional error data

#### Returns

`McpError`

***

### methodNotFound()

> `static` **methodNotFound**(`methodName?`, `data?`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:143](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L143)

Create a MethodNotFound error (-32601)

#### Parameters

##### methodName?

`string`

The method name that was not found

##### data?

`unknown`

Optional additional error data

#### Returns

`McpError`

***

### invalidParams()

> `static` **invalidParams**(`message`, `data?`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L156)

Create an InvalidParams error (-32602)

#### Parameters

##### message

`string` = `'Invalid params'`

Optional custom message (default: 'Invalid params')

##### data?

`unknown`

Optional additional error data

#### Returns

`McpError`

***

### internalError()

> `static` **internalError**(`message`, `data?`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:166](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L166)

Create an InternalError (-32603)

#### Parameters

##### message

`string` = `'Internal error'`

Optional custom message (default: 'Internal error')

##### data?

`unknown`

Optional additional error data

#### Returns

`McpError`

***

### serverError()

> `static` **serverError**(`message`, `data?`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:176](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L176)

Create a ServerError (-32000)

#### Parameters

##### message

`string`

Custom error message

##### data?

`unknown`

Optional additional error data

#### Returns

`McpError`

***

### fromError()

> `static` **fromError**(`error`, `code`): `McpError`

Defined in: [packages/do-core/src/mcp-error.ts:186](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L186)

Create an McpError from a generic Error

#### Parameters

##### error

`Error`

The original error

##### code

[`McpErrorCode`](../enumerations/McpErrorCode.md) = `McpErrorCode.InternalError`

Error code to use (default: InternalError)

#### Returns

`McpError`
