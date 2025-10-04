# Referral Program Service

Manages referral codes, tracking, rewards distribution, and viral growth mechanics with tiered benefits.

## Features

- **Referral Code Generation**: Unique codes for each user
- **Referral Tracking**: Track who referred whom
- **Conversion Tracking**: When referred users sign up
- **Tiered Rewards**: 5 tiers with increasing multipliers (Bronze → Diamond)
- **Leaderboard**: Top referrers by timeframe
- **Analytics**: Viral coefficient, conversion rates, distribution
- **Fraud Detection**: Basic fraud checks for suspicious patterns
- **Queue Processing**: Async reward distribution and tier updates

## Tier System

| Tier | Min Referrals | Multiplier | Bonus | Badge |
|------|--------------|------------|-------|-------|
| 🥉 Bronze | 0 | 1.0x | None | Base benefits |
| 🥈 Silver | 5 | 1.2x | 20% | Priority support |
| 🥇 Gold | 15 | 1.5x | 50% | Early feature access |
| 💎 Platinum | 30 | 2.0x | 2x | VIP support, featured |
| 💎✨ Diamond | 50+ | 3.0x | 3x | Direct team access, partnership |

## Reward Calculation

**Base Reward**: 100 credits per successful referral

**Tier Multiplier**: Applied based on referrer's current tier

**Examples**:
- Bronze tier (1.0x): 100 credits
- Silver tier (1.2x): 120 credits
- Gold tier (1.5x): 150 credits
- Platinum tier (2.0x): 200 credits
- Diamond tier (3.0x): 300 credits

## RPC Interface

```typescript
// Generate referral code
const code = await env.REFERRAL_SERVICE.generateReferralCode({
  userId: 'user_123',
  email: 'john@example.com',
  name: 'John Doe',
  customCode: 'johnspecial', // Optional
})

// Track referral (when someone uses a code)
const referral = await env.REFERRAL_SERVICE.trackReferral({
  referralCode: 'johndoe7abc',
  referredEmail: 'jane@example.com',
  source: 'waitlist', // Optional
})

// Convert referral (when referred user signs up)
const converted = await env.REFERRAL_SERVICE.convertReferral({
  referredEmail: 'jane@example.com',
  referredUserId: 'user_456',
})

// Get user stats
const stats = await env.REFERRAL_SERVICE.getUserStats('user_123')
// Returns: { referralCode, totalReferrals, successfulReferrals, creditsEarned, tier, nextTierAt, ... }

// Get leaderboard
const leaderboard = await env.REFERRAL_SERVICE.getLeaderboard({
  timeframe: 'month', // day, week, month, alltime
  limit: 10,
})

// Get analytics
const analytics = await env.REFERRAL_SERVICE.getAnalytics()
// Returns: { totalReferrals, conversionRate, viralCoefficient, totalCreditsDistributed, ... }
```

## HTTP API

### Generate Referral Code (Authenticated)

```bash
POST /codes/generate
{
  "userId": "user_123",
  "email": "john@example.com",
  "name": "John Doe"
}

# Response
{
  "success": true,
  "data": {
    "id": "01J1234...",
    "code": "johndoe7abc",
    "userId": "user_123",
    "status": "active",
    "tier": "bronze"
  }
}
```

### Track Referral (Public)

```bash
POST /referrals/track
{
  "referralCode": "johndoe7abc",
  "referredEmail": "jane@example.com",
  "source": "waitlist"
}

# Response
{
  "success": true,
  "data": {
    "id": "01J5678...",
    "referrerUserId": "user_123",
    "referredEmail": "jane@example.com",
    "status": "pending",
    "rewardAmount": 100
  }
}
```

### Convert Referral (Internal)

```bash
POST /referrals/convert
{
  "referredEmail": "jane@example.com",
  "referredUserId": "user_456"
}

# Response
{
  "success": true,
  "data": {
    "status": "converted",
    "convertedAt": "2025-10-03T14:30:00Z"
  }
}
```

### Get User Stats (Authenticated)

```bash
GET /stats/user_123

# Response
{
  "success": true,
  "data": {
    "referralCode": "johndoe7abc",
    "totalReferrals": 12,
    "successfulReferrals": 8,
    "conversionRate": 67,
    "creditsEarned": 960,
    "tier": "silver",
    "nextTierAt": 7
  }
}
```

### Get Leaderboard (Public)

```bash
GET /leaderboard?timeframe=month&limit=10

# Response
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "email": "top@referrer.com",
      "referralCount": 42,
      "creditsEarned": 6300,
      "tier": "platinum",
      "badge": "💎"
    },
    ...
  ]
}
```

