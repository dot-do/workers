# workday.do

> Enterprise HCM. AI-native. Deploy in minutes, not months.

## The Problem

Workday changed the world by moving HR to the cloud. But that was 2005.

Today:

- **Implementation takes 6-18 months** - Consultants, configuration, data migration
- **Costs $100K+ annually** - Enterprise licensing, per-employee fees, support contracts
- **AI is a bolt-on** - "Coming soon" features, additional SKUs, integration headaches
- **Complexity as a moat** - The system that manages your people shouldn't need its own team to manage

The irony? Workday was founded to be simpler than PeopleSoft. Twenty years later, it *is* PeopleSoft.

## The Solution

**workday.do** is open-source Human Capital Management that runs on Cloudflare Workers.

- **Deploy in minutes** - Not months
- **AI-native from day one** - Not a feature flag
- **Your data, your infrastructure** - Not their cloud, their terms
- **Enterprise capabilities** - Without enterprise complexity

```bash
npx create-dotdo workday
```

That's it. You now have:

- Employee records with effective dating
- Organizational hierarchies
- Compensation management
- Time off tracking
- Business process workflows
- AI HR assistant

All running on edge infrastructure you control.

## One-Click Deploy

```bash
# Create your HCM instance
npx create-dotdo workday

# Or clone and customize
git clone https://github.com/dotdo/workday.do
cd workday.do
npm install
npm run deploy
```

Your Workday alternative is live. Add your first employee:

```typescript
import { hr } from 'workday.do'

await hr.workers.hire({
  name: 'Alex Chen',
  position: 'Software Engineer',
  organization: 'Engineering',
  startDate: '2025-01-15',
  compensation: {
    salary: 150000,
    currency: 'USD',
    frequency: 'annual'
  }
})
```

## Features

### Workers

The heart of any HCM. Not "employees" - **workers**. Because the future includes contractors, AI agents, and work arrangements we haven't invented yet.

```typescript
// Every worker has a complete history
const alex = await hr.workers.get('alex-chen')

// See their current state
alex.position           // Software Engineer
alex.organization       // Engineering
alex.manager            // Sarah Kim
alex.compensation       // $150,000/year

// Or as of any date
const alexLastYear = await hr.workers.get('alex-chen', { asOf: '2024-01-01' })
```

### Positions

Jobs exist independent of people. Positions are the boxes on the org chart - workers fill them.

```typescript
await hr.positions.create({
  title: 'Senior Software Engineer',
  organization: 'Engineering',
  level: 'IC4',
  headcount: 3,           // Budget for 3
  filled: 2,              // 2 currently filled
  compensationRange: {
    min: 140000,
    max: 200000,
    currency: 'USD'
  }
})
```

### Organizations

Hierarchies that actually work. Teams within teams within teams - traversable, queryable, time-aware.

```typescript
// Get the entire org tree
const company = await hr.orgs.tree()

// Find all engineers (including sub-orgs)
const engineering = await hr.orgs.get('engineering')
const allEngineers = await engineering.allWorkers()  // Recursive

// See the org as it was
const orgLastQuarter = await hr.orgs.tree({ asOf: '2024-10-01' })
```

### Compensation

Total rewards, not just salary. Base, bonus, equity, benefits - all versioned, all auditable.

```typescript
await hr.compensation.adjust({
  worker: 'alex-chen',
  effectiveDate: '2025-03-01',
  changes: {
    baseSalary: 165000,      // Promotion raise
    bonus: { target: 15 },   // 15% target bonus
    equity: {
      grant: 5000,           // RSU grant
      vestingSchedule: '4-year-1-cliff'
    }
  },
  reason: 'promotion',
  approvedBy: 'sarah-kim'
})
```

### Time Off

Accruals, balances, requests, approvals. No spreadsheets required.

```typescript
// Check balance
const pto = await hr.timeOff.balance('alex-chen', 'vacation')
// { accrued: 120, used: 40, available: 80, unit: 'hours' }

// Request time off
await hr.timeOff.request({
  worker: 'alex-chen',
  type: 'vacation',
  start: '2025-02-17',
  end: '2025-02-21',
  hours: 40,
  notes: 'Family vacation'
})
// Automatically routes to manager for approval
```

### Recruiting

Open requisitions, candidates, interview workflows. The pipeline before the payroll.

```typescript
await hr.recruiting.openReq({
  position: 'senior-software-engineer-001',
  hiringManager: 'sarah-kim',
  targetStartDate: '2025-04-01',
  interviewPlan: ['recruiter-screen', 'tech-phone', 'onsite', 'offer']
})
```

### Performance

Goals, reviews, feedback. Continuous performance management, not annual paperwork.

```typescript
await hr.performance.setGoals('alex-chen', {
  period: '2025-H1',
  goals: [
    { objective: 'Ship authentication system', keyResults: ['...'], weight: 40 },
    { objective: 'Mentor two junior engineers', keyResults: ['...'], weight: 30 },
    { objective: 'Reduce API latency by 50%', keyResults: ['...'], weight: 30 }
  ]
})
```

## Effective Dating

This is the superpower most HR systems lack (or charge enterprise prices for).

**Every change in workday.do is versioned with an effective date.** Not just "when it was entered" - when it takes effect.

```typescript
// Schedule a future promotion
await hr.workers.update('alex-chen', {
  effectiveDate: '2025-03-01',  // Takes effect March 1st
  position: 'Senior Software Engineer',
  compensation: { salary: 165000 }
})

// The change is recorded now, but...
const alexToday = await hr.workers.get('alex-chen')
alexToday.position  // 'Software Engineer' (still)

const alexMarch = await hr.workers.get('alex-chen', { asOf: '2025-03-01' })
alexMarch.position  // 'Senior Software Engineer' (future state)

// Time travel through your entire org
const orgHistory = await hr.orgs.history('engineering', {
  from: '2024-01-01',
  to: '2025-12-31'
})
```

