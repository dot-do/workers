# Waitlist & Beta Management Service

Manages launch waitlist, beta invitations, and early access for the .do platform.

## Features

- **Waitlist Management**: Public signup, priority scoring, analytics
- **Beta Invitations**: Generate and send invites, track acceptance
- **Priority Scoring**: Intelligent scoring based on multiple factors
- **Email Integration**: Automated welcome and invitation emails
- **Queue Processing**: Async email sending and invitation expiration
- **Analytics**: Real-time waitlist stats and conversion tracking

## Priority Scoring System

Each waitlist entry receives a priority score (0-100) based on:

- **Has Referral Code** (+20 points): Was referred by existing user
- **Early Signup** (+15 points): First 100 signups
- **Has Company** (+10 points): Provided company name
- **Has Use Case** (+10 points): Described their use case
- **Source Quality** (0-20 points): Based on signup source
  - Twitter/X: 20 points
  - LinkedIn: 18 points
  - Product Hunt/HN: 15 points
  - Reddit: 12 points
  - Blog: 10 points
  - Email: 8 points
  - Other: 5 points
- **Referral Count** (+5 per referral, max 25): Bonus for referring others

Higher scores get earlier access to beta.

## RPC Interface

```typescript
// Add someone to waitlist
const entry = await env.WAITLIST_SERVICE.addToWaitlist({
  email: 'user@example.com',
  name: 'Jane Doe',
  company: 'Acme Corp',
  role: 'CTO',
  useCase: 'Building automation platform',
  source: 'twitter',
  referralCode: 'john@example.com',
})

// Generate beta invitations
const result = await env.WAITLIST_SERVICE.generateInvites({
  count: 50, // Send to top 50
  priorityThreshold: 70, // Min priority score
  dryRun: false, // Actually send
})

// Check if invite code is valid
const check = await env.WAITLIST_SERVICE.checkInvite({
  inviteCode: 'ABC123XYZ789',
})

// Accept invitation
const invitation = await env.WAITLIST_SERVICE.acceptInvite({
  inviteCode: 'ABC123XYZ789',
  userId: 'user_123', // Optional: link to user account
})

// Get analytics
const analytics = await env.WAITLIST_SERVICE.getAnalytics()
// Returns: { total, byStatus, bySource, averagePriorityScore, conversionRate, topReferrers }
```

## HTTP API

### Public Endpoints

**POST /waitlist** - Join waitlist

```bash
curl -X POST https://waitlist.do/waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "Jane Doe",
    "company": "Acme Corp",
    "useCase": "Building automation platform",
    "source": "twitter"
  }'
```

**GET /invitations/check/:code** - Check invite code

```bash
curl https://waitlist.do/invitations/check/ABC123XYZ789
```

**POST /invitations/accept** - Accept invitation

```bash
curl -X POST https://waitlist.do/invitations/accept \
  -H "Content-Type: application/json" \
  -d '{ "inviteCode": "ABC123XYZ789" }'
```

### Admin Endpoints

**GET /waitlist** - Get waitlist entries

```bash
curl https://waitlist.do/waitlist?status=pending&minPriority=70&limit=100
```

**POST /invitations/generate** - Generate invitations

```bash
curl -X POST https://waitlist.do/invitations/generate \
  -H "Content-Type: application/json" \
  -d '{ "count": 50, "priorityThreshold": 70, "dryRun": false }'
```

**GET /analytics** - Get waitlist analytics

```bash
curl https://waitlist.do/analytics
```

## Queue Messages

The service processes three types of queue messages:

```typescript
// Send invitation email
{ type: 'send_invitation', invitationId: 'ulid' }

// Send reminder (2 days before expiry)
{ type: 'send_reminder', invitationId: 'ulid' }

// Expire old invitations (cron)
{ type: 'expire_invitations' }
```

## Database Schema

### waitlist_entries

```sql
CREATE TABLE waitlist_entries (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  role TEXT,
  use_case TEXT,
  source TEXT,
  referral_code TEXT,
  priority_score INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_up_at TEXT NOT NULL,
  invited_at TEXT,
  converted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_waitlist_email ON waitlist_entries(email);
CREATE INDEX idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX idx_waitlist_priority ON waitlist_entries(priority_score DESC, signed_up_at ASC);
```

### beta_invitations

```sql
CREATE TABLE beta_invitations (
  id TEXT PRIMARY KEY,
  waitlist_entry_id TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  rejected_at TEXT,
  reminder_sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (waitlist_entry_id) REFERENCES waitlist_entries(id)
);

CREATE INDEX idx_invitation_code ON beta_invitations(invite_code);
CREATE INDEX idx_invitation_status ON beta_invitations(status);
CREATE INDEX idx_invitation_expires ON beta_invitations(expires_at);
```

## Email Templates

The service sends three types of emails:

1. **Waitlist Welcome** - Confirmation email when joining waitlist
2. **Beta Invitation** - Invitation code and access link
3. **Reminder** - Reminder 2 days before invitation expires

All emails are sent via the email service using queue processing.

## Workflows

### Invitation Flow

1. User signs up to waitlist (public endpoint)
2. Priority score calculated automatically
3. Admin generates invitations (selects top N by priority)
4. Invitation emails queued and sent
5. User receives invitation with unique code
6. User accepts invitation (redeems code)
7. Waitlist entry updated to "accepted"
8. Analytics tracked

### Reminder Flow

Scheduled task (cron) checks for invitations expiring in 2 days that haven't been accepted and sends reminder emails.

### Expiration Flow

Scheduled task (cron) finds expired invitations (past `expiresAt`) and updates status to "expired".

## Integration

### With Email Service

```typescript
// Send waitlist welcome
await env.EMAIL_SERVICE.send({
  to: entry.email,
  template: 'waitlist-welcome',
  data: { name, position, totalWaitlist },
})

// Send invitation
await env.EMAIL_SERVICE.send({
  to: entry.email,
  template: 'beta-invitation',
  data: { name, inviteCode, inviteUrl, expiresAt },
})
```

### With Analytics Service

```typescript
// Track signup
await env.ANALYTICS_SERVICE.track({
  event: 'waitlist_signup',
  properties: { email, source, priorityScore },
})

// Track invitation
await env.ANALYTICS_SERVICE.track({
  event: 'invitation_accepted',
  properties: { email, invitationId },
})
```

### With Auth Service

```typescript
// Link invitation to user account
await env.AUTH_SERVICE.linkInvitation({
  userId: 'user_123',
  invitationId: 'invitation_456',
})
```

## Deployment

```bash
# Development
pnpm dev

# Production
pnpm deploy

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Environment Variables

None required - all configuration via service bindings.

## Service Bindings

- `DB` - D1 database
- `KV` - KV namespace (unused currently, reserved for rate limiting)
- `EMAIL_SERVICE` - Email service
- `ANALYTICS_SERVICE` - Analytics service
- `AUTH_SERVICE` - Auth service
- `WAITLIST_QUEUE` - Queue for async processing

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test -- --coverage
```

## Success Metrics

- **Week 1**: 100+ signups, <5% invalid emails
- **Invite Acceptance**: >30% acceptance rate
- **Conversion Time**: <48 hours from invite to acceptance
- **Priority Accuracy**: Top 20% of priority scores → 80%+ acceptance rate

## Related Services

- **email** - Sends transactional emails
- **analytics** - Tracks events and metrics
- **auth** - User authentication and accounts
- **referral-program** - Referral tracking (integrates with waitlist)
