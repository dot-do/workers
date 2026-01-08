# amplitude.do

> Product Analytics. Edge-Native. Open by Default. AI-First.

Amplitude built a $50k+/year product analytics empire. Per-MTU pricing that explodes at scale. Behavioral cohorts locked behind Growth tier. Experiments gated to Enterprise. Data retention capped. Your own data held hostage.

**amplitude.do** is the open-source alternative. Zero MTU pricing. Unlimited events. AI-powered insights. Deploys in minutes, not sales calls.

## AI-Native API

```typescript
import { amplitude } from 'amplitude.do'           // Full SDK
import { amplitude } from 'amplitude.do/tiny'      // Minimal client
import { amplitude } from 'amplitude.do/analytics' // Analytics only
```

Natural language for product analytics:

```typescript
import { amplitude } from 'amplitude.do'

// Talk to it like a PM
const funnel = await amplitude`signup to purchase funnel this month`
const cohort = await amplitude`power users: 10+ sessions this week`
const drop = await amplitude`why did signups drop last Tuesday?`

// Chain like sentences
await amplitude`users who signed up but never purchased`
  .notify(`Complete your first purchase for 20% off`)

// Events that capture themselves
await amplitude`user-123 clicked signup button`
await amplitude`sarah@acme.com upgraded to pro plan`
await amplitude`track pageview /dashboard for user-456`
```

## The Problem

Amplitude dominates product analytics with aggressive pricing:

| What Amplitude Charges | The Reality |
|------------------------|-------------|
| **Per-MTU Pricing** | Costs explode with success |
| **Growth Plan** | $50k+/year minimum |
| **Enterprise Plan** | $100k+/year+ |
| **Behavioral Cohorts** | Locked behind Growth tier |
| **Predictions** | Enterprise only |
| **Experiments** | Enterprise only |
| **Data Retention** | Capped by tier |

### The MTU Tax

10 million Monthly Tracked Users? You're paying $100k+/year. And that's before:

- Behavioral cohorts
- Churn predictions
- A/B experiments
- Raw data export
- SSO/SAML

Every successful feature launch increases your analytics bill.

### The Feature Lock

The most valuable analytics capabilities are paywalled:

- **Behavioral cohorts** - Define users by what they do, not who they are
- **Predictions** - Churn risk, conversion likelihood, LTV
- **Experiments** - A/B testing with statistical rigor
- **Root cause** - AI explaining why metrics changed

Growth companies need these most. Amplitude charges them extra.

## The Solution

**amplitude.do** reimagines product analytics:

```
Amplitude                       amplitude.do
-----------------------------------------------------------------
Per-MTU pricing                 Flat: pay for storage, not users
$50k/year Growth                $0 - run your own
Behavioral cohorts (paid)       Behavioral cohorts (free)
Limited data retention          Unlimited (R2 storage)
Identity resolution (extra)     Built-in identity graph
Raw data export (premium)       Your data, always accessible
```

## One-Click Deploy

```bash
npx create-dotdo amplitude
```

Your own Amplitude instance. Running on Cloudflare. Zero MTU fees.

```typescript
import { Amplitude } from 'amplitude.do'

export default Amplitude({
  name: 'my-product',
  domain: 'analytics.my-product.com',
})
```

## Features

### Event Tracking

```typescript
// Just say it
await amplitude`user-123 clicked signup button`
await amplitude`sarah@acme.com viewed pricing page`
await amplitude`user-456 completed checkout $99`

// AI infers the event structure
await amplitude`user-123 clicked signup button`
// → { event: 'Button Clicked', properties: { button: 'signup' }, user_id: 'user-123' }

// Batch events read like a log
await amplitude`
  user-123:
  - viewed landing page
  - clicked signup
  - completed registration
  - started onboarding
`
```

### User Identification

```typescript
// Identify naturally
await amplitude`user-123 is sarah@acme.com on pro plan at Acme Corp`
await amplitude`sarah works at Acme, 500 employees, Technology`

// AI links identities
await amplitude`link user-123 to device-abc`
await amplitude`merge anonymous-456 into user-123`
```

### Funnels

