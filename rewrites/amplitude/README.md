# amplitude.do

> The product analytics platform. Now open source. AI-native.

Amplitude powers product-led growth for thousands of companies. But at $50k+/year for Growth plans, with per-MTU pricing that explodes at scale, and critical features locked behind enterprise tiers, it's time for a new approach.

**amplitude.do** reimagines product analytics for the AI era. Every event captured. Every funnel analyzed. Every cohort defined. Zero MTU pricing.

## The Problem

Amplitude built a product analytics empire on:

- **Per-MTU pricing** - Monthly Tracked Users that scale costs with success
- **Feature gating** - Behavioral cohorts, predictions, experiments on Growth+
- **Data retention limits** - Historical data access requires higher tiers
- **Governance lock** - Data taxonomy and governance tools are enterprise-only
- **Identity resolution** - Cross-device user stitching costs extra
- **Raw data access** - Exporting your own data requires premium plans

10 million MTUs? You're looking at **$100k+/year**. And that's before experiments.

## The Solution

**amplitude.do** is Amplitude reimagined:

```
Traditional Amplitude           amplitude.do
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

## Product Analytics That Scale

Track every user action without worrying about costs:

```typescript
import { amplitude } from 'amplitude.do'

// Track events (unlimited)
amplitude.track('Button Clicked', {
  button_name: 'Sign Up',
  page: 'landing',
  variant: 'blue',
})

// Identify users
amplitude.identify('user-123', {
  email: 'user@example.com',
  plan: 'pro',
  company: 'Acme Corp',
})

// Track revenue
amplitude.revenue({
  productId: 'pro-plan',
  price: 99,
  quantity: 1,
})

// Group users (accounts/companies)
amplitude.group('company', 'acme-corp', {
  industry: 'Technology',
  employees: 500,
})
```

## Features

### Event Tracking

Comprehensive event capture:

```typescript
import { Amplitude } from 'amplitude.do'

const amplitude = new Amplitude({
  apiKey: env.AMPLITUDE_KEY,  // Your instance
})

// Standard events
amplitude.track('Page Viewed', {
  page: '/dashboard',
  referrer: document.referrer,
})

// Custom events
amplitude.track('Feature Used', {
  feature_name: 'export',
  format: 'csv',
  row_count: 1000,
})

// Event with timestamp
amplitude.track('Purchase Completed', {
  product_id: 'widget-pro',
  amount: 49.99,
}, {
  time: Date.parse('2024-01-15T10:30:00Z'),
})

// Batch events
amplitude.trackBatch([
  { event: 'Step 1 Completed', properties: { ... } },
  { event: 'Step 2 Completed', properties: { ... } },
  { event: 'Step 3 Completed', properties: { ... } },
])
```

### Funnels

Analyze conversion through any sequence:

```typescript
import { Funnel } from 'amplitude.do/analytics'

// Define a funnel
const signupFunnel = Funnel({
  name: 'Signup Flow',
  steps: [
    { event: 'Landing Page Viewed' },
    { event: 'Sign Up Started' },
    { event: 'Email Verified' },
    { event: 'Profile Completed' },
    { event: 'First Action Taken' },
  ],
  timeWindow: '7 days',
})

// Query funnel metrics
const results = await signupFunnel.query({
  dateRange: { start: '2024-01-01', end: '2024-03-31' },
  segmentBy: 'platform',
})

// Returns conversion at each step
console.log(results)
// {
//   steps: [
//     { name: 'Landing Page Viewed', count: 100000, rate: 1.0 },
//     { name: 'Sign Up Started', count: 35000, rate: 0.35 },
//     { name: 'Email Verified', count: 28000, rate: 0.80 },
//     { name: 'Profile Completed', count: 21000, rate: 0.75 },
//     { name: 'First Action Taken', count: 15000, rate: 0.71 },
//   ],
//   overallConversion: 0.15,
//   medianTimeToConvert: '2.3 days',
//   segments: {
//     'ios': { overallConversion: 0.18 },
//     'android': { overallConversion: 0.14 },
//     'web': { overallConversion: 0.12 },
//   }
// }
```

### Retention

Understand user stickiness:

```typescript
import { Retention } from 'amplitude.do/analytics'

// N-day retention
const retention = await Retention.nDay({
  startEvent: 'Signed Up',
  returnEvent: 'Any Active Event',
  dateRange: { start: '2024-01-01', end: '2024-01-31' },
  days: [1, 3, 7, 14, 30],
})

// Returns retention curve
console.log(retention)
// {
//   cohortSize: 5000,
//   retention: {
//     day1: 0.45,
//     day3: 0.32,
//     day7: 0.25,
//     day14: 0.20,
//     day30: 0.15,
//   }
// }

// Unbounded retention (return on or after day N)
const unbounded = await Retention.unbounded({
  startEvent: 'Signed Up',
  returnEvent: 'Purchase Completed',
  dateRange: { start: '2024-01-01', end: '2024-03-31' },
})

