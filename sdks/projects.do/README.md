# projects.do

**Projects that run themselves.**

```bash
npm install projects.do
```

---

## Project Management Is Killing Your Velocity

You have ambitious projects to deliver. Product launches. Platform migrations. Feature releases. Company initiatives.

But managing them means:
- Endless status meetings that could have been a dashboard
- Resource conflicts nobody sees until it's too late
- Spreadsheets and docs that are always out of date
- No single source of truth for what's actually happening
- PM overhead that slows everything down
- Surprises that blow up timelines and budgets

**Your projects deserve to manage themselves.**

## What If Projects Just Shipped?

```typescript
import { projects } from 'projects.do'

// Describe your project in plain English
const launch = await projects.do`
  Launch mobile app v2.0 with 3 phases:
  Discovery (2 weeks), Development (8 weeks), Launch (2 weeks).
  Budget $50k, need 2 developers, 1 designer, 1 PM.
`

// Or define with full control
const migration = await projects.create({
  name: 'Platform Migration',
  description: 'Migrate from legacy monolith to microservices',
  phases: [
    { name: 'Assessment', duration: '2 weeks' },
    { name: 'Migration', duration: '12 weeks' },
    { name: 'Validation', duration: '4 weeks' }
  ],
  budget: { total: 150000, currency: 'USD' }
})

// Assign resources - AI handles conflicts
await projects.team.assign(migration.id, {
  email: 'alice@example.com',
  role: 'lead',
  allocation: 80
})

// Check health anytime
const health = await projects.health(migration.id)
// { score: 85, status: 'healthy', issues: [], recommendations: [...] }
```

**projects.do** gives you:
- AI-native project creation from natural language
- Automatic resource conflict detection
- Real-time health monitoring and alerts
- Single source of truth for all stakeholders
- Intelligent timeline and budget forecasting

## Ship in 3 Steps

### 1. Define Your Project

```typescript
import { projects } from 'projects.do'

// Natural language for quick setup
const project = await projects.do`
  Q1 product roadmap: 3 features over 10 weeks.
  Feature A (auth), Feature B (payments), Feature C (analytics).
  Team: 3 engineers, 1 designer. Budget $75k.
`

// Full control for complex projects
const enterprise = await projects.create({
  name: 'Enterprise Platform',
  priority: 'critical',
  phases: [
    { name: 'Discovery', duration: '3 weeks' },
    { name: 'Design', duration: '4 weeks' },
    { name: 'Development', duration: '16 weeks' },
    { name: 'Testing', duration: '4 weeks' },
    { name: 'Launch', duration: '2 weeks' }
  ],
  budget: { total: 500000, currency: 'USD' }
})
```

### 2. Assign Resources

```typescript
// Build your team
await projects.team.assign(project.id, {
  email: 'alice@example.com',
  role: 'lead',
  allocation: 100,
  skills: ['backend', 'architecture']
})

await projects.team.assign(project.id, {
  email: 'bob@example.com',
  role: 'member',
  allocation: 80,
  skills: ['frontend', 'react']
})

// Allocate budget
await projects.budget.set(project.id, {
  total: 75000,
  categories: [
    { name: 'Engineering', allocated: 50000 },
    { name: 'Design', allocated: 15000 },
    { name: 'Infrastructure', allocated: 10000 }
  ]
})

// Check for conflicts automatically
const conflicts = await projects.resources.conflicts(project.id)
// AI alerts you before problems happen
```

### 3. Ship

```typescript
// Real-time project health
const health = await projects.health(project.id)
console.log(health.score) // 92
console.log(health.status) // 'healthy'

// Analytics and forecasting
const analytics = await projects.analytics(project.id)
console.log(analytics.predictedCompletion) // 2024-03-15
console.log(analytics.velocity) // 24 points/week

// Executive reports on demand
const report = await projects.report(project.id, {
  format: 'executive',
  includeAnalytics: true,
  includeBudget: true
})
```

## The Difference

**Without projects.do:**
- Weekly status meetings eating hours
- Spreadsheets nobody updates
- Resource conflicts discovered too late
- Budgets blown with no warning
- Executives asking "where are we?"
- PMs drowning in coordination

**With projects.do:**
- Real-time dashboards, not meetings
- Single source of truth, always current
- AI detects conflicts before they happen
- Budget forecasting with early warnings
- Instant reports for any stakeholder
- Projects that manage themselves

## Everything You Need

```typescript
// Phase management
await projects.phases.add(project.id, {
  name: 'Beta Launch',
  duration: '2 weeks',
  dependencies: ['development-phase-id']
})

await projects.phases.addDeliverable('phase-id', {
  name: 'Beta APK',
  assignee: 'bob@example.com',
  dueDate: new Date('2024-02-15')
})

// Risk management
await projects.risks.identify(project.id, {
  name: 'API Rate Limits',
  description: 'Third-party API may throttle during launch',
  probability: 'medium',
  impact: 'high',
  mitigation: 'Implement caching layer'
})

const assessment = await projects.risks.assess(project.id)
console.log(assessment.recommendations)

// Timeline management
const timeline = await projects.timeline.get(project.id)
console.log(timeline.criticalPath) // ['discovery', 'development', 'launch']
console.log(timeline.slippage) // 0 days

await projects.timeline.addMilestone(project.id, {
  name: 'MVP Complete',
  date: new Date('2024-02-01')
})

// Budget tracking
await projects.budget.spend(project.id, {
  amount: 5000,
  category: 'Infrastructure',
  description: 'Cloud hosting setup'
})

const forecast = await projects.budget.forecast(project.id)
console.log(forecast.runwayDays) // 45
```

## Project States

| Status | Description |
|--------|-------------|
| `draft` | Project created but not yet started |
| `planning` | Project is being planned and resourced |
| `active` | Project is actively being executed |
| `on_hold` | Project is temporarily paused |
| `completed` | Project finished successfully |
| `cancelled` | Project was cancelled |

## Configuration

```typescript
import { Projects } from 'projects.do'

const projects = Projects({
  apiKey: process.env.PROJECTS_API_KEY
})
```

Or set `PROJECTS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Managing, Start Shipping

Projects don't need managers. They need clear goals, the right resources, and intelligent systems that surface problems before they become crises.

**Let your projects run themselves.**

```bash
npm install projects.do
```

[Start shipping at projects.do](https://projects.do)

---

MIT License
