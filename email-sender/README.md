# Email Sender Service

Comprehensive email sending service with scheduling, rate limiting, and warmup management.

## Features

- **Single & Bulk Sending**: Send individual or batch emails efficiently
- **Recipient Validation**: Optional email validation before sending
- **Smart Scheduling**: Schedule emails for specific times/timezones
- **Rate Limiting**: Respect hourly/daily sending limits
- **Warmup Management**: Automatic warmup schedule enforcement
- **ESP Integration**: Routes through ESP Gateway for intelligent provider selection
- **Send Tracking**: Complete delivery status and engagement tracking
- **Statistics**: Real-time analytics on delivery, opens, clicks, replies
- **Queue Integration**: Automatic queueing when limits reached

## Architecture

```
┌─────────────────────┐
│  email-sender       │
│  (This Service)     │
└─────────┬───────────┘
          │
          ├──► ESP Gateway (send emails)
          ├──► Email Validation (validate recipients)
          ├──► DNS Tools (verify domain)
          ├──► Database (record sends, query status)
          ├──► KV (rate limiting, warmup tracking)
          └──► Queue (async sending)
```

## RPC Interface

### Methods

```typescript
// Send single email
async send(request: SendEmailRequest): Promise<SendEmailResult>

// Send bulk emails
async bulkSend(request: BulkSendRequest): Promise<BulkSendResult>

// Get send status
async getStatus(query: SendStatusQuery): Promise<SendStatusResult[]>

// Get statistics
async getStats(period: string, domainId?: string): Promise<SendStats>
```

### Usage

```typescript
// Via service binding
const result = await env.EMAIL_SENDER.send({
  to: 'recipient@example.com',
  from: {
    email: 'sender@yourdomain.com',
    name: 'Your Name',
  },
  subject: 'Hello from .do',
  html: '<p>Email body here</p>',
  text: 'Email body here',
  options: {
    domainId: 'domain-123',
    validateRecipients: true,
    trackOpens: true,
    trackClicks: true,
  },
})
```

## HTTP API

### Endpoints

#### `POST /send`
Send a single email.

**Request:**
```json
{
  "to": "recipient@example.com",
  "from": {
    "email": "sender@yourdomain.com",
    "name": "Your Name"
  },
  "subject": "Hello",
  "html": "<p>Email body</p>",
  "options": {
    "domainId": "domain-123",
    "validateRecipients": true,
    "trackOpens": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg-xyz",
  "to": "recipient@example.com",
  "from": "sender@yourdomain.com",
  "provider": "sendgrid",
  "status": "sent",
  "sentAt": "2025-10-03T12:00:00Z"
}
```

#### `POST /send/bulk`
Send multiple emails.

**Request:**
```json
{
  "emails": [
    {
      "to": "user1@example.com",
      "from": { "email": "sender@yourdomain.com" },
      "subject": "Hello",
      "html": "<p>Body</p>"
    },
    {
      "to": "user2@example.com",
      "from": { "email": "sender@yourdomain.com" },
      "subject": "Hello",
      "html": "<p>Body</p>"
    }
  ],
  "options": {
    "parallel": false,
    "continueOnError": true,
    "batchSize": 100
  }
}
```

**Response:**
```json
{
  "totalCount": 2,
  "successCount": 2,
  "failedCount": 0,
  "queuedCount": 0,
  "rejectedCount": 0,
  "results": [...],
  "totalTime": 1234,
  "errors": []
}
```

#### `GET /status`
Get send status.

