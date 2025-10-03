# Webhooks Service

Receives and processes incoming webhooks from external services with signature verification, idempotency, and queue integration.

## Overview

This service handles webhooks from:
- **Stripe** - Payment and subscription events
- **WorkOS** - Directory sync and user management
- **GitHub** - Repository events (push, PR, issues, releases)
- **Resend** - Email delivery events

## Features

- ✅ **Signature Verification** - HMAC-SHA256 verification for all providers
- ✅ **Idempotency** - Prevents duplicate event processing
- ✅ **Replay Protection** - Rejects webhooks older than 5 minutes
- ✅ **Event Storage** - All webhooks stored in database for audit trail
- ✅ **Queue Integration** - Long-running tasks queued for async processing
- ✅ **Fast Response** - All webhooks respond in <5s
- ✅ **Retry Mechanism** - Failed webhooks can be retried via API
- ✅ **Event Monitoring** - List and inspect webhook events

## Architecture

```
External Service → Webhook → Signature Verification → Idempotency Check → Handler → Database + Queue → Response
```

## API Endpoints

### Webhook Receivers

#### POST /stripe
Receives Stripe webhook events.

**Headers:**
- `stripe-signature` - Stripe webhook signature (required)

**Events:**
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Invoice paid
- `invoice.payment_failed` - Invoice payment failed

#### POST /workos
Receives WorkOS webhook events.

**Headers:**
- `workos-signature` - WorkOS webhook signature (required)

**Events:**
- `dsync.activated` - Directory sync activated
- `dsync.deleted` - Directory sync deleted
- `dsync.user.created` - User created via SCIM
- `dsync.user.updated` - User updated via SCIM
- `dsync.user.deleted` - User deleted via SCIM
- `dsync.group.created` - Group created via SCIM
- `dsync.group.updated` - Group updated via SCIM
- `dsync.group.deleted` - Group deleted via SCIM

#### POST /github
Receives GitHub webhook events.

**Headers:**
- `x-hub-signature-256` - GitHub HMAC signature (required)
- `x-github-event` - Event type (required)
- `x-github-delivery` - Delivery ID (required)

**Events:**
- `push` - Code pushed to repository
- `pull_request` - PR opened, closed, merged, etc.
- `issues` - Issue created, updated, closed, etc.
- `release` - Release published, created, etc.

#### POST /resend
Receives Resend email webhook events (via Svix).

**Headers:**
- `svix-id` - Message ID (required)
- `svix-timestamp` - Timestamp (required)
- `svix-signature` - Svix signature (required)

**Events:**
- `email.sent` - Email sent
- `email.delivered` - Email delivered
- `email.opened` - Email opened
- `email.clicked` - Link clicked
- `email.bounced` - Email bounced
- `email.complained` - Spam complaint

### Event Management

#### GET /events
List webhook events with optional filters.

**Query Parameters:**
- `provider` - Filter by provider (stripe, workos, github, resend)
- `processed` - Filter by processed status (true/false)
- `limit` - Maximum results (default: 100)

**Response:**
```json
{
  "events": [
    {
      "id": "01HXYZ...",
      "provider": "stripe",
      "event_id": "evt_123",
      "event_type": "payment_intent.succeeded",
      "payload": "{...}",
      "signature": "...",
      "processed": true,
      "processed_at": "2025-10-02T00:00:00Z",
      "created_at": "2025-10-02T00:00:00Z"
    }
  ],
  "count": 1
}
```

#### GET /events/:provider/:eventId
Get specific webhook event by provider and event ID.

**Response:**
```json
{
  "id": "01HXYZ...",
  "provider": "stripe",
  "event_id": "evt_123",
  "event_type": "payment_intent.succeeded",
  "payload": "{...}",
  "processed": true
}
```

#### POST /events/:provider/:eventId/retry
Retry failed webhook event.

**Response:**
```json
{
  "success": true,
  "result": {
    "processed": true
  }
}
```

## Configuration

### Environment Variables

Set via `wrangler secret put`:

```bash
# Stripe
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# WorkOS
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_WEBHOOK_SECRET

# GitHub
wrangler secret put GITHUB_WEBHOOK_SECRET

# Resend
wrangler secret put RESEND_WEBHOOK_SECRET
```

### Service Bindings

Configured in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "DB", "service": "do-db" },
    { "binding": "QUEUE", "service": "do-queue" }
  ]
}
```

## Database Schema

```sql
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,  -- 'stripe', 'workos', 'github', 'resend'
  event_id TEXT NOT NULL,  -- Provider's event ID
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,   -- JSON string
  signature TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE UNIQUE INDEX idx_webhook_events_provider_event_id ON webhook_events(provider, event_id);
