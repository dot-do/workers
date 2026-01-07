# mixpanel.do

> The user analytics platform. Now open source. AI-native.

Mixpanel pioneered event-based analytics. But at $24/month per 1k MTUs on Growth, with advanced features requiring Enterprise pricing, and costs that explode at scale, it's time for a new approach.

**mixpanel.do** reimagines user analytics for the AI era. Unlimited events. Unlimited users. Zero MTU pricing.

## The Problem

Mixpanel built a user analytics empire on:

- **Per-MTU pricing** - $24/month per 1,000 MTUs on Growth plan
- **Event volume limits** - Premium plans for high-volume tracking
- **Feature gating** - Group analytics, data pipelines, SSO on Enterprise
- **Historical data limits** - Only 12 months on Growth, more on Enterprise
- **Identity management** - Advanced ID merge requires higher tiers
- **Data export limits** - Raw data access restricted by plan

At 1 million MTUs? **$24,000/month**. That's **$288,000/year** just for analytics.

## The workers.do Way

You're building a product people love. Every user interaction tells a story. But reading those stories costs $288k/year? Your success is being taxed by your analytics vendor.

What if understanding your users was as simple as asking?

```typescript
import { mixpanel, priya } from 'workers.do'

// Natural language user analytics
const journey = await mixpanel`show me the path to purchase for ${segment}`
const churn = await mixpanel`which users are likely to churn this month?`
const why = await mixpanel`why are mobile users converting better than web?`

// Chain insights into product strategy
const strategy = await mixpanel`identify our power users`
  .map(users => mixpanel`what behaviors drive retention in ${users}`)
  .map(behaviors => priya`design features that encourage ${behaviors}`)
```

One import. Natural language. User insights that drive product decisions.

That's analytics that works for you.

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

## User Analytics Without Limits

Track every user, every event, every action:

```typescript
import { mixpanel } from 'mixpanel.do'

// Track events
mixpanel.track('Signup Completed', {
  distinct_id: 'user-123',
  signup_method: 'google',
  referrer: 'product_hunt',
})

// Set user properties
mixpanel.people.set('user-123', {
  $email: 'user@example.com',
  $name: 'Jane Doe',
  plan: 'pro',
  company: 'Acme Corp',
})

// Increment properties
mixpanel.people.increment('user-123', {
  login_count: 1,
  actions_taken: 5,
})

// Track revenue
mixpanel.people.trackCharge('user-123', 99.99, {
  product: 'Pro Plan',
  billing_cycle: 'monthly',
})
```

## Features

### Event Analytics

Deep event analysis:

```typescript
import { Events } from 'mixpanel.do/analytics'

// Event segmentation
const results = await Events.segmentation({
  event: 'Purchase Completed',
  from: '2024-01-01',
  to: '2024-03-31',
  type: 'unique',  // or 'total', 'average'
  groupBy: ['product_category', 'platform'],
})

// Event counts over time
const trends = await Events.timeseries({
  events: ['Signup Completed', 'Purchase Completed'],
  from: '2024-01-01',
  to: '2024-03-31',
  interval: 'day',
})

// Top events
const topEvents = await Events.top({
  from: '2024-01-01',
  to: '2024-03-31',
  limit: 20,
})
```

### Funnels

Analyze user conversion:

```typescript
import { Funnel } from 'mixpanel.do/analytics'

// Define funnel
const signupFunnel = Funnel({
  name: 'Signup to Purchase',
  steps: [
    { event: 'Page Viewed', where: { page: 'landing' } },
    { event: 'Signup Started' },
    { event: 'Signup Completed' },
    { event: 'Onboarding Completed' },
    { event: 'Purchase Completed' },
  ],
  window: { value: 7, unit: 'day' },
})

// Query funnel
const results = await signupFunnel.query({
  from: '2024-01-01',
  to: '2024-03-31',
  segmentBy: 'signup_method',
})

// Returns detailed conversion data
console.log(results)
// {
//   overall: {
//     started: 10000,
//     completed: 1500,
//     conversionRate: 0.15,
//     avgTimeToConvert: '3.2 days',
//   },
//   steps: [
//     { event: 'Page Viewed', count: 10000, rate: 1.0, dropoff: 0 },
//     { event: 'Signup Started', count: 4000, rate: 0.4, dropoff: 0.6 },
//     { event: 'Signup Completed', count: 3200, rate: 0.8, dropoff: 0.2 },
//     { event: 'Onboarding Completed', count: 2400, rate: 0.75, dropoff: 0.25 },
//     { event: 'Purchase Completed', count: 1500, rate: 0.625, dropoff: 0.375 },
//   ],
//   segments: {
//     google: { conversionRate: 0.18 },
//     email: { conversionRate: 0.12 },
//   }
// }

// Funnel trends
const trends = await signupFunnel.trends({
  from: '2024-01-01',
  to: '2024-03-31',
  interval: 'week',
})
```

