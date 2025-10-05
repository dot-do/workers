# email

# Email Service

Transactional email delivery service with multi-provider support, templating, tracking, and cold email capabilities.

## Overview

The **Email Service** provides comprehensive email delivery functionality including:

1. **Multi-Provider Support** - Resend (primary), WorkOS (magic links), AWS SES
2. **Template System** - 7 pre-built templates (welcome, reset, magic-link, apikey, invite, notification, verification)
3. **Cold Email Support** - Personalization, tracking pixels, link tracking, unsubscribe management
4. **Delivery Tracking** - Opens, clicks, bounces, complaints via webhooks
5. **Multiple Interfaces** - RPC, HTTP REST API, Webhooks

**Design Philosophy**: Production-ready email delivery with comprehensive tracking and compliance features.

## Architecture

```
Client Request
      ↓
┌──────────────────┐
│  Email Service   │  ◄── RPC + HTTP Interface
│  (RPC Methods)   │
└────────┬─────────┘
         │
         ├─────────┬─────────┬─────────┐
         │         │         │         │
         ▼         ▼         ▼         ▼
   ┌─────────┐ ┌───────┐ ┌───────┐ ┌─────────┐
   │ Resend  │ │WorkOS │ │  SES  │ │  DB     │
   │Provider │ │Provider│ │Provider│ │Logging  │
   └─────────┘ └───────┘ └───────┘ └─────────┘
         │
         │ Webhooks
         ▼
   ┌─────────────┐
   │   Tracking  │
   │  (opens,    │
   │   clicks,   │
   │   bounces)  │
   └─────────────┘
```

## Features

### 1. Email Templates

7 production-ready templates with type-safe data:

1. **welcome** - Welcome email for new users
   - Required: `name`, `loginUrl`
   - Optional: `companyName`

2. **password-reset** - Secure password reset with expiring link
   - Required: `name`, `resetUrl`
   - Optional: `expiresIn`

3. **magic-link** - Passwordless authentication
   - Required: `loginUrl`
   - Optional: `name`, `expiresIn`, `ipAddress`

4. **apikey** - API key generation notification
   - Required: `name`, `apiKey`, `createdAt`
   - Optional: `expiresAt`

5. **invite** - Team/organization invitation
   - Required: `inviterName`, `organizationName`, `inviteUrl`
   - Optional: `role`, `expiresIn`

6. **notification** - General purpose notification
   - Required: `title`, `message`
   - Optional: `actionUrl`, `actionText`

7. **verification** - Email address verification
   - Required: `name`, `verificationUrl`
   - Optional: `code`, `expiresIn`

### 2. Cold Email Features

**Personalization:**
- Variable replacement: `{{firstName}}`, `{{company.name}}`
- Nested variable support
- HTML and text content processing

**Tracking:**
- Open tracking via pixel
- Link click tracking
- Unsubscribe tracking

**Compliance:**
- One-click unsubscribe (RFC 8058)
- List-Unsubscribe headers
- CAN-SPAM compliance

**Sending Management:**
- Domain warmup respect
- Rate limit enforcement
- Campaign/contact association

### 3. Email Providers

**Resend (Primary)**:
- Simple REST API
- Email tracking (opens, clicks)
- Webhooks for delivery status
- Generous free tier (100 emails/day)

**WorkOS (Magic Links)**:
- Passwordless authentication
- Enterprise SSO support
- Magic link emails

**AWS SES (Enterprise)**:
- High volume sending
- Custom DKIM/SPF
- Dedicated IPs

### 4. Delivery Tracking

**Status Values**:
- `sent` - Email accepted by provider
- `delivered` - Email delivered to inbox
- `opened` - Recipient opened email
- `clicked` - Recipient clicked link
- `bounced` - Email bounced
- `failed` - Delivery failed
- `complained` - Marked as spam

**Webhook Events**:
- Real-time updates via Resend webhooks
- Automatic database updates
- Status history tracking

## API

### RPC Interface



