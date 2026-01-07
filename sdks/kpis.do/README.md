# kpis.do

**KPIs that never lie.**

```bash
npm install kpis.do
```

---

## Your Metrics Are Already Outdated

You need to know how your business is performing. Revenue. Churn. Conversion. Growth.

But tracking KPIs means:
- Spreadsheets that break when someone moves a column
- Manual data pulls that eat your Monday mornings
- Dashboards showing last week's numbers as "current"
- Alerts that fire too late to matter
- Different numbers in different tools that never agree

**Your decisions deserve real-time truth, not stale guesses.**

## What If Your KPIs Updated Themselves?

```typescript
import { kpis } from 'kpis.do'

// Describe what you want to track in plain English
const mrr = await kpis.do`
  Track Monthly Recurring Revenue from Stripe subscriptions,
  alert me when it drops more than 10% week-over-week
`

// Or define with full control
const churn = await kpis.create({
  name: 'customer-churn',
  metric: 'churn_rate',
  source: { type: 'stripe', config: { metric: 'subscriptions.canceled' } },
  target: { max: 5, unit: 'percent' },
  alerts: [{
    when: 'exceeds',
    threshold: 5,
    channels: [{ type: 'slack', config: { channel: '#alerts' } }]
  }]
})

// Query anytime - always fresh
const current = await kpis.measure('mrr')
console.log(`MRR: $${current.value} (${current.changePercent > 0 ? '+' : ''}${current.changePercent}%)`)
```

**kpis.do** gives you:
- Real-time metrics from live data sources
- Natural language KPI definition
- Automatic alerts when things go wrong
- Beautiful dashboards that stay current
- One source of truth for your entire team

## Track Everything in 3 Steps

### 1. Define Your KPI

```typescript
import { kpis } from 'kpis.do'

// Natural language for quick setup
const nps = await kpis.do`
  Calculate Net Promoter Score from survey responses,
  update daily, target score of 50+
`

// Full control for complex metrics
const ltv = await kpis.create({
  name: 'customer-ltv',
  metric: 'lifetime_value',
  formula: 'avg_order_value * purchase_frequency * customer_lifespan',
  source: { type: 'database', config: { query: 'SELECT...' } },
  target: { min: 500, unit: 'usd' },
  thresholds: [
    { name: 'healthy', level: 'info', condition: 'above', value: 500 },
    { name: 'warning', level: 'warning', condition: 'below', value: 400 },
    { name: 'critical', level: 'critical', condition: 'below', value: 300 }
  ]
})
```

### 2. Connect Your Sources

```typescript
// Stripe - revenue, subscriptions, churn
const mrr = await kpis.do`Track MRR from Stripe`

// Database - custom queries
const activeUsers = await kpis.create({
  name: 'daily-active-users',
  metric: 'dau',
  source: {
    type: 'database',
    config: { query: 'SELECT COUNT(*) FROM sessions WHERE date = TODAY' },
    refreshInterval: '5m'
  }
})

// API - any external service
const satisfaction = await kpis.create({
  name: 'csat-score',
  metric: 'csat',
  source: {
    type: 'api',
    config: { url: 'https://surveys.example.com/api/csat' },
    refreshInterval: '1h'
  }
})

// Analytics - traffic, conversion
const conversion = await kpis.do`
  Track checkout conversion rate from analytics,
  alert when it drops below 3%
`
```

### 3. Monitor and Alert

```typescript
// Get current values
const metric = await kpis.measure('mrr')
console.log(metric.value)         // 125000
console.log(metric.changePercent) // 5.2
console.log(metric.trend)         // 'up'

// View trends over time
const trend = await kpis.trend('mrr', {
  period: '30d',
  granularity: 'daily'
})
console.log(trend.summary.trend) // 'up'

// Set up alerts
await kpis.alert('mrr', {
  when: 'drops_below',
  threshold: 100000,
  channels: [
    { type: 'slack', config: { channel: '#revenue-alerts' } },
    { type: 'email', config: { to: 'founders@startup.com' } }
  ]
})

// Build dashboards
const executive = await kpis.dashboard('executive', {
  kpis: ['mrr', 'arr', 'churn', 'nps', 'cac', 'ltv'],
  layout: { columns: 3, rows: 2 }
})

// Share with stakeholders
const { url } = await kpis.share('executive')
```

## The Difference

**Without kpis.do:**
- Export CSV from Stripe on Monday
- Copy-paste into spreadsheet
- Write formulas that break monthly
- Screenshot charts for the board deck
- Realize the churn spike happened last week
- Scramble to understand what went wrong

**With kpis.do:**
- Define KPI once, track forever
- Real-time data from the source
- Automatic calculations and trends
- Live dashboards anyone can view
- Instant alerts when metrics shift
- Act while you can still make a difference

## Everything You Need

```typescript
// Compare KPIs
const comparison = await kpis.compare(['mrr', 'arr', 'nrr'], {
  period: '90d'
})

// Segment by dimensions
const mrrByPlan = await kpis.measure('mrr', {
  dimensions: { plan: 'enterprise' }
})

// Acknowledge alerts
const alerts = await kpis.alerts({ status: 'active' })
await kpis.acknowledge(alerts[0].id)

// Export for reporting
const { url } = await kpis.export({
  kpiIds: ['mrr', 'churn', 'nps'],
  format: 'excel',
  period: '1y'
})

// Refresh on demand
await kpis.refresh({ kpiIds: ['mrr'] })
```

## Threshold Levels

| Level | Use Case | Action |
|-------|----------|--------|
| `info` | Metric is healthy | No action needed |
| `warning` | Metric needs attention | Review soon |
| `critical` | Metric requires immediate action | Act now |

## Alert Triggers

| Trigger | Description |
|---------|-------------|
| `exceeds` | Value goes above threshold |
| `drops_below` | Value falls below threshold |
| `changes_by` | Value changes by percentage |
| `target_missed` | Target not met for period |

## Configuration

```typescript
import { KPIs } from 'kpis.do'

const kpis = KPIs({
  apiKey: process.env.KPIS_API_KEY
})
```

Or set `KPIS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Flying Blind

Your business generates data every second. You should know what it means every second too.

**Make decisions with confidence, not hope.**

```bash
npm install kpis.do
```

[Start tracking at kpis.do](https://kpis.do)

---

MIT License