// Bracket retention (custom time windows)
const brackets = await Retention.bracket({
  startEvent: 'Signed Up',
  returnEvent: 'Any Active Event',
  brackets: ['0-1 days', '2-7 days', '8-30 days', '31-90 days'],
})
```

### Cohorts

Define and analyze user segments:

```typescript
import { Cohort } from 'amplitude.do/analytics'

// Behavioral cohort
const powerUsers = Cohort({
  name: 'Power Users',
  definition: {
    all: [
      { event: 'Any Active Event', count: { gte: 10 }, within: '7 days' },
      { property: 'plan', operator: 'is', value: 'pro' },
    ],
  },
})

// Query cohort size over time
const trend = await powerUsers.sizeTrend({
  dateRange: { start: '2024-01-01', end: '2024-03-31' },
  granularity: 'week',
})

// Export cohort for targeting
const users = await powerUsers.export({ limit: 10000 })

// Use cohort in analysis
const funnel = await signupFunnel.query({
  cohort: powerUsers,
})

// Lifecycle cohorts (built-in)
const newUsers = Cohort.new({ within: '7 days' })
const activeUsers = Cohort.active({ within: '7 days' })
const dormantUsers = Cohort.dormant({ after: '30 days' })
const resurrectedUsers = Cohort.resurrected({ after: '30 days', active: '7 days' })
```

### User Journeys

Visualize paths through your product:

```typescript
import { Journey } from 'amplitude.do/analytics'

// Most common paths
const paths = await Journey.paths({
  startEvent: 'App Opened',
  endEvent: 'Purchase Completed',
  steps: 5,
  dateRange: { start: '2024-01-01', end: '2024-03-31' },
})

// Pathfinder (Sankey diagram)
const pathfinder = await Journey.pathfinder({
  startEvent: 'Landing Page Viewed',
  depth: 4,
  minPercentage: 0.01,  // Show paths with >1% of users
})

// Session replay (if enabled)
const sessions = await Journey.sessions({
  userId: 'user-123',
  dateRange: { start: '2024-03-01', end: '2024-03-31' },
})
```

### Experiments (A/B Testing)

Run and analyze experiments:

```typescript
import { Experiment } from 'amplitude.do/experiments'

// Create experiment
const checkoutExperiment = Experiment({
  name: 'New Checkout Flow',
  variants: [
    { name: 'control', weight: 50 },
    { name: 'new_flow', weight: 50 },
  ],
  targetCohort: 'all_users',
  primaryMetric: {
    event: 'Purchase Completed',
    type: 'conversion',
  },
  secondaryMetrics: [
    { event: 'Purchase Completed', property: 'amount', type: 'sum' },
    { event: 'Checkout Abandoned', type: 'conversion' },
  ],
})

// Assign variant
const variant = await checkoutExperiment.getVariant('user-123')
// 'control' or 'new_flow'

// Track exposure
amplitude.track('$exposure', {
  experiment: 'new_checkout_flow',
  variant: variant,
})

// Query results
const results = await checkoutExperiment.results({
  dateRange: { start: '2024-03-01', end: '2024-03-31' },
})

// Returns statistical analysis
console.log(results)
// {
//   variants: {
//     control: {
//       users: 5000,
//       conversions: 500,
//       rate: 0.10
//     },
//     new_flow: {
//       users: 5000,
//       conversions: 600,
//       rate: 0.12
//     },
//   },
//   lift: 0.20,  // 20% improvement
//   confidence: 0.95,
//   winner: 'new_flow',
//   sampleSizeReached: true,
// }
```

## AI-Native Features

### Natural Language Analytics

Ask questions about your product:

```typescript
import { ask } from 'amplitude.do'

// Simple questions
const answer1 = await ask('how many users signed up last week?')
// Returns: { value: 3500, trend: '+12%', visualization: <chart> }

// Funnel questions
const answer2 = await ask('what is our checkout funnel conversion?')
// Returns: { funnel: [...], overallConversion: 0.15, visualization: <funnel> }

// Comparative questions
const answer3 = await ask('how does iOS retention compare to Android?')
// Returns: { comparison: {...}, visualization: <comparison chart> }

// Root cause questions
const answer4 = await ask('why did signups drop last Tuesday?')
// Returns: { factors: [...], narrative: "...", visualization: <breakdown> }
```

### Predictive Analytics

AI-powered predictions:

```typescript
import { predict } from 'amplitude.do'

// Churn prediction
const churnRisk = await predict.churn({
  userId: 'user-123',
  timeframe: '30 days',
})
// { probability: 0.72, factors: ['no login in 14 days', 'support ticket open'] }

// Conversion prediction
const conversionLikelihood = await predict.conversion({
  userId: 'user-123',
  event: 'Purchase Completed',
  timeframe: '7 days',
})
// { probability: 0.35, factors: ['viewed pricing 3x', 'pro plan interest'] }

// LTV prediction
const ltv = await predict.ltv({
  userId: 'user-123',
  timeframe: '12 months',
})
// { predicted: 450, confidence: 0.8, cohortAverage: 380 }
```

### Auto-Instrumentation

AI captures events automatically:

```typescript
import { autoTrack } from 'amplitude.do'

