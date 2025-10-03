# Email Service

Transactional email delivery service with multi-provider support, templating, and delivery tracking.

## Features

- **Multi-Provider Support** - Resend (primary), WorkOS, SendGrid (future)
- **7 Email Templates** - Welcome, password reset, magic link, API key, invite, notification, verification
- **Template System** - Easy-to-use template rendering with type-safe data
- **Delivery Tracking** - Track opens, clicks, bounces via webhooks
- **Multiple Interfaces** - RPC, HTTP REST API, Webhooks
- **Type Safety** - Full TypeScript support

## Quick Start

### Installation

```bash
pnpm install
```

### Environment Variables

```bash
# Resend (primary provider)
wrangler secret put RESEND_API_KEY

# WorkOS (for magic links)
wrangler secret put WORKOS_API_KEY

# Optional: SendGrid (future)
wrangler secret put SENDGRID_API_KEY
```

### Development

```bash
# Start local dev server
pnpm dev

# Run tests
pnpm test

# Deploy to production
pnpm deploy
```

## Email Templates

### 1. Welcome Email

Sent when a new user signs up.

**Template:** `welcome`

**Required Fields:**
- `name` - User's name
- `loginUrl` - Link to log in

**Optional Fields:**
- `companyName` - Company/product name (default: ".do")

**Example:**

```typescript
await emailService.sendTemplate({
  template: 'welcome',
  to: 'user@example.com',
  data: {
    name: 'John Doe',
    loginUrl: 'https://app.example.com/login',
    companyName: 'Acme Corp'
  }
})
```

### 2. Password Reset

Sent when a user requests a password reset.

**Template:** `password-reset`

**Required Fields:**
- `name` - User's name
- `resetUrl` - Password reset link

**Optional Fields:**
- `expiresIn` - How long link is valid (default: "1 hour")

**Example:**

```typescript
await emailService.sendTemplate({
  template: 'password-reset',
  to: 'user@example.com',
  data: {
    name: 'John Doe',
    resetUrl: 'https://app.example.com/reset?token=abc123',
    expiresIn: '30 minutes'
  }
})
```

### 3. Magic Link

Passwordless login link.

**Template:** `magic-link`

**Required Fields:**
- `loginUrl` - Magic link URL

**Optional Fields:**
- `name` - User's name
- `expiresIn` - How long link is valid (default: "15 minutes")
- `ipAddress` - IP address of request

**Example:**

```typescript
await emailService.sendTemplate({
  template: 'magic-link',
  to: 'user@example.com',
  data: {
    name: 'John Doe',
    loginUrl: 'https://app.example.com/auth/magic?token=xyz789',
    expiresIn: '10 minutes',
    ipAddress: '192.168.1.1'
  }
})
```

### 4. API Key Generated

Sent when a new API key is created.

**Template:** `apikey`

**Required Fields:**
- `name` - User's name
- `apiKey` - The API key
- `createdAt` - When key was created

**Optional Fields:**
- `expiresAt` - When key expires

**Example:**

```typescript
await emailService.sendTemplate({
  template: 'apikey',
  to: 'user@example.com',
  data: {
    name: 'John Doe',
    apiKey: 'sk_live_abc123xyz789',
    createdAt: '2025-10-02',
    expiresAt: '2026-10-02'
  }
})
```

### 5. Team Invite

Sent when a user is invited to join a team/organization.

**Template:** `invite`

**Required Fields:**
- `inviterName` - Name of person sending invite
- `organizationName` - Name of organization
- `inviteUrl` - Invitation acceptance link

**Optional Fields:**
- `role` - Role user will have
- `expiresIn` - How long invite is valid (default: "7 days")

**Example:**

```typescript
await emailService.sendTemplate({
  template: 'invite',
  to: 'newuser@example.com',
  data: {
    inviterName: 'Jane Smith',
    organizationName: 'Acme Corp',
    inviteUrl: 'https://app.example.com/invite?code=inv123',
    role: 'Admin',
    expiresIn: '14 days'
  }
})
```

### 6. Notification

General purpose notification email.

**Template:** `notification`

**Required Fields:**
- `title` - Notification title
- `message` - Notification message (HTML supported)

**Optional Fields:**
- `actionUrl` - Link to take action
- `actionText` - Text for action button (default: "View Details")

**Example:**

```typescript
await emailService.sendTemplate({
  template: 'notification',
  to: 'user@example.com',
  data: {
    title: 'Your report is ready',
    message: '<p>Your monthly analytics report has been generated and is ready to view.</p>',
    actionUrl: 'https://app.example.com/reports/123',
    actionText: 'View Report'
  }
})
```

### 7. Email Verification

Sent to verify a user's email address.

**Template:** `verification`

**Required Fields:**
- `name` - User's name
- `verificationUrl` - Email verification link

**Optional Fields:**
- `code` - Verification code (if using code-based verification)
- `expiresIn` - How long link is valid (default: "24 hours")

**Example:**

```typescript
await emailService.sendTemplate({
  template: 'verification',
  to: 'user@example.com',
  data: {
    name: 'John Doe',
    verificationUrl: 'https://app.example.com/verify?token=ver123',
    code: '123456',
    expiresIn: '48 hours'
  }
})
```

## API Reference

### RPC Interface

Use for service-to-service communication:

