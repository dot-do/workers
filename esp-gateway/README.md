# ESP Gateway Service

Unified abstraction layer for sending emails across multiple Email Service Providers (ESPs) with automatic fallback, cost optimization, and health monitoring.

## Supported ESPs

- **Mailgun** - High deliverability, bulk sending
- **SendGrid** - Enterprise features, extensive APIs
- **Postmark** - Transactional focus, speed
- **Amazon SES** - Cost-effective at scale
- **Resend** - Developer-friendly, modern API

## Features

- **Unified API**: Single interface for all ESPs
- **Intelligent Routing**: Automatically select best ESP based on priority, cost, and health
- **Automatic Fallback**: Retry failed sends via backup ESPs
- **Health Monitoring**: Track ESP health and consecutive failures
- **Rate Limiting**: Respect per-minute and daily send limits
- **Cost Optimization**: Route to cheapest healthy provider
- **Bulk Sending**: Efficient batch processing up to 10,000 emails

## API Endpoints

### Send Single Email

```bash
POST /send
Content-Type: application/json

{
  "message": {
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Hello from ESP Gateway",
    "html": "<p>Email content</p>",
    "text": "Email content"
  },
  "options": {
    "provider": "mailgun",  // optional: force specific ESP
    "fallback": true        // optional: enable fallback (default: true)
  }
}
```

### Bulk Send

```bash
POST /send/bulk
Content-Type: application/json

{
  "messages": [
    { "from": "...", "to": "...", "subject": "...", "html": "..." },
    { "from": "...", "to": "...", "subject": "...", "html": "..." }
  ],
  "options": {
    "fallback": true
  }
}
```

### Get Provider Status

```bash
GET /providers
```

## RPC Interface

```typescript
// From another service
const espGateway = env.ESP_GATEWAY
const result = await espGateway.send({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Hello',
  html: '<p>Content</p>'
}, {
  fallback: true
})
```

## Configuration

### ESP Credentials (Secrets)

```bash
# Mailgun
wrangler secret put MAILGUN_API_KEY
wrangler secret put MAILGUN_DOMAIN

# SendGrid
wrangler secret put SENDGRID_API_KEY

# Postmark
wrangler secret put POSTMARK_API_KEY

# Amazon SES
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put AWS_REGION

# Resend
wrangler secret put RESEND_API_KEY
```

### ESP Priority and Cost

Configured in `getESPConfigs()`:

```typescript
{
  provider: 'mailgun',
  priority: 8,          // 1-10, higher = preferred
  rateLimit: 1000,      // requests per minute
  dailyLimit: 50000,    // emails per day
  cost: 0.80            // $ per 1000 emails
}
```

## Routing Logic

1. **Force Provider**: If `options.provider` specified, use that provider
2. **Priority + Health**: Select highest priority healthy provider
3. **Rate Limits**: Skip providers at rate/daily limits
4. **Cost Optimization**: If multiple providers have same priority, choose cheapest
5. **Fallback**: If send fails and `fallback: true`, try next best provider

## Health Monitoring

ESPs are marked unhealthy after **3 consecutive failures**. Health is cached in KV for 1 hour.

Health metrics tracked:
- `healthy`: boolean flag
- `consecutiveFailures`: failure count
- `currentRate`: sends this minute
- `dailyCount`: sends today
- `lastCheck`: timestamp

## Send Result

```typescript
{
  success: true,
  provider: "mailgun",
  messageId: "20231003T123456.123456@mailgun.org",
  error: null,
  metadata: {
    // ESP-specific response data
  }
}
```

## Error Handling

If all providers fail:
```typescript
{
  success: false,
  provider: "mailgun",  // last attempted
  messageId: "",
  error: "No healthy ESP providers available"
}
```

## Cost Comparison (per 1,000 emails)

| ESP | Cost | Notes |
|-----|------|-------|
| Amazon SES | $0.10 | Cheapest at scale, requires AWS setup |
| Mailgun | $0.80 | Good balance of cost and features |
| SendGrid | $1.00 | Premium features, higher cost |
| Postmark | $1.25 | Transactional focus, premium support |
| Resend | $1.00 | Developer experience, modern API |

## Performance

- **Single send**: ~100-300ms (depends on ESP)
- **Bulk send**: ~100-200 emails/second (batched)
- **Fallback overhead**: +100-300ms per retry
- **Health check**: <5ms (KV cached)

## Integration Example

```typescript
import { ESPGatewayService } from '@do/esp-gateway'

// Send cold email via best available ESP
const espGateway = env.ESP_GATEWAY
const result = await espGateway.send({
  from: 'sales@company.com',
  to: 'lead@prospect.com',
  subject: 'Quick question about {{company}}',
  html: emailTemplate,
  tags: ['cold-outreach', 'campaign-123'],
  headers: {
    'X-Campaign-ID': 'campaign-123'
  }
}, {
  fallback: true,  // Retry via backup ESPs
  tracking: {
    opens: true,
    clicks: true,
    unsubscribe: true
  }
})

if (result.success) {
  await trackEmailSent(result.messageId, result.provider)
}
```

## Best Practices

1. **Enable fallback**: Always use `fallback: true` for critical emails
2. **Set priorities**: Configure ESP priorities based on deliverability and cost
3. **Monitor health**: Check `/providers` endpoint for ESP health status
4. **Rate limits**: Stay within ESP rate limits to avoid throttling
5. **Tags and metadata**: Use tags for campaign tracking and analytics

## Future Enhancements

- [ ] Postmark and Amazon SES implementations
- [ ] Advanced routing rules (domain reputation matching)
- [ ] Real-time deliverability feedback
- [ ] A/B testing across ESPs
- [ ] Webhook event normalization

---

**Status**: Production Ready (Mailgun, SendGrid, Resend implemented)
**Version**: 1.0.0
**Last Updated**: 2025-10-03
