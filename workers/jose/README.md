# @dotdo/worker-jose

jose JWT library exposed as a multi-transport RPC worker.

## Overview

This worker wraps the [jose](https://github.com/panva/jose) library, providing JWT signing, verification, encryption, and decryption capabilities via Cloudflare Workers RPC.

## Installation

```bash
pnpm add jose @dotdo/rpc
```

## Usage

The worker follows the elegant 3-line pattern:

```typescript
import * as jose from 'jose'
import { RPC } from 'workers.do/rpc'
export default RPC(jose)
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "JOSE",
      "service": "worker-jose"
    }
  ]
}
```

Access via:

```typescript
this.env.JOSE
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.JOSE.jwtVerify(token, key)` |
| REST | `POST /api/jwtVerify` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'jwtVerify', params: [...] }` |

## Common Operations

```typescript
// Sign a JWT
const jwt = await env.JOSE.SignJWT({ sub: 'user123' })
  .setProtectedHeader({ alg: 'HS256' })
  .sign(secretKey)

// Verify a JWT
const { payload } = await env.JOSE.jwtVerify(token, secretKey)

// Encrypt a JWT
const jwe = await env.JOSE.EncryptJWT({ data: 'secret' })
  .setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
  .encrypt(publicKey)
```

## Dependencies

- `jose` ^5.0.0
- `@dotdo/rpc` workspace:*

## License

MIT
