# okrs.do

**OKRs that score themselves.**

```bash
npm install okrs.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { okrs } from 'okrs.do'

// Or use the factory for custom config
import { OKRs } from 'okrs.do'
const okrs = OKRs({ baseURL: 'https://custom.example.com' })
```

---

## Your OKRs Are Broken

You set ambitious objectives every quarter. You define key results that should drive the business forward. Then reality hits:

- OKRs become checkbox exercises nobody believes in
- Manual scoring turns into guesswork and politics
- Teams set safe targets to look good on paper
- Misalignment between company, team, and individual goals
- End-of-quarter scrambles to remember what happened
- No connection between OKRs and actual business metrics

**Your goals deserve better than spreadsheets and hope.**

## What If OKRs Actually Worked?

```typescript
import { okrs } from 'okrs.do'

// Describe what you want to achieve
const objective = await okrs.do`
  Become the go-to platform for AI developers.
  Track monthly active users (target: 100k),
  API calls per day (target: 10M),
  and developer NPS (target: 60)
`

// Or define with full control
const growth = await okrs.create({
  objective: 'Double enterprise revenue',
  keyResults: [
    { metric: 'enterprise_arr', target: 2000000, baseline: 1000000 },
    { metric: 'enterprise_customers', target: 50, baseline: 25 },
    { metric: 'avg_contract_value', target: 80000, baseline: 40000, source: 'stripe' }
  ],
  cycle: 'Q1-2025'
})

// Scores update automatically from connected metrics
const score = await okrs.score(growth.id)
console.log(`Progress: ${score.overall}%`) // Real-time, no guessing
```

**okrs.do** gives you:
- Automatic scoring from connected metrics (Stripe, analytics, databases)
- Natural language OKR creation with AI-assisted key results
- Cascading alignment from company to team to individual
- Real-time progress tracking without manual updates
- Honest scores that reflect actual business performance

## Achieve Goals in 3 Steps

### 1. Set Your Objective

```typescript
import { okrs } from 'okrs.do'

// Natural language for quick setup
const objective = await okrs.do`
  Improve customer onboarding experience.
  Track completion rate (target: 85%),
  time to first value (target: under 2 days),
  and onboarding NPS (target: 50)
`

// Full control for precision
const retention = await okrs.create({
  objective: 'Reduce churn and increase customer lifetime value',
  keyResults: [
    { metric: 'monthly_churn', target: 2, baseline: 5, direction: 'decrease' },
    { metric: 'ltv', target: 5000, baseline: 2500, source: 'stripe' },
    { metric: 'expansion_revenue', target: 50000, baseline: 20000 }
  ],
  team: 'customer-success',
  cycle: 'Q2-2025'
})
```

### 2. Define Key Results

```typescript
// Key results connect to real metrics
const okr = await okrs.create({
  objective: 'Build a world-class engineering team',
  keyResults: [
    {
      metric: 'team_size',
      target: 20,
      baseline: 10,
      source: 'hr_system' // Auto-tracked
    },
    {
      metric: 'deployment_frequency',
      target: 50,
      baseline: 10,
      unit: 'per week',
      source: 'github' // Auto-tracked
    },
    {
      metric: 'engineering_nps',
      target: 70,
      baseline: 45,
      source: 'surveys' // Auto-tracked
    }
  ]
})
```

### 3. Track Automatically

```typescript
// Scores update in real-time from connected sources
const score = await okrs.score(okr.id)

console.log(`Overall: ${score.overall}%`)
console.log(`Trend: ${score.trend}`)

score.keyResults.forEach(kr => {
  console.log(`${kr.name}: ${kr.score}% (${kr.progress})`)
})

// Record check-ins when needed
await okrs.checkIn(okr.id, {
  note: 'Hired 3 senior engineers this week',
  confidence: 'high'
})
```

## The Difference

**Without okrs.do:**
- OKRs live in spreadsheets, forgotten until quarter-end
- Scoring is political theater, not reality
- Teams game the system with sandbagged targets
- No connection between goals and actual metrics
- Alignment meetings that change nothing
- Quarterly reviews that surprise everyone

**With okrs.do:**
- OKRs connected to real business metrics
- Automatic scoring based on actual data
- Honest progress visible in real-time
- Cascading alignment from company to individual
- Weekly insights without manual updates
- Reviews that celebrate actual achievements

## Everything You Need

```typescript
// Cascade OKRs from company to teams
const teamOkrs = await okrs.cascade('company_okr_123', {
  to: ['engineering', 'sales', 'product'],
  autoGenerate: true
})

// Align team OKR to company objective
await okrs.align('team_okr_456', {
  parentId: 'company_okr_123',
  contribution: 'Technical foundation for growth'
})

// View alignment tree
const tree = await okrs.tree('company_okr_123')
console.log(`${tree.children.length} aligned OKRs`)

// Manage cycles
const q1 = await okrs.cycle.create({
  name: 'Q1-2025',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-03-31')
})

// Get analytics
const analytics = await okrs.analytics(q1.id)
console.log(`Avg score: ${analytics.avgScore}%`)
console.log(`At risk: ${analytics.atRisk.length} objectives`)
```

## Score Status

| Score | Status | Description |
|-------|--------|-------------|
| 70-100% | On Track | Likely to achieve or exceed target |
| 40-70% | At Risk | Needs attention to hit target |
| 0-40% | Behind | Unlikely to achieve without intervention |

## Configuration

```typescript
// Workers - import env adapter to configure from environment
import 'rpc.do/env'
import { OKRs } from 'okrs.do'

const okrs = OKRs()
```

Or use a custom configuration:

```typescript
import { OKRs } from 'okrs.do'

const okrs = OKRs({
  apiKey: 'your-api-key',
  baseURL: 'https://custom.okrs.do'
})
```

Environment variables `OKRS_API_KEY` or `DO_API_KEY` are automatically configured when using `rpc.do/env`.

## Stop Setting Goals You Cannot Measure

Real objectives connected to real metrics. Automatic scoring that tells the truth. Alignment that actually aligns.

**Your OKRs should drive results, not paperwork.**

```bash
npm install okrs.do
```

[Start achieving at okrs.do](https://okrs.do)

---

MIT License