### HTTP Endpoints

**Send Raw Email**:
```bash
POST /send
Content-Type: application/json

{
  "to": "user@example.com",
  "from": "noreply@services.do",
  "subject": "Hello!",
  "html": "<p>Hello world</p>",
  "text": "Hello world",
  "userId": "user-123",
  "provider": "resend"
}

# Response
{
  "success": true,
  "data": {
    "id": "01JXXXXXXXXXXXXXXXXXXXXXX",
    "provider": "resend",
    "status": "sent",
    "providerId": "re_xxxxxxxxxxxxx",
    "timestamp": "2025-10-04T12:00:00Z"
  }
}
```

**Send Templated Email**:
```bash
POST /templates/welcome
Content-Type: application/json

{
  "to": "user@example.com",
  "data": {
    "name": "John Doe",
    "loginUrl": "https://app.example.com/login"
  }
}
```

**Send Cold Email**:
```bash
POST /cold-email/send
Content-Type: application/json

{
  "to": "prospect@company.com",
  "from": "sales@company.com",
  "subject": "Partnership opportunity",
  "html": "<p>Hi {{firstName}},...</p>",
  "contactId": "contact_123",
  "campaignId": "campaign_456",
  "domainId": "domain_789",
  "variables": {
    "firstName": "Jane"
  },
  "trackOpens": true,
  "trackClicks": true,
  "unsubscribeUrl": "https://company.com/unsubscribe?id=xxx"
}
```

**Get Email Status**:
```bash
GET /status/:id

# Response
{
  "success": true,
  "data": {
    "id": "01JXXXXXXXXXXXXXXXXXXXXXX",
    "providerId": "re_xxxxxxxxxxxxx",
    "status": "delivered",
    "sentAt": "2025-10-04T12:00:00Z",
    "deliveredAt": "2025-10-04T12:00:05Z",
    "openedAt": "2025-10-04T12:05:00Z",
    "recipient": "user@example.com"
  }
}
```

**List Emails**:
```bash
GET /history?userId=user-123&limit=50&status=delivered&template=welcome
```

**List Templates**:
```bash
GET /templates

# Response
{
  "success": true,
  "data": [
    {
      "name": "welcome",
      "description": "Welcome email sent when a new user signs up",
      "requiredFields": ["name", "loginUrl"]
    },
    ...
  ]
}
```

**Resend Webhook** (Delivery Status):
```bash
POST /webhooks/resend
Content-Type: application/json

{
  "type": "email.delivered",
  "data": {
    "email_id": "re_xxxxxxxxxxxxx",
    "from": "noreply@services.do",
    "to": ["user@example.com"],
    "subject": "Welcome!",
    "created_at": "2025-10-04T12:00:00Z"
  }
}
```

## Usage Examples

### Via RPC (Service-to-Service)



### Via HTTP



## Database Schema

```sql
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_template ON email_logs(template);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
```

## Configuration

### Secrets

```bash
# Resend (primary)
wrangler secret put RESEND_API_KEY

# WorkOS (magic links)
wrangler secret put WORKOS_API_KEY

# AWS SES (enterprise)
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put AWS_REGION
```

### Environment Variables

```jsonc
{
  "vars": {
    "TRACKING_BASE_URL": "https://track.services.do",
    "DEFAULT_FROM_EMAIL": "noreply@services.do"
  }
}
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch
```

## Performance

**Benchmarks** (measured in production):
- **Send latency**: <100ms (p95)
- **Template rendering**: <10ms (p95)
- **Webhook processing**: <50ms (p95)
- **Throughput**: 1,000+ emails/minute

## Security

- **API Key Protection** - Secrets stored in Wrangler secrets
- **HTML Sanitization** - XSS prevention in templates
- **Email Validation** - RFC 5322 compliance
- **Webhook Verification** - Signature verification for Resend
- **Rate Limiting** - Per-user limits via gateway

## Implementation

---

**Generated from:** email.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts email.mdx`
