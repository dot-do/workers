# plans.do

**Turn strategy into execution. Automatically.**

```bash
npm install plans.do
```

---

## Your Plans Are Stuck in Documents

You have a vision. A strategy. Goals that matter. But turning strategy into reality means:

- Plans that live in slides nobody opens
- Roadmaps that are outdated the day they're published
- Stakeholders asking "where are we?" every week
- OKRs tracked in spreadsheets that drift from reality
- No connection between high-level goals and daily work

**Your strategy deserves better than PowerPoint purgatory.**

## What If Plans Executed Themselves?

```typescript
import { plans } from 'plans.do'

// Describe your plan in plain English
const roadmap = await plans.do`
  Launch MVP by Q1, acquire 100 customers by Q2,
  achieve product-market fit by Q3, scale to profitability by Q4
`

// Or define with full control
const strategy = await plans.create({
  name: '2025 Growth Strategy',
  vision: 'Become the default choice for AI-first startups',
  objectives: [
    {
      name: 'Market Leadership',
      keyResults: ['#1 in category reviews', '50% market awareness']
    },
    {
      name: 'Revenue Growth',
      keyResults: ['$1M ARR', '500 paying customers', '< 5% churn']
    }
  ],
  milestones: [
    { name: 'Series A', target: '2025-06-01' },
    { name: 'Team of 20', target: '2025-09-01' }
  ]
})

// Track progress automatically
await plans.milestones.complete('series-a')
const progress = await plans.progress('2025-growth-strategy')
```

**plans.do** gives you:
- Living roadmaps that stay current
- OKRs connected to actual milestones
- Real-time progress across all objectives
- Automatic stakeholder updates
- Integration with your workflow tools

## Plan in 3 Steps

### 1. Define Your Plan

```typescript
import { plans } from 'plans.do'

// Natural language for quick plans
const launch = await plans.do`
  Phase 1: Research and validate problem (4 weeks)
  Phase 2: Build MVP with core features (8 weeks)
  Phase 3: Beta launch with 50 users (4 weeks)
  Phase 4: Public launch and marketing push
`

// Full control for strategic plans
const annual = await plans.create({
  name: 'Annual Operating Plan',
  objectives: [
    {
      name: 'Customer Acquisition',
      keyResults: [
        { name: 'MQLs', target: 10000 },
        { name: 'Conversion Rate', target: '5%' },
        { name: 'CAC', target: '$50' }
      ]
    },
    {
      name: 'Product Excellence',
      keyResults: [
        { name: 'NPS Score', target: 50 },
        { name: 'Uptime', target: '99.9%' },
        { name: 'Feature Velocity', target: '2 per week' }
      ]
    }
  ],
  milestones: [
    { name: 'Q1 Review', target: '2025-04-01' },
    { name: 'Mid-Year Strategy', target: '2025-07-01' },
    { name: 'Annual Planning', target: '2025-10-01' }
  ]
})
```

### 2. Track Progress

```typescript
// Update milestone status
await plans.milestones.complete('q1-review')

// Check overall progress
const status = await plans.progress('annual-operating-plan')
console.log(status.overall)     // 67
console.log(status.onTrack)     // true

// Get timeline view
const timeline = await plans.timeline('annual-operating-plan')
console.log(timeline.criticalPath)  // ['product-launch', 'series-a']

// See what's coming up
const upcoming = await plans.milestones.upcoming({ days: 30 })
const overdue = await plans.milestones.overdue()
```

### 3. Adapt and Share

```typescript
// Update plans as things change
await plans.update('annual-operating-plan', {
  objectives: [...currentObjectives, newObjective]
})

// Share with stakeholders
await plans.share('annual-operating-plan', {
  shareWith: 'investors@firm.com',
  shareType: 'view'
})

// Version control for plans
const versions = await plans.versions('annual-operating-plan')
await plans.restore('annual-operating-plan', versions[0].id)

// Sync with your tools
await plans.sync('annual-operating-plan', {
  type: 'notion',
  config: { databaseId: 'xxx' }
})
```

## The Difference

**Without plans.do:**
- Strategy decks that gather dust
- Quarterly check-ins on outdated roadmaps
- "What's the status?" meetings every week
- OKRs nobody remembers after January
- Disconnect between vision and execution
- Plans that exist only in someone's head

**With plans.do:**
- Living plans that update themselves
- Real-time progress visible to everyone
- Automatic milestone tracking
- OKRs connected to actual work
- Strategy to execution in one place
- Plans that survive the person who made them

## Everything You Need

```typescript
// Objective tracking
const objectives = plan.objectives.map(obj => ({
  name: obj.name,
  progress: obj.progress,
  status: obj.status
}))

// Milestone dependencies
await plans.milestones.add('product-launch', {
  name: 'Public Launch',
  target: '2025-06-01',
  dependencies: ['beta-complete', 'marketing-ready'],
  deliverables: ['Landing page', 'Press release', 'Demo video']
})

// Plan analytics
const analytics = await plans.analytics('annual-plan')
console.log(analytics.completionRate)    // 72%
console.log(analytics.avgMilestoneDelay) // 3.5 days
console.log(analytics.riskAreas)         // ['hiring', 'revenue']

// Duplicate for new cycles
const nextYear = await plans.duplicate('2025-plan', {
  name: '2026 Operating Plan'
})

// Archive completed plans
await plans.archive('2024-plan')
```

## Plan Status

| Status | Description |
|--------|-------------|
| `draft` | Plan is being created, not yet active |
| `active` | Plan is live and being tracked |
| `completed` | All objectives and milestones achieved |
| `archived` | Plan retained for reference |

## Configuration

```typescript
import { Plans } from 'plans.do'

const plans = Plans({
  apiKey: process.env.PLANS_API_KEY
})
```

Or set `PLANS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Planning, Start Executing

Strategy without execution is just a dream. Execution without strategy is just chaos. Connect them both in code that actually runs.

**Your plans should drive your business, not decorate your drive.**

```bash
npm install plans.do
```

[Start planning at plans.do](https://plans.do)

---

MIT License
