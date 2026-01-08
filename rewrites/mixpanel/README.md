# mixpanel.do

> The user analytics platform. Now open source. AI-native.

Mixpanel pioneered event-based analytics. But at $24/month per 1k MTUs on Growth, with advanced features requiring Enterprise pricing, and costs that explode at scale, it's time for a new approach.

**mixpanel.do** reimagines user analytics for the AI era. Unlimited events. Unlimited users. Zero MTU pricing.

## AI-Native API

```typescript
import { mixpanel } from 'mixpanel.do'           // Full SDK
import { mixpanel } from 'mixpanel.do/tiny'      // Minimal client
import { mixpanel } from 'mixpanel.do/analytics' // Analytics-only
```

Natural language for user analytics:

```typescript
import { mixpanel } from 'mixpanel.do'

// Talk to it like an analyst
const signups = await mixpanel`how many users signed up this week?`
const churn = await mixpanel`which users are likely to churn this month?`
const insight = await mixpanel`why are mobile users converting better than web?`

// Chain insights into product strategy
await mixpanel`identify our power users`
  .map(users => mixpanel`what behaviors drive retention in ${users}`)
  .map(behaviors => priya`design features that encourage ${behaviors}`)

// Funnels that document themselves
await mixpanel`show me the path from landing page to purchase within 7 days`
  .breakdown(`by platform and signup method`)
  .export()
```

## The Problem

Mixpanel built a user analytics empire on:

- **Per-MTU pricing** - $24/month per 1,000 MTUs on Growth plan
- **Event volume limits** - Premium plans for high-volume tracking
- **Feature gating** - Group analytics, data pipelines, SSO on Enterprise
- **Historical data limits** - Only 12 months on Growth, more on Enterprise
- **Identity management** - Advanced ID merge requires higher tiers
- **Data export limits** - Raw data access restricted by plan

At 1 million MTUs? **$24,000/month**. That's **$288,000/year** just for analytics.

## The Solution

**mixpanel.do** is Mixpanel reimagined:

```
Traditional Mixpanel            mixpanel.do
-----------------------------------------------------------------
$24/1k MTUs/month              $0 - run your own
Event volume limits            Unlimited events
Group analytics (Enterprise)   Group analytics (free)
12 months history (Growth)     Unlimited history
ID merge (advanced)            Full identity resolution
Raw export (limited)           Your data, always yours
```

## One-Click Deploy

```bash
npx create-dotdo mixpanel
```

Your own Mixpanel instance. Running on Cloudflare. Zero MTU fees.

```typescript
import { Mixpanel } from 'mixpanel.do'

export default Mixpanel({
  name: 'my-product',
  domain: 'analytics.myproduct.com',
})
```

## Features

### Event Analytics

```typescript
// Just ask
const results = await mixpanel`purchase events by product and platform in Q1`
const trends = await mixpanel`signups and purchases daily this quarter`
const topEvents = await mixpanel`top 20 events this quarter`

// AI infers what you need
await mixpanel`signups this week`               // returns count
await mixpanel`signups this week vs last week`  // returns comparison
await mixpanel`signups by platform this week`   // returns breakdown
```

### Funnels

```typescript
// Natural funnel definitions
const funnel = await mixpanel`show me the path from landing page to purchase within 7 days`
const activation = await mixpanel`signup to first purchase funnel by signup method`
const onboarding = await mixpanel`landing -> signup -> onboarding -> first action`

// Chain for deeper analysis
await mixpanel`signup to purchase funnel`
  .breakdown(`by platform`)
  .compare(`this month vs last month`)
```

### Retention

```typescript
// Ask naturally
const retention = await mixpanel`weekly retention for January signups`
const comparison = await mixpanel`retention by plan type this quarter`
const stickiness = await mixpanel`how sticky are pro users vs free users?`

// Find what drives retention
await mixpanel`which features predict 30-day retention?`
```

### User Flows

