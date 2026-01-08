# workflows.do

You have a vision for your startup. You should be focused on strategy, customers, and growth - not babysitting every process.

```typescript
import { Workflow } from 'workflows.do'
import { priya, ralph, tom, quinn } from 'agents.do'

// Define your workflow with phases
export const dev = Workflow({
  name: 'Development',
  phases: {
    plan: { assignee: priya, then: 'implement' },
    implement: { assignee: ralph, then: 'review' },
    review: { assignee: [tom, quinn], checkpoint: true, then: 'ship' },
    ship: { assignee: ralph, then: null }
  }
})

// Use it with natural language
dev`add stripe integration`
```

Define how your business runs. Then let it run.

## Your Business, Defined

Every startup runs on repeatable processes. Workflows let you define them as phases:

```typescript
import { Workflow } from 'workflows.do'
import { sally, rae, mark } from 'agents.do'

// Customer onboarding workflow
export const onboarding = Workflow({
  name: 'Onboarding',
  phases: {
    welcome: { assignee: sally, then: 'setup' },
    setup: { assignee: rae, then: 'schedule' },
    schedule: { assignee: sally, then: null }
  }
})

// Sales workflow
export const sales = Workflow({
  name: 'Sales',
  phases: {
    demo: { assignee: sally, then: 'propose' },
    propose: { assignee: sally, then: 'negotiate' },
    negotiate: { assignee: sally, checkpoint: true, then: 'close' },
    close: { assignee: sally, then: null }
  }
})

// Incident response workflow
export const incident = Workflow({
  name: 'Incident',
  phases: {
    alert: { assignee: tom, then: 'triage' },
    triage: { assignee: tom, then: 'fix' },
    fix: { assignee: ralph, then: 'postmortem' },
    postmortem: { assignee: [tom, priya], then: null }
  }
})
```

You define the phases. The system orchestrates them.

## The Pattern

```typescript
export const myworkflow = Workflow({
  name: 'Workflow Name',
  phases: {
    start: { assignee: agent, then: 'next' },
    next: { assignee: [agent1, agent2], checkpoint: true, then: null }
  }
})
```

Each phase has an `assignee` (who does the work) and `then` (what happens next).

## Development Workflow

Here's how features get built:

```typescript
import { Workflow } from 'workflows.do'
import { priya, ralph, tom, quinn } from 'agents.do'

export const dev = Workflow({
  name: 'Development',
  phases: {
    plan: {
      assignee: priya,
      then: 'implement'
    },
    implement: {
      assignee: ralph,
      then: 'review'
    },
    review: {
      assignee: [priya, tom, quinn],
      checkpoint: true,  // Wait for human approval
      then: 'ship'
    },
    ship: {
      assignee: ralph,
      then: null  // End of workflow
    }
  }
})

// Use it with natural language
dev`add authentication system`
```

Priya plans. Ralph implements. Priya, Tom, and Quinn review. You approve when it matters.

## Human Checkpoints

Stay in control of what matters:

```typescript
export const contracts = Workflow({
  name: 'Contracts',
  phases: {
    draft: { assignee: mark, then: 'legalReview' },
    legalReview: { assignee: tom, then: 'approval' },
    approval: { assignee: 'founder', checkpoint: true, then: 'send' },
    send: { assignee: sally, then: null }
  }
})
```

The process pauses at checkpoints. You review. One click to continue.

## Smart Routing

Workflows can adapt based on results using conditional `then`:

```typescript
export const review = Workflow({
  name: 'Code Review',
  phases: {
    review: {
      assignee: [tom, quinn],
      then: (result) => {
        // Dynamic routing based on review outcome
        if (result.approved) return 'merge'
        if (result.needsChanges) return 'revise'
        return 'escalate'
      }
    },
    merge: { assignee: ralph, then: null },
    revise: { assignee: ralph, then: 'review' },
    escalate: { assignee: 'cto', checkpoint: true, then: 'review' }
  }
})
```

Phases can route dynamically based on outcomes.

## Parallel Work

Multiple agents can work in parallel on the same phase:

```typescript
export const launch = Workflow({
  name: 'Launch',
  phases: {
    prepare: {
      assignee: [mark, rae, sally, mark],  // All work in parallel
      parallel: true,  // Wait for all to complete
      then: 'approval'
    },
    approval: {
      assignee: 'founder',
      checkpoint: true,
      then: 'publish'
    },
    publish: {
      assignee: mark,
      then: null
    }
  }
})
```

Multiple agents execute in parallel, workflow continues when all complete.

## Schedules

Some workflows run on a schedule:

```typescript
import { schedule, Workflow } from 'workflows.do'

// Run workflow on a schedule
schedule('0 9 * * 1', digest)  // Every Monday at 9am
schedule('0 18 * * *', dealCheck)  // Every day at 6pm
schedule('0 * * * *', healthCheck)  // Every hour

// Or define scheduled workflows
export const digest = Workflow({
  name: 'Weekly Digest',
  schedule: '0 9 * * 1',  // Cron syntax
  phases: {
    gather: { assignee: priya, then: 'send' },
    send: { assignee: mark, then: null }
  }
})
```

Workflows can be triggered by time, events, or API calls.

## Built-in Workflows

Start with these, customize as you grow:

| Workflow | What it does |
|----------|--------------|
| `dev` | Feature requested through shipped |
| `review` | PR opened through merged |
| `marketing` | Content drafted through published |
| `sales` | Lead qualified through closed |
| `incident` | Alert through postmortem |
| `onboarding` | Signup through activated |

```typescript
import { dev, sales, marketing } from 'workflows.do'

// These already work
dev`add stripe integration`
sales`follow up with Acme Corp`
marketing`write the launch announcement`
```

## Your Startup, Automated

You define workflows once, then use them everywhere:

```typescript
import { dev, sales, marketing, incident } from 'workflows.do'

// Use workflows with natural language
dev`add stripe integration`
sales`follow up with Acme Corp`
marketing`write the launch announcement`
incident`fix the login bug`

// Or programmatically
await dev.run({ feature: 'stripe integration' })
await sales.run({ lead: 'Acme Corp' })
```

Then focus on what only you can do: vision, strategy, and the decisions that matter.

Your startup runs itself. You run your startup.

## Alternative Patterns

For simple, imperative workflows, you can also use event handlers:

```typescript
import { on } from 'workflows.do'

// Event-driven pattern (use for simple cases)
on.Customer.signedUp(async customer => {
  await welcome(customer)
  await setupAccount(customer)
  await scheduleOnboarding(customer)
})

// For complex workflows with human checkpoints, use phases
export const onboarding = Workflow({ ... })
```

Use event handlers for simple, linear processes. Use phases for complex workflows with branching, parallelism, and human checkpoints.

---

[workflows.do](https://workflows.do) - [agents.do](https://agents.do) - [humans.do](https://humans.do)