**Query Parameters:**
- `messageId` - Filter by message ID
- `email` - Filter by recipient email
- `domainId` - Filter by domain
- `campaignId` - Filter by campaign
- `status` - Filter by status
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `limit` - Results per page (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
[
  {
    "messageId": "msg-xyz",
    "email": "recipient@example.com",
    "from": "sender@yourdomain.com",
    "to": "recipient@example.com",
    "subject": "Hello",
    "status": "delivered",
    "provider": "sendgrid",
    "sentAt": "2025-10-03T12:00:00Z",
    "deliveredAt": "2025-10-03T12:01:00Z",
    "openedAt": "2025-10-03T12:05:00Z"
  }
]
```

#### `GET /stats`
Get sending statistics.

**Query Parameters:**
- `period` - Date period (ISO 8601 date)
- `domainId` - Filter by domain

**Response:**
```json
{
  "period": "2025-10-03",
  "totalSent": 1000,
  "totalDelivered": 950,
  "totalBounced": 20,
  "totalOpened": 400,
  "totalClicked": 100,
  "totalReplied": 50,
  "totalFailed": 30,
  "deliveryRate": 95.0,
  "openRate": 42.1,
  "clickRate": 25.0,
  "replyRate": 5.3,
  "bounceRate": 2.0,
  "byProvider": {
    "sendgrid": 500,
    "mailgun": 400,
    "ses": 100
  },
  "byDomain": {
    "domain-123": 600,
    "domain-456": 400
  }
}
```

## Send Options

### Validation
```typescript
{
  validateRecipients: true,  // Validate before sending
  skipInvalid: true,         // Skip invalid emails instead of failing
}
```

### Scheduling
```typescript
{
  scheduledAt: '2025-10-04T09:00:00Z',  // Schedule for specific time
  timezone: 'America/New_York',          // Recipient timezone
}
```

### Rate Limiting
```typescript
{
  respectWarmup: true,        // Honor warmup schedule (default: true)
  respectRateLimits: true,    // Honor rate limits (default: true)
}
```

### Tracking
```typescript
{
  trackOpens: true,           // Track email opens
  trackClicks: true,          // Track link clicks
}
```

### Sending Strategy
```typescript
{
  priority: 'high',           // high | normal | low
  batch: true,                // Enable batching
  batchSize: 100,             // Emails per batch
}
```

## Rate Limiting

The service automatically enforces rate limits configured per domain:

```typescript
// Rate limits checked before sending
{
  hourly: 100,    // Max 100 emails/hour
  daily: 1000,    // Max 1000 emails/day
  monthly: 30000  // Max 30,000 emails/month
}
```

If limit is reached:
- Email is automatically queued for later
- Status returned as `queued`
- Sent when limit resets

## Warmup Management

New domains must follow a warmup schedule:

```typescript
// Warmup status checked before sending
{
  enabled: true,
  status: 'in_progress',
  currentDay: 7,
  dailyLimit: 50,      // Current day's limit
  sent: 45,            // Sent today
  remaining: 5,        // Remaining today
  canSend: true
}
```

If warmup limit reached:
- Email queued until next day
- Status returned as `queued`
- Automatically sent when new day starts

## Scheduling

Schedule emails for specific times:

```typescript
await env.EMAIL_SENDER.send({
  to: 'recipient@example.com',
  from: { email: 'sender@yourdomain.com' },
  subject: 'Morning update',
  html: '<p>Your daily report</p>',
  options: {
    scheduledAt: '2025-10-04T09:00:00Z',
    timezone: 'America/New_York',  // Send at 9 AM EST
  },
})
```

Scheduled emails:
- Stored in database
- Processed by cron job at scheduled time
- Retried on failure (max 3 attempts)

## Statistics & Analytics

Track comprehensive sending metrics:

```typescript
const stats = await env.EMAIL_SENDER.getStats('2025-10-03', 'domain-123')

console.log(`
  Sent: ${stats.totalSent}
  Delivered: ${stats.totalDelivered} (${stats.deliveryRate}%)
  Opened: ${stats.totalOpened} (${stats.openRate}%)
  Clicked: ${stats.totalClicked} (${stats.clickRate}%)
  Replied: ${stats.totalReplied} (${stats.replyRate}%)
  Bounced: ${stats.totalBounced} (${stats.bounceRate}%)
`)
```

## Error Handling

All errors return a consistent format:

```typescript
{
  success: false,
  to: "recipient@example.com",
  from: "sender@yourdomain.com",
  status: "failed",
  error: "Recipient email invalid"
}
```

Common errors:
- `Invalid recipients` - Email validation failed
- `Domain not found` - Sending domain not configured
- `Rate limit reached` - Hourly/daily limit exceeded
- `Warmup limit reached` - Daily warmup limit exceeded
- `ESP error` - Provider-specific error

## Database Schema

### email_sends
```sql
CREATE TABLE email_sends (
  message_id TEXT PRIMARY KEY,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  domain_id TEXT,
  campaign_id TEXT,
  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  replied_at TIMESTAMP,
  bounced_at TIMESTAMP,
  bounce_reason TEXT,
  error TEXT
);
```

### scheduled_emails
```sql
CREATE TABLE scheduled_emails (
  id TEXT PRIMARY KEY,
  request JSON NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  sent_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Deployment

```bash
# Development
pnpm dev

# Production
pnpm deploy
```

## Related Services

- **esp-gateway**: Routes emails to ESPs
- **email-validation**: Validates email addresses
- **dns-tools**: Validates domains and DNS records
- **db**: Database access
- **email-campaigns**: Campaign management
- **email-warming**: Automated warmup

## Best Practices

1. **Always validate**: Enable `validateRecipients` for cold email
2. **Respect warmup**: Never disable `respectWarmup` for new domains
3. **Monitor stats**: Check daily metrics for deliverability issues
4. **Handle failures**: Check status and retry failed sends
5. **Use scheduling**: Schedule emails for optimal open times
6. **Track engagement**: Enable opens/clicks tracking
7. **Clean lists**: Remove bounces and unresponsive contacts

## License

Private - Dot-Do Organization