```typescript
// Forward and backward paths
const afterSignup = await mixpanel`what do users do after signup?`
const beforePurchase = await mixpanel`what leads to purchase?`
const topPaths = await mixpanel`most common paths from app open to purchase`

// Find drop-off points
await mixpanel`where do users drop off in onboarding?`
```

### Cohorts

```typescript
// Define users naturally
const powerUsers = await mixpanel`users who used features 10+ times this week`
const churning = await mixpanel`users who signed up but never purchased`
const whales = await mixpanel`users with lifetime value over $1000`

// Analyze cohorts
await mixpanel`${powerUsers} breakdown by plan and country`
await mixpanel`what do ${powerUsers} have in common?`
```

### Group Analytics

```typescript
// Company-level analysis
const accounts = await mixpanel`enterprise accounts with 10+ active users`
const accountFunnel = await mixpanel`account journey from trial to paid`
const health = await mixpanel`account health scores this quarter`

// Account-based insights
await mixpanel`which accounts are at risk of churning?`
await mixpanel`what features do healthy accounts use?`
```

### Formulas

```typescript
// Computed metrics naturally
const activation = await mixpanel`activation rate this quarter`
const arpu = await mixpanel`average revenue per user by month`
const ltv = await mixpanel`customer lifetime value by cohort`

// Compare metrics
await mixpanel`activation rate this week vs last week`
await mixpanel`ARPU trend over the last 6 months`
```

## AI-Native Features

### Natural Language Queries

```typescript
// Just ask questions
const q1 = await mixpanel`how many users signed up this week?`
const q2 = await mixpanel`what is the conversion from signup to purchase?`
const q3 = await mixpanel`which platform has better retention?`
const q4 = await mixpanel`why did signups drop last Tuesday?`

// AI infers the right analysis type
await mixpanel`show me signup trends`           // timeseries
await mixpanel`compare iOS vs Android`          // comparison
await mixpanel`what drives purchases?`          // correlation analysis
```

### AI Insights

```typescript
// AI surfaces what matters
const insights = await mixpanel`what should I know about the last 30 days?`

// Or focus on specific areas
await mixpanel`activation insights this month`
await mixpanel`revenue risks this quarter`
await mixpanel`what changed since last week?`

// Chain insights into action
await mixpanel`why is mobile activation dropping?`
  .map(diagnosis => priya`design experiments to fix ${diagnosis}`)
```

### Anomaly Detection

```typescript
// Natural alert definitions
await mixpanel`alert me when signups drop unexpectedly`
await mixpanel`notify #analytics if daily revenue < $10k`
await mixpanel`watch for unusual churn patterns`

// Automatic anomaly surfacing
await mixpanel`any anomalies this week?`
await mixpanel`what's abnormal about today's metrics?`
```

### AI Agents as Analysts

```typescript
import { priya, quinn } from 'agents.do'
import { mixpanel } from 'mixpanel.do'

// Product manager analyzes activation
const activation = await priya`analyze our activation flow`
  .using(mixpanel)
  .recommend(`improvements`)

// QA finds UX issues
const uxIssues = await quinn`find user frustration patterns`
  .using(mixpanel)
  .prioritize(`by user impact`)
```

## Architecture

### Event Pipeline

```
Client SDK  -->  Edge Worker  -->  EventDO  -->  Storage
                     |
              +------+------+
              |             |
         Validation    Enrichment
         (Schema)      (GeoIP, UA)
              |             |
              +------+------+
                     |
                  Buffer
                     |
              +------+------+
              |             |
           SQLite     Analytics
           (Hot)       Engine
```

### Durable Objects

```
                    +------------------------+
                    |   mixpanel.do Worker   |
                    |   (API + Ingestion)    |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | UserDO           | | EventDO          | | QueryDO          |
    | (Profiles)       | | (Event Store)    | | (Analytics)      |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    |    D1    |       |     R2    |        | Analytics  |
    | (Users)  |       | (Events)  |        | Engine     |
    +----------+       +-----------+        +------------+