### Retention

Measure user stickiness:

```typescript
import { Retention } from 'mixpanel.do/analytics'

// Define retention analysis
const retention = await Retention.analyze({
  cohortEvent: 'Signup Completed',
  returnEvent: 'Any Event',
  from: '2024-01-01',
  to: '2024-03-31',
  granularity: 'week',
  retention_type: 'birth',  // or 'compounding'
})

// Returns retention matrix
console.log(retention)
// {
//   cohorts: [
//     {
//       date: '2024-01-01',
//       size: 1000,
//       retention: [1.0, 0.45, 0.32, 0.28, 0.25, 0.23, 0.22, ...]
//     },
//     ...
//   ]
// }

// Retention by segment
const segmented = await Retention.analyze({
  cohortEvent: 'Signup Completed',
  returnEvent: 'Any Event',
  from: '2024-01-01',
  to: '2024-03-31',
  segmentBy: 'plan_type',
})
```

### Flows (User Paths)

Visualize user journeys:

```typescript
import { Flows } from 'mixpanel.do/analytics'

// Forward flow (what do users do after X?)
const afterSignup = await Flows.forward({
  startEvent: 'Signup Completed',
  steps: 5,
  from: '2024-01-01',
  to: '2024-03-31',
})

// Backward flow (what led users to X?)
const beforePurchase = await Flows.backward({
  endEvent: 'Purchase Completed',
  steps: 5,
  from: '2024-01-01',
  to: '2024-03-31',
})

// Top paths
const topPaths = await Flows.topPaths({
  startEvent: 'App Opened',
  endEvent: 'Purchase Completed',
  from: '2024-01-01',
  to: '2024-03-31',
  limit: 10,
})
```

### Cohorts

Build and analyze user segments:

```typescript
import { Cohort } from 'mixpanel.do/analytics'

// Define cohort
const powerUsers = Cohort({
  name: 'Power Users',
  definition: {
    and: [
      { event: 'Feature Used', count: { gte: 10 }, days: 7 },
      { property: '$name', operator: 'isSet' },
    ],
  },
})

// Create cohort
await powerUsers.save()

// Get cohort members
const members = await powerUsers.members({ limit: 1000 })

// Use cohort in queries
const funnel = await signupFunnel.query({
  cohort: powerUsers,
})

// Cohort composition
const composition = await powerUsers.composition({
  properties: ['plan', 'platform', 'country'],
})
```

### Group Analytics

Analyze accounts and organizations:

```typescript
import { Groups } from 'mixpanel.do/analytics'

// Set group profile
mixpanel.groups.set('company', 'acme-corp', {
  name: 'Acme Corporation',
  industry: 'Technology',
  employees: 500,
  plan: 'enterprise',
})

// Associate user with group
mixpanel.people.set('user-123', {
  $group_company: 'acme-corp',
})

// Group-level analytics
const accountMetrics = await Groups.metrics({
  groupType: 'company',
  metrics: ['total_users', 'active_users', 'revenue'],
  from: '2024-01-01',
  to: '2024-03-31',
})

// Group funnel
const accountFunnel = await Groups.funnel({
  groupType: 'company',
  steps: ['Trial Started', 'First User Activated', 'Paid Conversion'],
  from: '2024-01-01',
  to: '2024-03-31',
})
```

### Formulas

Create computed metrics:

```typescript
import { Formula } from 'mixpanel.do/analytics'

// Define formula
const activationRate = Formula({
  name: 'Activation Rate',
  formula: 'A / B * 100',
  events: {
    A: { event: 'Onboarding Completed', type: 'unique' },
    B: { event: 'Signup Completed', type: 'unique' },
  },
})

// Query formula
const results = await activationRate.query({
  from: '2024-01-01',
  to: '2024-03-31',
  interval: 'week',
})

// Complex formula
const arpu = Formula({
  name: 'ARPU',
  formula: 'A / B',
  events: {
    A: { event: 'Purchase Completed', property: 'amount', aggregation: 'sum' },
    B: { event: 'Any Event', type: 'unique' },
  },
})
```

## AI-Native Features

### Natural Language Queries

Ask questions in plain English:

```typescript
import { ask } from 'mixpanel.do'

// Simple questions
const q1 = await ask('how many users signed up this week?')
// { value: 1234, comparison: '+15% vs last week' }

// Funnel questions
const q2 = await ask('what is the conversion from signup to purchase?')
// { funnel: [...], rate: 0.08 }

// Comparative questions
const q3 = await ask('which platform has better retention?')
// { comparison: { ios: 0.32, android: 0.28, web: 0.25 } }

// Diagnostic questions
const q4 = await ask('why did signups drop last Tuesday?')
// { diagnosis: [...], recommendations: [...] }
```