### Get Analytics (Admin)

```bash
GET /analytics

# Response
{
  "success": true,
  "data": {
    "totalReferrals": 1250,
    "totalConverted": 875,
    "conversionRate": 70.0,
    "viralCoefficient": 2.3,
    "totalCreditsDistributed": 125000,
    "byStatus": { "pending": 150, "converted": 875, "credited": 800 },
    "topReferrers": [...]
  }
}
```

## Queue Messages

The service processes three types of queue messages:

```typescript
// Distribute reward (after conversion)
{ type: 'distribute_reward', referralId: 'ulid' }

// Check for fraud
{ type: 'check_fraud', referralId: 'ulid' }

// Update user's tier
{ type: 'update_tier', userId: 'user_123' }
```

## Database Schema

### referral_codes

```sql
CREATE TABLE referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  referral_count INTEGER NOT NULL DEFAULT 0,
  successful_referrals INTEGER NOT NULL DEFAULT 0,
  credits_earned INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_tier ON referral_codes(tier);
CREATE INDEX idx_referral_codes_referrals ON referral_codes(successful_referrals DESC);
```

### referrals

```sql
CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  referral_code_id TEXT NOT NULL,
  referrer_user_id TEXT NOT NULL,
  referred_user_id TEXT,
  referred_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT,
  referred_at TEXT NOT NULL,
  converted_at TEXT,
  credited_at TEXT,
  reward_amount INTEGER NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id)
);

CREATE INDEX idx_referrals_code ON referrals(referral_code_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX idx_referrals_email ON referrals(referred_email);
CREATE INDEX idx_referrals_status ON referrals(status);
```

## Workflow Integration

### With Waitlist Service

When someone joins waitlist with a referral code:

```typescript
// 1. Track the referral
await env.REFERRAL_SERVICE.trackReferral({
  referralCode: waitlistEntry.referralCode,
  referredEmail: waitlistEntry.email,
  source: 'waitlist',
})

// 2. Boost their priority score (+20 points)
waitlistEntry.priorityScore += 20

// 3. Boost referrer's priority score (+5 points)
await env.WAITLIST_SERVICE.incrementReferrerScore(waitlistEntry.referralCode)
```

### With Auth Service

When referred user signs up:

```typescript
// Convert the referral
await env.REFERRAL_SERVICE.convertReferral({
  referredEmail: user.email,
  referredUserId: user.id,
})

// Queue reward distribution and tier update
// (handled automatically by the service)
```

## Fraud Detection

Basic fraud checks for suspicious patterns:

```typescript
interface FraudCheck {
  rapidReferrals: boolean // >10 referrals in 1 hour
  sameIP: boolean // Multiple referrals from same IP
  disposableEmail: boolean // Using temp email services
  suspiciousPattern: boolean // Bot-like behavior
}
```

**Actions on Fraud**:
- Mark referral as `fraudulent`
- No rewards distributed
- Referrer flagged for review
- Alert administrators

## Analytics

### Viral Coefficient

**Formula**: `totalReferrals / totalUsers`

**Target**: >1.0 (each user brings 1+ more users)

**Interpretation**:
- 1.0: Each user brings 1 friend (break-even)
- 1.5: Each user brings 1.5 friends (good growth)
- 2.0+: Each user brings 2+ friends (viral)

### Conversion Rate

**Formula**: `convertedReferrals / totalReferrals * 100`

**Target**: >50%

**Interpretation**:
- <30%: Low quality referrals
- 30-50%: Average quality
- 50-70%: Good quality
- >70%: Excellent targeting

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
- `KV` - KV namespace for caching
- `EMAIL_SERVICE` - Email service
- `ANALYTICS_SERVICE` - Analytics service
- `AUTH_SERVICE` - Auth service
- `WAITLIST_SERVICE` - Waitlist service
- `REFERRAL_QUEUE` - Queue for async processing

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

**Week 1**:
- 50+ referral codes generated
- Viral coefficient >1.0
- Conversion rate >40%

**Month 1**:
- 500+ referral codes
- Viral coefficient >1.5
- 100+ users at Silver+ tier
- Conversion rate >50%

**Month 3**:
- 2,000+ referral codes
- Viral coefficient >2.0
- 50+ users at Gold+ tier
- 5+ users at Diamond tier
- Conversion rate >60%

## Related Services

- **waitlist-beta-management** - Waitlist with referral integration
- **auth** - User authentication and signup
- **email** - Notification emails
- **analytics** - Referral metrics tracking
