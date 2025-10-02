# Events Service - Implementation Documentation

Real-time event streaming and webhook delivery service for the .do platform.

## Features

- **Event Publishing** - Publish events to the event bus with persistence
- **Server-Sent Events (SSE)** - Real-time event streaming to clients
- **Webhook Delivery** - Reliable webhook delivery with retries
- **Event History** - Query and filter historical events
- **Analytics** - Track event metrics with Analytics Engine

## Architecture

### Components

1. **EventsService (RPC)** - Main service class exposing RPC methods
2. **EventStream (Durable Object)** - Manages SSE connections and broadcasting
3. **HTTP Interface** - RESTful API for event management
4. **Queue Consumer** - Processes webhook deliveries asynchronously

### Event Types

Supported event types follow the pattern `<entity>.<action>`:

- `user.created`, `user.updated`, `user.deleted`
- `thing.created`, `thing.updated`, `thing.deleted`
- `relationship.created`, `relationship.deleted`
- `job.started`, `job.completed`, `job.failed`
- `webhook.triggered`

## API Reference

### RPC Methods

```typescript
// Publish an event
await eventsService.publishEvent({
  type: 'user.created',
  source: 'auth-service',
  payload: { userId: '123', email: 'user@example.com' },
  metadata: { ip: '127.0.0.1' }
})

// Subscribe to events (returns SSE stream)
const stream = await eventsService.subscribe({
  type: 'user.created',
  since: new Date('2025-01-01')
})

// Query events
const events = await eventsService.getEvents({
  type: 'user.created',
  limit: 100
})

// Register webhook
const webhookId = await eventsService.registerWebhook(
  'https://example.com/webhook',
  ['user.created', 'user.updated'],
  'optional-secret-key'
)

// List webhooks
const webhooks = await eventsService.listWebhooks()

// Update webhook
await eventsService.updateWebhook(webhookId, {
  active: false
})

// Delete webhook
await eventsService.deleteWebhook(webhookId)
```

### HTTP Endpoints

#### Stream Events (SSE)

```bash
GET /events/stream?type=user.created&source=auth-service

# Returns Server-Sent Events stream
# Content-Type: text/event-stream
```

#### Publish Event

```bash
POST /events
Content-Type: application/json

{
  "type": "user.created",
  "source": "auth-service",
  "payload": { "userId": "123" },
  "metadata": { "ip": "127.0.0.1" }
}
```

#### Query Events

```bash
GET /events?type=user.created&limit=100&since=2025-01-01T00:00:00Z
```

#### Webhook Management

```bash
# Register webhook
POST /webhooks
{
  "url": "https://example.com/webhook",
  "events": ["user.created", "user.updated"],
  "secret": "optional-secret-key"
}

# List webhooks
GET /webhooks

# Get webhook
GET /webhooks/:id

# Update webhook
PATCH /webhooks/:id
{
  "active": false
}

# Delete webhook
DELETE /webhooks/:id
```

## Webhook Delivery

Webhooks are delivered asynchronously via Cloudflare Queues with automatic retries.

### Webhook Payload

```json
{
  "event": {
    "id": "event-123",
    "type": "user.created",
    "source": "auth-service",
    "payload": { "userId": "123" },
    "timestamp": "2025-10-02T12:00:00Z"
  },
  "deliveredAt": "2025-10-02T12:00:01Z"
}
```

### Webhook Signature

If a secret is provided, webhooks are signed with HMAC-SHA256:

```
X-Signature: sha256=<hex-encoded-signature>
```

Verify signature:

```typescript
const encoder = new TextEncoder()
const key = await crypto.subtle.importKey(
  'raw',
  encoder.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign']
)
const signature = await crypto.subtle.sign(
  'HMAC',
  key,
  encoder.encode(JSON.stringify(payload))
)
const hex = Array.from(new Uint8Array(signature))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('')
```

### Retry Policy

- **Max Retries**: 3 (configured in wrangler.toml)
- **Retry Delay**: Exponential backoff via Cloudflare Queues
- **Timeout**: 10 seconds per delivery
- **Dead Letter Queue**: Failed deliveries after max retries

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Deploy to Cloudflare
pnpm deploy
```

## Configuration

### Service Bindings

- `DB` - Database service for event/webhook persistence
- `EVENT_STREAM` - Durable Object for SSE streaming
- `WEBHOOK_QUEUE` - Queue for webhook delivery
- `EVENTS_ANALYTICS` - Analytics Engine for metrics

### Queue Configuration

```toml
[[queues.consumers]]
queue = "events-webhooks"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "events-webhooks-dlq"
```

## Examples

### Client-Side SSE

```typescript
const eventSource = new EventSource('https://events.example.com/stream?type=user.created')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'event') {
    console.log('New event:', data.event)
  }
}

eventSource.onerror = (error) => {
  console.error('SSE error:', error)
}
```

### Server-Side Publishing

```typescript
// From another worker
const eventsService = env.EVENTS.get(env.EVENTS.idFromName('events'))

await eventsService.publishEvent({
  type: 'user.created',
  source: 'auth-worker',
  payload: {
    userId: user.id,
    email: user.email
  }
})
```

## Success Criteria

✅ Event publishing via RPC
✅ SSE streaming working
✅ Webhook delivery working
✅ Event history queryable
✅ All tests passing

## Status

**Implementation: Complete**

- EventsService RPC class implemented
- EventStream Durable Object implemented
- HTTP interface with SSE endpoint
- Webhook registration and management
- Queue-based webhook delivery with retries
- Comprehensive test coverage
- Full documentation

Ready for deployment and integration testing.