```

## Signature Verification

### Stripe

Uses `stripe-signature` header with format: `t=timestamp,v1=signature`

1. Extract timestamp and signature from header
2. Check timestamp is within 5 minutes
3. Construct signed payload: `{timestamp}.{payload}`
4. Generate HMAC-SHA256 signature
5. Compare with provided signature (constant time)

### WorkOS

Uses `workos-signature` header with format: `t=timestamp,v1=signature`

Same process as Stripe.

### GitHub

Uses `x-hub-signature-256` header with format: `sha256={signature}`

1. Extract signature from header
2. Generate HMAC-SHA256 signature of payload
3. Compare with provided signature (constant time)

### Resend (Svix)

Uses three headers: `svix-id`, `svix-timestamp`, `svix-signature`

1. Extract message ID, timestamp, and signatures
2. Check timestamp is within 5 minutes
3. Construct signed content: `{msgId}.{timestamp}.{payload}`
4. Generate HMAC-SHA256 signature with base64-decoded secret
5. Compare with any v1 signature (constant time)

## Idempotency

All webhooks are deduplicated by `provider` + `event_id`:

1. Check if event already exists in database
2. If exists, return `{ already_processed: true }`
3. If not, store event and process

This prevents duplicate processing from:
- Webhook retries
- Network issues
- Provider bugs

## Queue Integration

Long-running tasks are queued for async processing:

```typescript
await env.QUEUE.enqueue({
  type: 'payment.succeeded',
  payload: {
    paymentIntentId: 'pi_123',
    amount: 1000,
    currency: 'usd'
  }
})
```

Queue message types:
- `payment.succeeded` - Process successful payment
- `subscription.created` - Setup new subscription
- `github.deploy` - Deploy code from push/PR
- `email.analytics` - Process email engagement

## Error Handling

- **Invalid Signature**: 401 Unauthorized
- **Missing Headers**: 401 Unauthorized
- **Old Timestamp**: 401 Unauthorized (replay protection)
- **Processing Error**: 500 Internal Server Error
- **Database Error**: Logged, webhook marked with error

Failed webhooks can be retried via:
```bash
POST /events/:provider/:eventId/retry
```

## Development

### Install Dependencies
```bash
pnpm install
```

### Run Tests
```bash
pnpm test
```

### Run with Coverage
```bash
pnpm test:coverage
```

### Local Development
```bash
pnpm dev
```

### Deploy
```bash
pnpm deploy
```

## Testing Webhooks

### Stripe CLI
```bash
stripe listen --forward-to https://webhooks.apis.do/stripe
stripe trigger payment_intent.succeeded
```

### GitHub CLI
```bash
gh webhook forward --repo owner/repo --url https://webhooks.apis.do/github --events push,pull_request
```

### Manual Test
```bash
curl -X POST https://webhooks.apis.do/stripe \
  -H "stripe-signature: t=123,v1=abc" \
  -d '{"id":"evt_123","type":"payment_intent.succeeded"}'
```

## Monitoring

### View Recent Events
```bash
curl https://webhooks.apis.do/events
```

### Filter by Provider
```bash
curl https://webhooks.apis.do/events?provider=stripe
```

### Get Specific Event
```bash
curl https://webhooks.apis.do/events/stripe/evt_123
```

### Retry Failed Event
```bash
curl -X POST https://webhooks.apis.do/events/stripe/evt_123/retry
```

## Webhook Catalog

### Stripe Events (7)
- payment_intent.succeeded
- payment_intent.payment_failed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

### WorkOS Events (8)
- dsync.activated
- dsync.deleted
- dsync.user.created
- dsync.user.updated
- dsync.user.deleted
- dsync.group.created
- dsync.group.updated
- dsync.group.deleted

### GitHub Events (4)
- push
- pull_request
- issues
- release

### Resend Events (6)
- email.sent
- email.delivered
- email.opened
- email.clicked
- email.bounced
- email.complained

**Total: 25 event types across 4 providers**

## Security

- ✅ All webhooks require signature verification
- ✅ Constant-time signature comparison prevents timing attacks
- ✅ Replay protection rejects old webhooks (5 minute tolerance)
- ✅ Idempotency prevents duplicate processing
- ✅ Secrets stored in Cloudflare Workers secrets
- ✅ All events logged for audit trail

## Performance

- ⚡ <5s response time for all webhooks
- ⚡ Database inserts are non-blocking
- ⚡ Long tasks queued for async processing
- ⚡ Signature verification uses Web Crypto API
- ⚡ Constant-time comparisons for security

## Troubleshooting

### Webhook not processing
1. Check signature verification logs
2. Verify secret is correct
3. Check timestamp tolerance (5 minutes)
4. Review database for duplicate events

### Signature verification fails
1. Verify webhook secret matches provider
2. Check payload hasn't been modified
3. Ensure timestamp is recent
4. Review provider's signature documentation

### Event already processed
This is normal - idempotency is working!
The webhook was already received and processed.

### Database errors
1. Check DB service binding is configured
2. Verify database schema exists
3. Review database connection status

## Resources

- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [WorkOS Webhooks](https://workos.com/docs/webhooks)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Resend Webhooks](https://resend.com/docs/dashboard/webhooks)
- [Svix Verification](https://docs.svix.com/receiving/verifying-payloads/how)

## License

MIT
