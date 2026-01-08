# @dotdo/middleware-webhook-security

Webhook signature verification middleware for Hono applications. Validates HMAC-SHA1 signatures in the `X-Hub-Signature` header (GitHub-style webhooks).

## Features

- **HMAC-SHA1 Signature Verification**: Validates webhook signatures using Web Crypto API
- **Timing-Safe Comparison**: Prevents timing attacks with constant-time comparison
- **Replay Attack Prevention**: Optional timestamp validation to reject old events
- **Standards Compliant**: Follows GitHub/GitLab webhook signature format

## Installation

```bash
npm install @dotdo/middleware-webhook-security
```

## Usage

```typescript
import { Hono } from 'hono'
import { verifyWebhookSignature } from '@dotdo/middleware-webhook-security'

const app = new Hono()

// Apply to specific route
app.use(
  '/webhooks/github',
  verifyWebhookSignature({ secret: process.env.GITHUB_WEBHOOK_SECRET! })
)

app.post('/webhooks/github', async (c) => {
  const payload = await c.req.json()
  // Process webhook - signature has already been verified
  return c.json({ received: true })
})

// With replay attack prevention
app.use(
  '/webhooks/secure',
  verifyWebhookSignature({
    secret: 'my-secret',
    maxAge: 5 * 60 * 1000, // Reject events older than 5 minutes
  })
)
```

## Options

- `secret` (required): The secret key used to sign webhooks
- `maxAge` (optional): Maximum age in milliseconds for webhook events. Events with `timestamp` field older than this will be rejected
- `headerName` (optional): Custom header name (default: `X-Hub-Signature`)

## Security

- Uses Web Crypto API for cryptographic operations
- Implements timing-safe comparison via `crypto.subtle.timingSafeEqual` or fallback
- Validates signature format before computation
- Returns 401 Unauthorized for invalid/missing signatures

## Signature Format

The middleware expects signatures in the format: `sha1=<hex_signature>`

Example:
```
X-Hub-Signature: sha1=abc123def456...
```

## Testing

```bash
npm test
```

## License

MIT