**Why this matters:**

- **Retroactive corrections** - Fix past mistakes without losing audit trail
- **Future planning** - Model reorgs before they happen
- **Compliance** - Answer "who reported to whom on March 15th, 2024?"
- **Analytics** - Accurate point-in-time headcount, compensation, structure

## AI HR Assistant

Your HR team gets an AI colleague on day one.

```typescript
import { ada } from 'workday.do/agents'

// Employees ask questions naturally
await ada`How much PTO do I have left?`
// "You have 80 hours of vacation remaining. Your next accrual of 6.67 hours is on February 1st."

await ada`I need to take next Friday off`
// "I've created a time-off request for Friday, January 17th (8 hours vacation).
//  This has been sent to Sarah Kim for approval."

await ada`What's the process for referring a candidate?`
// "To refer a candidate: [detailed process with links]
//  Would you like me to start a referral for a specific person?"
```

**AI-powered workflows:**

- **Onboarding** - Ada guides new hires through paperwork, introductions, setup
- **Offboarding** - Ensures nothing falls through the cracks
- **Policy questions** - Instant answers, not support tickets
- **Manager support** - Helps with reviews, promotions, difficult conversations
- **Analytics** - "Show me attrition trends in Engineering over the last year"

```typescript
// Configure your AI assistant
await hr.config.ai({
  assistant: {
    name: 'Ada',
    personality: 'helpful, professional, slightly warm',
    knowledgeSources: ['handbook', 'policies', 'benefits-guide'],
    escalateTo: 'hr-team@company.com',
    capabilities: {
      createTimeOffRequests: true,
      answerCompensationQuestions: false,  // Sensitive - human only
      scheduleOnboarding: true
    }
  }
})
```

## Enterprise Grade

Open-source doesn't mean toy.

### Audit Trails

Every action is logged. Who changed what, when, why.

```typescript
const history = await hr.audit.query({
  entity: 'worker',
  entityId: 'alex-chen',
  from: '2024-01-01'
})
// [{
//   timestamp: '2024-03-01T00:00:00Z',
//   action: 'compensation.adjust',
//   actor: 'sarah-kim',
//   changes: { baseSalary: { from: 140000, to: 165000 } },
//   reason: 'promotion'
// }, ...]
```

### Role-Based Security

Fine-grained permissions. Managers see their teams. HR sees everyone. Employees see themselves.

```typescript
await hr.security.defineRole('manager', {
  workers: {
    read: 'direct-reports',      // Only their team
    update: 'direct-reports',    // Can update their reports
    compensation: 'view-only'    // Can see but not change
  },
  timeOff: {
    approve: 'direct-reports'    // Approve their team's requests
  }
})
```

### Business Process Flows

Complex approvals made simple. Promotions, transfers, terminations - all with proper routing.

```typescript
await hr.workflows.define('promotion', {
  trigger: 'compensation.adjust where reason = promotion',
  steps: [
    { actor: 'manager', action: 'initiate' },
    { actor: 'hr-partner', action: 'review' },
    { actor: 'comp-team', action: 'approve', condition: 'change > 20%' },
    { actor: 'vp', action: 'approve', condition: 'new-level >= director' }
  ],
  onComplete: 'notify worker, update systems'
})
```

### Compliance Ready

Built for the regulatory reality of HR.

- **Data residency** - Deploy in any Cloudflare region
- **GDPR** - Right to erasure, data portability built-in
- **SOC 2** - Audit logs, access controls, encryption
- **I-9, W-4, etc.** - Form workflows included (US)

## Architecture

workday.do is built on Cloudflare Durable Objects - the same technology powering real-time collaboration at scale.

```
WorkerDO              - Individual employee record
  |                     Bi-temporal data (effective date + transaction time)
  |                     Complete employment history
  |
PositionDO            - Job definition
  |                     Headcount, compensation bands, requirements
  |
OrganizationDO        - Org unit (team, department, division)
  |                     Hierarchy traversal, effective-dated structure
  |
CompensationDO        - Compensation record
  |                     All components, versioned
  |
TimeOffDO             - Leave balances and requests
  |                     Accrual rules, approval workflows
  |
WorkflowDO            - Business process instance
                        Multi-step approvals, routing
```

**Bi-temporal data model:**

```typescript
// Every record has two time dimensions
{
  effectiveDate: '2025-03-01',    // When it takes effect in reality
  transactionTime: '2025-01-15',  // When it was recorded in the system

  // This enables:
  // - "What was true on March 1st?" (as-of query)
  // - "What did we think was true on Jan 15th?" (as-at query)
  // - "What did we think on Jan 15th would be true on March 1st?" (bi-temporal)
}
```

**Storage tiers:**

- **Hot (SQLite in DO)** - Active employees, recent history
- **Warm (R2)** - Terminated employees, older history
- **Cold (R2 Archive)** - Compliance retention, rarely accessed

## Why This Exists

We believe:

1. **HR software should be accessible to all companies** - Not just those with $100K+ budgets
2. **AI should be native, not an add-on** - The future of HR is AI-assisted
3. **Your people data is yours** - Not locked in a vendor's cloud
4. **Open source wins** - The best software is built in the open

Workday (the company) did something important - they proved cloud HR could work. Now it's time for the next evolution: open, AI-native, deployable anywhere.

## Contributing

workday.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/workday.do
cd workday.do
npm install
npm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - Use it, fork it, build on it.

---

**Workers work for you.** Even the ones managing your workers.