```typescript
// Get email service binding
const emailService = env.EMAIL_SERVICE

// Send raw email
const result = await emailService.send({
  to: 'user@example.com',
  from: 'noreply@services.do',
  subject: 'Hello!',
  html: '<p>Hello world</p>',
  text: 'Hello world'
})

// Send templated email
const result = await emailService.sendTemplate({
  template: 'welcome',
  to: 'user@example.com',
  data: {
    name: 'John Doe',
    loginUrl: 'https://app.example.com/login'
  }
})

// Get email status
const status = await emailService.getEmailStatus('email-id')

// List emails for user
const { emails, total } = await emailService.listEmails({
  userId: 'user-123',
  limit: 50,
  status: 'delivered'
})

// List available templates
const templates = await emailService.getTemplates()

// Get specific template
const template = await emailService.getTemplate('welcome')
```

### HTTP API

Use for direct HTTP access:

#### Send Email

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
```

#### Send Templated Email

```bash
POST /templates/welcome
Content-Type: application/json

{
  "to": "user@example.com",
  "data": {
    "name": "John Doe",
    "loginUrl": "https://app.example.com/login"
  },
  "from": "noreply@services.do",
  "userId": "user-123"
}
```

#### Get Email Status

```bash
GET /status/:id
```

#### List Emails

```bash
GET /history?userId=user-123&limit=50&status=delivered&template=welcome
```

#### List Templates

```bash
GET /templates
```

#### Get Template Details

```bash
GET /templates/welcome
```

### Webhooks

#### Resend Delivery Status

The service handles Resend webhooks to track email delivery status:

```bash
POST /webhooks/resend
Content-Type: application/json

{
  "type": "email.delivered",
  "data": {
    "email_id": "abc123",
    "from": "noreply@services.do",
    "to": ["user@example.com"],
    "subject": "Hello!",
    "created_at": "2025-10-02T12:00:00Z"
  }
}
```

**Webhook Events:**
- `email.sent` - Email sent to provider
- `email.delivered` - Email delivered to recipient
- `email.opened` - Recipient opened email
- `email.clicked` - Recipient clicked link in email
- `email.bounced` - Email bounced
- `email.complained` - Recipient marked as spam

## Email Providers

### Resend (Primary)

**Features:**
- Simple REST API
- Email tracking (opens, clicks)
- Webhooks for delivery status
- Generous free tier (100 emails/day)
- Built-in spam protection

**Configuration:**

```bash
wrangler secret put RESEND_API_KEY
```

**Usage:**

```typescript
await emailService.send(message, { provider: 'resend' })
```

### WorkOS (Magic Links)

**Features:**
- Passwordless authentication
- Magic link emails
- Enterprise SSO support

**Configuration:**

```bash
wrangler secret put WORKOS_API_KEY
```

**Usage:**

```typescript
await emailService.sendTemplate({
  template: 'magic-link',
  to: 'user@example.com',
  data: { loginUrl: 'https://app.example.com/auth' },
  provider: 'workos'
})
```

### SendGrid (Future)

Planned support for SendGrid as an alternative provider.

## Database Schema

Email logs are stored in PostgreSQL:

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
  bounced_at TIMESTAMP
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_template ON email_logs(template);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
```

## Testing

Run the test suite:

```bash
pnpm test
```

**Test Coverage:**
- ✅ Provider validation
- ✅ Template rendering
- ✅ Email address parsing
- ✅ HTML sanitization
- ✅ Service methods
- ✅ Error handling

## Architecture

```
EmailService (RPC)
├── Providers
│   ├── ResendProvider
│   ├── WorkOSProvider
│   └── SendGridProvider (future)
├── Templates
│   ├── welcome.ts
│   ├── reset.ts
│   ├── magic-link.ts
│   ├── apikey.ts
│   ├── invite.ts
│   ├── notification.ts
│   └── verification.ts
├── HTTP API (Hono)
│   ├── POST /send
│   ├── POST /templates/:name
│   ├── GET /status/:id
│   ├── GET /history
│   ├── GET /templates
│   └── POST /webhooks/resend
└── Database Logging
    └── PostgreSQL via DB service
```

## Security

- **API Key Protection** - Secrets stored in Wrangler secrets
- **HTML Sanitization** - XSS prevention in user-provided content
- **Rate Limiting** - Max 100 emails/hour per user (recommended)
- **Email Validation** - Format validation for all addresses
- **Webhook Verification** - Signature verification for Resend webhooks

## Best Practices

### Use Templates

Always use templates for consistent branding:

```typescript
// Good
await emailService.sendTemplate({
  template: 'welcome',
  to: user.email,
  data: { name: user.name, loginUrl: '...' }
})

// Avoid
await emailService.send({
  to: user.email,
  subject: 'Welcome!',
  html: '<p>Welcome...</p>' // Inconsistent formatting
})
```

### Track User IDs

Always include userId for analytics:

```typescript
await emailService.sendTemplate({
  template: 'welcome',
  to: user.email,
  data: { ... },
  userId: user.id // Important for tracking
})
```

### Handle Failures Gracefully

```typescript
const result = await emailService.send(message)

if (result.status === 'failed') {
  console.error('Email failed:', result.error)
  // Retry or notify admin
}
```

## Troubleshooting

### Email not sending

1. Check API key is set: `wrangler secret list`
2. Verify provider configuration
3. Check email logs: `GET /history`
4. Review error messages in response

### Template not found

1. Verify template name: `GET /templates`
2. Check spelling matches exactly
3. Ensure required fields are provided

### Webhook not working

1. Verify webhook URL is public
2. Check Resend dashboard webhook configuration
3. Review webhook logs in Resend
4. Ensure signature verification is working

## License

MIT

## Support

For issues or questions, contact the platform team or open an issue in the repository.
