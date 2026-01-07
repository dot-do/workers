# @dotdo/auth-plugin-mcp

Better Auth MCP plugin for AI tool authentication in workers.do applications.

## Overview

This plugin provides authentication support for the Model Context Protocol (MCP), enabling secure AI-to-AI communication. It allows AI agents and tools to authenticate with workers.do services using the MCP JSON-RPC transport.

## Installation

```bash
npm install @dotdo/auth-plugin-mcp
# or
pnpm add @dotdo/auth-plugin-mcp
```

## Usage

### With @dotdo/auth

```typescript
import { auth } from '@dotdo/auth'
import { mcp } from '@dotdo/auth-plugin-mcp'

const authInstance = auth({
  plugins: [
    mcp({
      // Optional: allowed origins for MCP connections
      allowedOrigins: ['https://claude.ai', 'https://api.anthropic.com'],
      // Optional: require signed requests
      requireSignature: true
    })
  ]
})
```

### MCP Authentication Flow

```typescript
// MCP JSON-RPC request with authentication
{
  "jsonrpc": "2.0",
  "method": "authenticate",
  "params": {
    "type": "bearer",
    "token": "mcp_token_abc123..."
  },
  "id": 1
}

// Authenticated tool call
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_user",
    "arguments": { "name": "Alice" }
  },
  "id": 2
}
```

### Creating MCP Tokens

```typescript
// Server-side
const token = await authInstance.api.createMcpToken({
  userId: 'user_123',
  clientId: 'claude-desktop',
  scopes: ['read', 'write']
})
```

## Key Features

- MCP JSON-RPC authentication support
- Token-based and session-based auth
- Scope-based permissions for AI tools
- Origin validation for secure AI connections
- Compatible with Claude, GPT, and other MCP clients
- Integration with workers.do multi-transport RPC

## Authentication Methods

| Method | Description |
|--------|-------------|
| Bearer Token | Long-lived tokens for trusted AI clients |
| Session | Browser-based AI tool authentication |
| Signed Request | Cryptographically signed requests for high-security |

## MCP Transport Integration

This plugin integrates with workers.do's multi-transport architecture:

```typescript
// MCP requests are automatically authenticated
POST /mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "users.list",
  "params": {},
  "id": 1
}
```

## Related

- [@dotdo/auth](../core) - Core Better Auth integration
- [MCP Specification](https://modelcontextprotocol.io/) - Model Context Protocol documentation
- [Better Auth](https://www.better-auth.com/) - Official Better Auth documentation
