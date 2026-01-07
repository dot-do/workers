# goals.do

**Goals that track themselves.**

```bash
npm install goals.do
```

---

## Your Goals Are Flying Blind

You set ambitious goals. Revenue targets. Growth metrics. Product milestones.

But tracking them means:
- Manual spreadsheet updates nobody remembers to do
- Goals set in January, forgotten by March
- No connection between daily work and quarterly objectives
- Progress meetings where everyone guesses the numbers
- Finding out you missed targets when it's too late

**Your goals deserve better than hope and hindsight.**

## What If Goals Updated Themselves?

```typescript
import { goals } from 'goals.do'

// Describe your goal in plain English
const revenue = await goals.do`
  Increase monthly revenue to $100k
  by end of Q2, tracking Stripe payments
`

// Connect your data - progress updates automatically
await goals.connect('revenue', {
  type: 'stripe',
  metric: 'sum(amount)',
  aggregation: 'sum',
  filter: 'status:succeeded'
})

// Check progress anytime - always current
const status = await goals.progress('revenue')
// { current: 78000, target: 100000, percentage: 78 }
```

**goals.do** gives you:
- Automatic progress tracking from real data sources
- Early warning when goals are at risk
- Cascading goals that roll up to company objectives
- Forecasts based on actual velocity
- Zero manual updates required

## Track Goals in 3 Steps

### 1. Set Your Goal

```typescript
import { goals } from 'goals.do'

// Natural language for quick goals
const simple = await goals.do`
  Reach 10,000 monthly active users by December
`

// Full control for detailed goals
const detailed = await goals.create({
  name: 'Q2 Revenue',
  description: 'Hit $100k MRR by end of Q2',
  target: {
    metric: 'mrr',
    value: 100000,
    unit: 'USD',
    direction: 'increase',
    baseline: 45000
  },
  timeframe: {
    start: new Date('2024-04-01'),
    end: new Date('2024-06-30'),
    period: 'quarterly'
  },
  milestones: [
    { name: 'First $60k', target: 60000 },
    { name: 'Halfway there', target: 72500 },
    { name: 'Final push', target: 90000 }
  ]
})
```

### 2. Connect Your Data

```typescript
// Connect Stripe for revenue goals
await goals.connect('revenue', {
  type: 'stripe',
  metric: 'sum(amount)',
  aggregation: 'sum'
})

// Connect analytics for user goals
await goals.connect('active-users', {
  type: 'analytics',
  metric: 'activeUsers',
  aggregation: 'count',
  config: { property: 'GA-XXXXX' }
})

// Connect any API
await goals.connect('nps-score', {
  type: 'api',
  config: { url: 'https://api.survey.com/nps' },
  metric: 'score',
  aggregation: 'average'
})

// Or record manually when needed
await goals.record('customer-calls', 47, {
  note: 'Week 12 calls completed'
})
```

### 3. Watch Progress

```typescript
// Get current progress
const progress = await goals.progress('revenue')
console.log(`${progress.percentage}% complete`)
console.log(`Projected completion: ${progress.projectedCompletion}`)

// Get forecasts and insights
const analysis = await goals.analyze('revenue')
console.log(analysis.forecast.projectedValue) // Where you'll end up
console.log(analysis.insights) // What's affecting progress
console.log(analysis.recommendations) // What to do about it

// Stream real-time updates
for await (const update of goals.stream('revenue')) {
  console.log(`Progress: ${update.newValue}`)
}
```

## The Difference

**Without goals.do:**
- Goals live in forgotten documents
- Progress tracked in stale spreadsheets
- Monthly meetings to guess at numbers
- Find out you missed targets too late
- No connection between work and outcomes
- Goals feel like annual theater

**With goals.do:**
- Goals connected to live data
- Progress updates automatically
- Real-time visibility for everyone
- Early warnings when off track
- Clear line from tasks to objectives
- Goals that actually drive decisions

## Cascade Goals Across Your Organization

```typescript
// Company-level objective
const companyGoal = await goals.create({
  name: 'Hit $1M ARR',
  target: { metric: 'arr', value: 1000000, direction: 'increase' },
  timeframe: { period: 'yearly', ... }
})

// Team goals that roll up
const salesGoal = await goals.create({
  name: 'Sales: $600k new business',
  target: { metric: 'new_arr', value: 600000, direction: 'increase' },
  ...
})

await goals.cascade('sales-goal', {
  parentId: companyGoal.id,
  contribution: 60, // 60% of company goal
  autoRollup: true
})

// Progress automatically rolls up to parent
const companyProgress = await goals.progress('company-arr')
// Includes all child goal contributions
```

## Goal States

| Status | Description |
|--------|-------------|
| `draft` | Goal defined but not yet active |
| `active` | Goal is being tracked |
| `on_track` | Progress trending toward target |
| `at_risk` | Progress slower than needed |
| `behind` | Likely to miss target |
| `completed` | Target achieved |
| `cancelled` | Goal abandoned |

## Configuration

```typescript
import { Goals } from 'goals.do'

const goals = Goals({
  apiKey: process.env.GOALS_API_KEY
})
```

Or set `GOALS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Setting Goals You Forget

Goals should drive action, not collect dust. Connect them to real data, get automatic updates, and know where you stand every single day.

**Your goals should track themselves.**

```bash
npm install goals.do
```

[Start tracking at goals.do](https://goals.do)

---

MIT License