```

### Identity Resolution

Cross-device tracking with natural language:

```typescript
// Merge identities naturally
await mixpanel`link user-123 with anon-abc`
await mixpanel`merge user-123 user-456 user-789`

// Query identity graph
await mixpanel`all devices for user-123`
await mixpanel`who is anon-abc?`
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Last 30 days, active queries | <10ms |
| **Warm** | R2 + SQLite Index | Historical (30d-1y) | <100ms |
| **Cold** | R2 Archive | Compliance retention (1y+) | <1s |

## SDKs

All SDKs auto-configure with environment detection:

```typescript
// Browser
import { mixpanel } from 'mixpanel.do/browser'
mixpanel.track('Signup', { method: 'google' })

// React
import { useTrack } from 'mixpanel.do/react'
const track = useTrack()
track('Click', { button: 'cta' })

// Node.js
import { mixpanel } from 'mixpanel.do/node'
mixpanel.track('Server Event', { userId: 'user-123' })
```

Mobile SDKs for iOS (Swift) and Android (Kotlin) included.

## Migration from Mixpanel

### Export Your Data

```bash
# Export from Mixpanel
mixpanel-export --project YOUR_PROJECT --from 2024-01-01 --to 2024-03-31

# Import to mixpanel.do
npx mixpanel-migrate import ./export.json
```

### API Compatibility

Drop-in replacement for Mixpanel HTTP API:

```
Endpoint                        Status
-----------------------------------------------------------------
POST /track                     Supported
POST /engage                    Supported
POST /groups                    Supported
POST /import                    Supported
GET /jql                        Supported
GET /segmentation               Supported
GET /retention                  Supported
GET /funnels                    Supported
GET /export                     Supported
```

## Reporting & Dashboards

```typescript
// Create dashboards naturally
const dashboard = await mixpanel`create Product Metrics dashboard`
  .add(`daily active users vs last week`)
  .add(`signup to purchase funnel`)
  .add(`weekly retention by cohort`)
  .add(`signups over time`)

// Query dashboards
await mixpanel`refresh Product Metrics dashboard`
await mixpanel`share Product Metrics with team@company.com`

// Scheduled reports
await mixpanel`email me Product Metrics every Monday 9am`
```

## Roadmap

- [x] Event tracking (browser, Node, React, iOS, Android)
- [x] Funnel analysis
- [x] Retention analysis
- [x] Cohort builder
- [x] User flows
- [x] Group analytics
- [x] Natural language queries
- [ ] JQL (JavaScript Query Language)
- [ ] Custom alerts
- [ ] Session replay
- [ ] Impact reports
- [ ] Data pipelines

## vs Mixpanel

| Feature | Mixpanel | mixpanel.do |
|---------|----------|-------------|
| **Pricing** | $24/1k MTUs/month | $0 - run your own |
| **History** | 12 months (Growth) | Unlimited |
| **Group Analytics** | Enterprise only | Free |
| **Identity Resolution** | Advanced tiers | Full, free |
| **Data Export** | Limited by plan | Your data, always |
| **AI Features** | Limited | Native, unlimited |
| **Data Location** | Mixpanel's servers | Your Cloudflare account |
| **Lock-in** | Vendor dependent | MIT licensed |

## Why Open Source?

User analytics shouldn't cost $288k/year at scale:

1. **Your events** - User behavior data is your product's DNA
2. **Your profiles** - User data shouldn't be locked in a vendor
3. **Your scale** - Success shouldn't mean exponential analytics costs
4. **Your analysis** - Advanced features shouldn't require Enterprise plans

Mixpanel showed the world what event analytics could be. **mixpanel.do** makes it accessible to everyone.

## License

MIT License - Use it however you want. Track all users. Analyze everything.

---

<p align="center">
  <strong>The $288k/year analytics tax ends here.</strong>
  <br />
  Unlimited events. Natural language. AI-native.
  <br /><br />
  <a href="https://mixpanel.do">Website</a> |
  <a href="https://docs.mixpanel.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/mixpanel.do">GitHub</a>
</p>