### Spark (AI Insights)

AI-powered insight discovery:

```typescript
import { spark } from 'mixpanel.do'

// Get AI-generated insights
const insights = await spark({
  focus: ['activation', 'retention', 'revenue'],
  timeframe: 'last 30 days',
})

// Returns prioritized insights
for (const insight of insights) {
  console.log(insight.headline)
  // "Activation rate dropped 12% for mobile users"

  console.log(insight.impact)
  // "Estimated $15k/month revenue impact"

  console.log(insight.recommendation)
  // "Investigate mobile onboarding flow"

  console.log(insight.evidence)
  // { charts: [...], data: [...] }
}
```

### Anomaly Detection

Automatic anomaly alerts:

```typescript
import { Alerts } from 'mixpanel.do'

// Create alert
const signupAlert = Alert({
  name: 'Signup Drop Alert',
  event: 'Signup Completed',
  metric: 'unique',
  condition: {
    type: 'anomaly',
    sensitivity: 'medium',  // 'low', 'medium', 'high'
  },
  notify: [
    { type: 'email', address: 'team@company.com' },
    { type: 'slack', channel: '#analytics' },
  ],
})

// Or threshold-based
const revenueAlert = Alert({
  name: 'Low Revenue Alert',
  event: 'Purchase Completed',
  property: 'amount',
  metric: 'sum',
  condition: {
    type: 'threshold',
    operator: 'lessThan',
    value: 10000,
    window: '24h',
  },
})
```

### AI Agents as Analysts

AI agents can analyze user behavior:

```typescript
import { priya, quinn } from 'agents.do'
import { mixpanel } from 'mixpanel.do'

// Product manager analyzes activation
const activation = await priya`
  analyze our user activation flow and identify
  the key actions that lead to long-term retention
`

// QA finds UX issues
const uxIssues = await quinn`
  look for patterns that indicate user frustration
  like rage clicks, repeated errors, or abandoned flows
`
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

Full identity graph for cross-device tracking:

```typescript
// Link anonymous to identified user
mixpanel.alias('user-123', 'anon-abc')

// Merge duplicate profiles
mixpanel.merge('user-123', ['user-456', 'user-789'])

// Identity graph query
const identities = await mixpanel.identity.graph('user-123')
// Returns all linked identities across devices
```

## SDKs

### JavaScript SDK

```typescript
import { Mixpanel } from 'mixpanel.do/browser'

const mixpanel = new Mixpanel({
  token: 'your-token',
  serverUrl: 'https://your-org.mixpanel.do',
})

mixpanel.init()
mixpanel.track('Event Name', { property: 'value' })
```

### React SDK

```tsx
import { MixpanelProvider, useTrack, usePeople } from 'mixpanel.do/react'

function App() {
  return (
    <MixpanelProvider token="your-token" serverUrl="https://your-org.mixpanel.do">
      <MyComponent />
    </MixpanelProvider>
  )
}

function MyComponent() {
  const track = useTrack()
  const people = usePeople()

  useEffect(() => {
    people.set({ lastSeen: new Date() })
  }, [])

  return <button onClick={() => track('Click')}>Click</button>
}
```

### Node.js SDK

```typescript
import { Mixpanel } from 'mixpanel.do/node'

const mixpanel = new Mixpanel({
  token: 'your-token',
  serverUrl: 'https://your-org.mixpanel.do',
})

mixpanel.track('Server Event', {
  distinct_id: 'user-123',
  property: 'value',
})
```

### iOS SDK

```swift
import MixpanelDO

let mixpanel = Mixpanel(token: "your-token", serverUrl: "https://your-org.mixpanel.do")
mixpanel.track(event: "Event Name", properties: ["property": "value"])
```

### Android SDK

```kotlin
import com.mixpaneldo.Mixpanel

val mixpanel = Mixpanel("your-token", "https://your-org.mixpanel.do")
mixpanel.track("Event Name", mapOf("property" to "value"))
```

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

Build custom dashboards:

```typescript
import { Dashboard, Report } from 'mixpanel.do'

const productDashboard = Dashboard({
  name: 'Product Metrics',
  reports: [
    Report.kpi({
      name: 'Active Users',
      event: 'Any Event',
      type: 'unique',
      comparison: 'previous_period',
    }),
    Report.funnel({
      name: 'Activation Funnel',
      funnel: activationFunnel,
    }),
    Report.retention({
      name: 'Weekly Retention',
      cohortEvent: 'Signup',
      returnEvent: 'Any Event',
    }),
    Report.timeseries({
      name: 'Signups Over Time',
      event: 'Signup Completed',
      interval: 'day',
    }),
  ],
})
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
  <strong>mixpanel.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://mixpanel.do">Website</a> | <a href="https://docs.mixpanel.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
