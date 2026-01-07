# analytics.do

**Analytics that tell you what to do next.**

```bash
npm install analytics.do
```

---

## Data Without Direction Is Just Noise

You have dashboards. Lots of them. Charts going up, charts going down, numbers everywhere.

But when your CEO asks "Why did signups drop last week?" you spend hours digging through tabs, exporting CSVs, and building pivot tables. By the time you have an answer, it's already stale.

The problem isn't data. It's:
- **Dashboard fatigue** - 47 charts but no clarity
- **Manual reporting** - Hours spent on weekly summaries
- **No actionable insights** - You know *what* happened, never *why*
- **Analysis paralysis** - Too many metrics, no recommendations
- **Reactive instead of proactive** - Problems found too late

**You don't need more dashboards. You need answers.**

## What If Analytics Could Think?

```typescript
import analytics from 'analytics.do'

// Ask questions in plain English
const insight = await analytics.do`
  Why did signups drop last week?
  What should we do about it?
`

// Get answers, not charts
// {
//   type: 'anomaly',
//   title: 'Signup drop traced to broken Twitter OAuth',
//   description: 'Signups from Twitter dropped 73% on Tuesday...',
//   suggestedActions: [
//     'Check Twitter OAuth integration',
//     'Review error logs from auth service',
//     'Consider adding backup auth methods'
//   ]
// }
```

**analytics.do** gives you:
- Natural language queries that return insights, not dashboards
- AI-powered anomaly detection that alerts you before you notice
- Automatic "why" analysis for every significant change
- Recommended actions, not just observations
- One line of code to ask any question

## Get Answers in 3 Steps

### 1. Track Events

```typescript
import analytics from 'analytics.do'

// Track what matters
await analytics.track('signup', { plan: 'pro', source: 'twitter' })
await analytics.track('purchase', { amount: 99, product: 'starter-kit' })

// Identify users
await analytics.identify('user_123', {
  name: 'Alice',
  email: 'alice@example.com',
  plan: 'pro'
})

// Track pages
await analytics.page('/pricing', { referrer: 'https://google.com' })
```

### 2. Ask Questions

```typescript
// Natural language queries
const answer = await analytics.do`
  What's our best performing acquisition channel this month?
`

const analysis = await analytics.do`
  Which features do our highest-value customers use most?
`

const prediction = await analytics.do`
  Based on current trends, what will our MRR be in 3 months?
`

// Get proactive insights
const insights = await analytics.insights()
// Returns anomalies, trends, correlations, and recommendations
```

### 3. Get Answers

```typescript
// Every insight comes with recommended actions
const insight = await analytics.do`Why is churn increasing?`

console.log(insight.suggestedActions)
// [
//   'Review onboarding completion rate - dropped 15%',
//   'Check customer support ticket volume',
//   'Analyze churned users by acquisition source'
// ]

// Funnels that explain dropoffs
const funnel = await analytics.funnel({
  name: 'signup-to-purchase',
  steps: ['signup', 'onboarding_complete', 'purchase'],
  conversionWindow: '7d'
})

// Cohorts that reveal retention patterns
const cohort = await analytics.cohort({
  name: 'weekly-retention',
  entryEvent: 'signup',
  retentionEvent: 'login',
  groupBy: 'week'
})
```

## The Difference

**Without analytics.do:**
- Open 5 dashboards to investigate a drop
- Export to Excel to find correlations
- Spend 2 hours on the weekly report
- Notice problems after customers complain
- Guess at what actions to take
- Data team backlog of 47 requests

**With analytics.do:**
- Ask one question, get one answer
- Correlations surfaced automatically
- Reports generated and sent while you sleep
- Alerts before problems become crises
- Recommended actions for every insight
- Self-serve analytics for everyone

## Everything You Need

```typescript
// Advanced queries when you need control
const data = await analytics.query({
  metrics: ['unique_users', 'revenue', 'conversion_rate'],
  dimensions: ['source', 'country'],
  period: { start: '2024-01-01', end: '2024-01-31' },
  granularity: 'day'
})

// SQL when you really need it
const result = await analytics.sql`
  SELECT source, COUNT(DISTINCT userId) as users, SUM(revenue) as revenue
  FROM events
  WHERE name = 'purchase' AND timestamp > NOW() - INTERVAL 30 DAY
  GROUP BY source
  ORDER BY revenue DESC
`

// Scheduled reports
await analytics.reports.create({
  name: 'Weekly Growth Report',
  query: { metrics: ['signups', 'revenue', 'churn_rate'], dimensions: ['source'] },
  schedule: { frequency: 'weekly', time: '09:00', timezone: 'America/New_York' },
  recipients: ['team@company.com'],
  format: 'pdf'
})

// Dashboards when you want them
const dashboard = await analytics.dashboard({
  name: 'Growth Metrics',
  widgets: [
    { type: 'metric', query: { metrics: ['mrr'] }, title: 'MRR' },
    { type: 'chart', query: { metrics: ['signups'], dimensions: ['date'] }, title: 'Signups' },
    { type: 'funnel', query: { metrics: ['funnel:signup-to-purchase'] }, title: 'Conversion' }
  ]
})

// Export your data
const exportJob = await analytics.export({
  format: 'csv',
  events: { names: ['signup', 'purchase'], period: { start: '2024-01-01', end: '2024-01-31' } }
})
```

## Insight Types

| Type | Description |
|------|-------------|
| `anomaly` | Unusual patterns detected in your metrics |
| `trend` | Significant directional changes over time |
| `correlation` | Relationships between different metrics |
| `recommendation` | Suggested actions based on data |
| `prediction` | Forecasts based on historical patterns |

## Configuration

```typescript
import { Analytics } from 'analytics.do'

const analytics = Analytics({
  apiKey: process.env.ANALYTICS_API_KEY
})
```

Or set `ANALYTICS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Staring at Dashboards

Your data knows what's happening in your business. It knows why metrics change. It knows what you should do next.

You just need to ask.

**Analytics that tell you what to do next.**

```bash
npm install analytics.do
```

[Start asking questions at analytics.do](https://analytics.do)

---

Part of the [workers.do](https://workers.do) platform.

MIT License