// Auto-track all user interactions
autoTrack({
  clicks: true,      // Button clicks, links
  forms: true,       // Form submissions
  pageViews: true,   // Page navigation
  scrollDepth: true, // Scroll percentage
  rage: true,        // Rage clicks (frustration)
  errors: true,      // JavaScript errors
})

// AI names events semantically
// "Submit Button Clicked" instead of "click_btn_abc123"
```

### AI Agents as Analysts

AI agents can analyze your product:

```typescript
import { priya, quinn } from 'agents.do'
import { amplitude } from 'amplitude.do'

// Product manager analyzes user behavior
const analysis = await priya`
  analyze our user activation funnel and identify
  the biggest drop-off points with recommendations
`

// QA finds issues through event patterns
const issues = await quinn`
  look for anomalies in our event data that might
  indicate bugs or UX problems
`
```

## Architecture

### Event Ingestion

High-throughput event pipeline:

```
Client SDK  -->  Edge Worker  -->  Event DO  -->  Storage Tiers
                     |
              +------+------+
              |             |
         Validation    Enrichment
         (Schema)      (GeoIP, UA)
```

### Durable Objects

```
                    +------------------------+
                    |   amplitude.do Worker  |
                    |   (API + Ingestion)    |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | UserDO           | | EventStoreDO     | | AnalyticsDO      |
    | (Identity Graph) | | (Event Buffer)   | | (Query Engine)   |
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

### Storage Tiers

- **Hot (SQLite/D1)** - Recent events (7 days), user profiles, cohort definitions
- **Warm (R2 Parquet)** - Historical events, queryable
- **Cold (R2 Archive)** - Long-term retention, compressed

### Query Engine

Built on Cloudflare Analytics Engine for real-time aggregations:

```typescript
// Analytics Engine handles high-cardinality aggregations
AnalyticsEngine.write({
  indexes: [userId, eventName, timestamp],
  blobs: [JSON.stringify(properties)],
})

// Query across billions of events
AnalyticsEngine.query({
  timeRange: { start: '-30d' },
  metrics: ['count', 'uniqueUsers'],
  dimensions: ['eventName', 'platform'],
  filters: [{ dimension: 'country', value: 'US' }],
})
```

## SDKs

### Browser SDK

```typescript
import { Amplitude } from 'amplitude.do/browser'

const amplitude = new Amplitude({
  apiKey: 'your-api-key',
  serverUrl: 'https://your-org.amplitude.do',
})

amplitude.init()
amplitude.track('Event Name', { property: 'value' })
```

### React SDK

```tsx
import { AmplitudeProvider, useTrack, useIdentify } from 'amplitude.do/react'

function App() {
  return (
    <AmplitudeProvider apiKey="your-key" serverUrl="https://your-org.amplitude.do">
      <MyComponent />
    </AmplitudeProvider>
  )
}

function MyComponent() {
  const track = useTrack()
  const identify = useIdentify()

  return (
    <button onClick={() => track('Button Clicked')}>
      Click Me
    </button>
  )
}
```

### Node.js SDK

```typescript
import { Amplitude } from 'amplitude.do/node'

const amplitude = new Amplitude({
  apiKey: 'your-api-key',
  serverUrl: 'https://your-org.amplitude.do',
})

// Server-side tracking
amplitude.track('Server Event', { userId: 'user-123' })
```

## Migration from Amplitude

### Export Your Data

```bash
# Export from Amplitude
amplitude export --project YOUR_PROJECT --start 2024-01-01 --end 2024-03-31

# Import to amplitude.do
npx amplitude-migrate import ./export.json
```

### API Compatibility

Drop-in replacement for Amplitude HTTP API:

```
Endpoint                        Status
-----------------------------------------------------------------
POST /2/httpapi                 Supported
POST /batch                     Supported
POST /identify                  Supported
POST /groupidentify             Supported
GET /userprofile                Supported
POST /export                    Supported
```

### Taxonomy Migration

```bash
# Export event taxonomy
npx amplitude-migrate export-taxonomy --source amplitude

# Import to amplitude.do
npx amplitude-migrate import-taxonomy ./taxonomy.json
```

## Roadmap

- [x] Event tracking (browser, Node.js, React)
- [x] Funnel analysis
- [x] Retention analysis
- [x] Cohort builder
- [x] User journeys (paths)
- [x] Natural language queries
- [ ] A/B testing (full)
- [ ] Predictions (churn, LTV)
- [ ] Session replay
- [ ] Feature flags integration
- [ ] Data governance
- [ ] Real-time alerts

## Why Open Source?

Product analytics shouldn't cost more as you succeed:

1. **Your events** - User behavior data is your product's lifeblood
2. **Your cohorts** - Behavioral segmentation drives growth
3. **Your experiments** - A/B testing shouldn't be premium
4. **Your scale** - Success shouldn't mean $100k+ analytics bills

Amplitude showed the world what product analytics could be. **amplitude.do** makes it accessible to everyone.

## License

MIT License - Use it however you want. Track all the events. Run all the experiments.

---

<p align="center">
  <strong>amplitude.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://amplitude.do">Website</a> | <a href="https://docs.amplitude.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