```typescript
// Funnels are one line
const funnel = await amplitude`signup to purchase funnel this month`
const mobile = await amplitude`iOS signup funnel last week`
const checkout = await amplitude`cart to checkout to payment funnel`

// AI infers the steps
await amplitude`signup to purchase funnel`
// → Landing → Signup → Email Verified → First Purchase

// Segment naturally
await amplitude`signup funnel by platform`
await amplitude`checkout funnel iOS vs Android`
await amplitude`onboarding funnel for enterprise users`

// Find the leaks
await amplitude`where do users drop in checkout?`
await amplitude`biggest drop in signup funnel`
```

### Retention

```typescript
// Retention curves naturally
await amplitude`day 1 7 30 retention this quarter`
await amplitude`retention for users who completed onboarding`
await amplitude`retention iOS vs Android`

// Compare cohorts
await amplitude`retention: Jan signups vs Feb signups`
await amplitude`do power users retain better?`

// Unbounded retention
await amplitude`users who ever purchased after signup`
```

### Cohorts

```typescript
// Behavioral cohorts in plain English
const power = await amplitude`power users: 10+ sessions this week`
const dormant = await amplitude`users inactive for 30 days`
const churning = await amplitude`users likely to churn`

// Combine conditions naturally
await amplitude`pro users who haven't used feature X`
await amplitude`signed up last month but never purchased`
await amplitude`mobile users with 5+ sessions this week`

// Lifecycle cohorts just work
await amplitude`new users this week`
await amplitude`resurrected users`
await amplitude`users at risk of churning`

// Act on cohorts
await amplitude`users who signed up but never purchased`
  .notify(`Complete your first purchase for 20% off`)
  .each(user => amplitude`flag ${user} for sales outreach`)
```

### User Journeys

```typescript
// See how users flow
await amplitude`paths from signup to purchase`
await amplitude`what do users do after checkout?`
await amplitude`how do power users navigate?`

// Find friction
await amplitude`where do users get stuck?`
await amplitude`dead ends in the product`
await amplitude`rage clicks this week`
```

### Experiments

```typescript
// A/B tests are questions
await amplitude`new checkout vs control`
await amplitude`which pricing page converts better?`
await amplitude`is dark mode increasing engagement?`

// Run experiments naturally
await amplitude`run experiment: blue button vs green button`
  .on(`signup page visitors`)
  .measure(`signups`)

// Get results
await amplitude`checkout experiment results`
// → { winner: 'new_flow', lift: '+20%', confidence: 95% }

// Feature flags
await amplitude`should user-123 see new feature?`
await amplitude`roll out dark mode to 10% of users`
```

## AI-Native Analytics

### Root Cause Analysis

```typescript
// Ask why, get answers
await amplitude`why did signups drop last Tuesday?`
// → { factors: ['ad campaign ended', 'homepage A/B test'], confidence: 0.85 }

await amplitude`what changed when conversion improved?`
await amplitude`why is iOS retention higher than Android?`
await amplitude`what do power users do differently?`
```

### Predictive Analytics

```typescript
// Predictions as questions
await amplitude`will user-123 churn?`
// → { probability: 0.72, factors: ['no login in 14 days', 'support ticket open'] }

await amplitude`likelihood user-123 purchases this week`
await amplitude`predicted LTV for user-123`

// Batch predictions
await amplitude`users likely to churn this month`
  .each(user => amplitude`flag ${user} for retention outreach`)
```

### Auto-Instrumentation

```typescript
// AI captures everything automatically
await amplitude`auto-track my-app.com`

// AI names events semantically
// "Submit Button Clicked" not "click_btn_abc123"
// "Pricing Page Viewed" not "pageview_/pricing"

// Rage click detection automatic
// Dead click detection automatic
// Session recording optional
```

### AI Agents as Analysts

```typescript
import { priya, quinn } from 'agents.do'

// PM analyzes user behavior
await priya`analyze our activation funnel and recommend changes`
  .map(recommendations => amplitude`create issues for ${recommendations}`)

// QA finds issues through event patterns
await quinn`find anomalies in our event data`
  .map(anomalies => amplitude`alert on-call for ${anomalies}`)

// Chain insights into action
await amplitude`weekly product insights`
  .map(insights => priya`prioritize these for Q2`)
  .map(priorities => amplitude`create dashboard for ${priorities}`)
```

## Architecture

### Event Pipeline

```
Client SDK  -->  Edge Worker  -->  Event DO  -->  Storage Tiers
                     |
              +------+------+
              |             |
         Validation    Enrichment
         (Schema)      (GeoIP, UA)
