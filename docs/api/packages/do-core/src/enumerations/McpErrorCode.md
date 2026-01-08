[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / McpErrorCode

# Enumeration: McpErrorCode

Defined in: [packages/do-core/src/mcp-error.ts:20](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L20)

MCP Error Codes

Standard JSON-RPC 2.0 error codes used by MCP protocol:
- ParseError (-32700): Invalid JSON was received
- InvalidRequest (-32600): JSON is not a valid Request object
- MethodNotFound (-32601): Method does not exist or is not available
- InvalidParams (-32602): Invalid method parameters
- InternalError (-32603): Internal JSON-RPC error

Server error codes (-32000 to -32099) are reserved for implementation-defined errors.

## Enumeration Members

### ParseError

> **ParseError**: `-32700`

Defined in: [packages/do-core/src/mcp-error.ts:22](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L22)

Invalid JSON was received by the server

***

### InvalidRequest

> **InvalidRequest**: `-32600`

Defined in: [packages/do-core/src/mcp-error.ts:24](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L24)

The JSON sent is not a valid Request object

***

### MethodNotFound

> **MethodNotFound**: `-32601`

Defined in: [packages/do-core/src/mcp-error.ts:26](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L26)

The method does not exist or is not available

***

### InvalidParams

> **InvalidParams**: `-32602`

Defined in: [packages/do-core/src/mcp-error.ts:28](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L28)

Invalid method parameter(s)

***

### InternalError

> **InternalError**: `-32603`

Defined in: [packages/do-core/src/mcp-error.ts:30](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L30)

Internal JSON-RPC error

***

### ServerError

> **ServerError**: `-32000`

Defined in: [packages/do-core/src/mcp-error.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/mcp-error.ts#L32)

Server error - reserved for implementation-defined errors