```

### Durable Object per Product

```
ProductDO (config, users, events)
  |
  +-- UsersDO (identity graph)
  |     |-- SQLite: User profiles
  |     +-- Identity resolution
  |
  +-- EventsDO (event buffer)
  |     |-- SQLite: Recent events (7 days)
  |     +-- R2: Historical events (Parquet)
  |
  +-- AnalyticsDO (query engine)
  |     |-- Analytics Engine: Real-time aggregations
  |     +-- Cohort definitions
  |
  +-- ExperimentsDO (A/B testing)
        |-- SQLite: Experiment configs
        +-- Variant assignments
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Recent events (7 days) | <10ms |
| **Warm** | R2 Parquet | Historical events (months) | <100ms |
| **Cold** | R2 Archive | Long-term retention (years) | <1s |

### Query Engine

Real-time aggregations on Analytics Engine. Billions of events. Sub-second queries.

## vs Amplitude

| Feature | Amplitude | amplitude.do |
|---------|-----------|--------------|
| **Pricing** | Per-MTU ($50k+/year) | Flat storage cost |
| **Cohorts** | Growth tier only | Free |
| **Predictions** | Enterprise only | Free |
| **Experiments** | Enterprise only | Free |
| **Data Retention** | Tier-limited | Unlimited |
| **Raw Data Export** | Premium only | Your data, always |
| **Architecture** | Centralized | Edge-native, global |
| **Data Location** | Amplitude's cloud | Your Cloudflare account |
| **Lock-in** | Years of data trapped | MIT licensed |

## Use Cases

### Product Analytics

```typescript
// Complete product analytics in natural language
await amplitude`daily active users this month`
await amplitude`feature adoption for new feature X`
await amplitude`power users vs casual users comparison`
```

### Growth Experiments

```typescript
// Run experiments, ship winners
await amplitude`onboarding A vs B experiment results`
  .map(result => amplitude`roll out ${result.winner} to 100%`)
```

### Churn Prevention

```typescript
// Find and save at-risk users
await amplitude`users likely to churn this month`
  .map(users => amplitude`create cohort at-risk from ${users}`)
  .map(cohort => amplitude`notify ${cohort} with retention offer`)
```

### Product-Led Growth

```typescript
// Activation insights
await amplitude`users who activated vs didn't - what's different?`
  .map(insights => priya`recommend onboarding changes`)
```

## Migration from Amplitude

```bash
# Export from Amplitude
amplitude export --project YOUR_PROJECT --start 2024-01-01 --end 2024-03-31

# Import to amplitude.do
npx amplitude-migrate import ./export.json
```

### API Compatibility

Drop-in replacement for Amplitude HTTP API. All endpoints supported.

## Roadmap

### Core Analytics
- [x] Event Tracking
- [x] User Identification
- [x] Identity Resolution
- [x] Funnels
- [x] Retention
- [x] Cohorts
- [x] User Journeys
- [ ] Session Replay
- [ ] Heatmaps

### AI
- [x] Natural Language Queries
- [x] Root Cause Analysis
- [x] Predictive Analytics
- [x] Auto-Instrumentation
- [ ] Anomaly Detection
- [ ] AI Insights Digest

### Experiments
- [x] A/B Testing
- [x] Statistical Analysis
- [x] Feature Flags
- [ ] Holdout Groups
- [ ] Multi-Armed Bandits

### Platform
- [x] Real-time Streaming
- [x] Batch Import
- [x] Data Export
- [ ] Warehouse Sync
- [ ] Reverse ETL

## Why Open Source?

Product analytics shouldn't cost more as you succeed:

1. **Your events** - User behavior data is your product's lifeblood
2. **Your cohorts** - Behavioral segmentation drives growth
3. **Your experiments** - A/B testing shouldn't be premium
4. **Your scale** - Success shouldn't mean $100k+ analytics bills

Amplitude showed the world what product analytics could be. **amplitude.do** makes it accessible to everyone.

## Contributing

amplitude.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/amplitude.do
cd amplitude.do
pnpm install
pnpm test
```

## License

MIT License - Track all the events. Run all the experiments.

---

<p align="center">
  <strong>The $50k/year tax ends here.</strong>
  <br />
  Zero MTU. Unlimited events. AI-first.
  <br /><br />
  <a href="https://amplitude.do">Website</a> |
  <a href="https://docs.amplitude.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/amplitude.do">GitHub</a>
</p>
