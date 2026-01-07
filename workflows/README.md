# workflows.do

> Processes that run themselves.

```typescript
import { dev } from 'workflows.do'

dev`add real-time notifications`
// brainstorm → plan → implement → review → ship
```

Workflows orchestrate agents, humans, and teams through multi-step processes. Define once, run forever.

## Built-in Workflows

| Workflow | Phases | Description |
|----------|--------|-------------|
| **dev** | brainstorm → plan → implement → review | Full development cycle |
| **review** | analyze → review → feedback | Multi-agent PR review |
| **marketing** | draft → edit → approve → publish | Content and campaigns |
| **sales** | qualify → demo → propose → close | Deal progression |
| **incident** | alert → triage → fix → postmortem | Production issues |

## The Dev Workflow

The complete development workflow:

```typescript
import { dev } from 'workflows.do'

dev`build user authentication`
```

What happens:
1. **Brainstorm** — Human defines requirements (via Slack/chat)
2. **Plan** — Priya creates issues with specs
3. **Implement** — Ralph builds each issue
4. **Review** — Priya, Tom, Quinn review in parallel
5. **Approve** — Human signs off
6. **Ship** — Merged and deployed

One line of code. Full development cycle.

## Workflow Definition

```typescript
import { Workflow } from 'workflows.do'
import { priya, ralph, tom, quinn } from 'agents.do'
import { pdm } from 'humans.do'

export const dev = Workflow({
  name: 'Development',

  phases: {
    brainstorm: {
      assignee: pdm,
      then: 'plan',
    },

    plan: {
      assignee: priya,
      then: 'implement',
    },

    implement: {
      assignee: ralph,
      then: 'review',
    },

    review: {
      assignee: [priya, tom, quinn],  // Parallel
      then: ({ approved }) => approved ? 'ship' : 'fix',
    },

    fix: {
      assignee: ralph,
      then: 'review',  // Loop back
    },

    ship: {
      assignee: ralph,
      then: null,  // Done
    },
  },
})
```

## Human Checkpoints

Pause for human approval:

```typescript
phases: {
  review: {
    assignee: [tom, rae, quinn],
    checkpoint: true,  // Pause here
    then: 'ship',
  },
}
```

The workflow pauses until a human approves. Then continues automatically.

## Conditional Flow

Branch based on results:

```typescript
phases: {
  review: {
    assignee: engineering,
    then: ({ result }) => {
      if (result.approved) return 'ship'
      if (result.needsWork) return 'fix'
      if (result.blocked) return 'escalate'
    },
  },
}
```

## Parallel Phases

Multiple agents work simultaneously:

```typescript
phases: {
  review: {
    assignee: [tom, rae, quinn],
    parallel: true,
    then: 'approve',
  },
}
```

All three review at once. Results merge.

## Custom Workflows

Create workflows for your business:

```typescript
import { Workflow } from 'workflows.do'
import { sales, legal, founder } from 'humans.do'

const dealFlow = Workflow({
  name: 'Enterprise Deal',

  phases: {
    qualify: { assignee: sales, then: 'demo' },
    demo: { assignee: sales, then: 'propose' },
    propose: { assignee: sales, then: 'legal' },
    legal: { assignee: legal, then: 'approve', checkpoint: true },
    approve: { assignee: founder, then: 'close', checkpoint: true },
    close: { assignee: sales, then: null },
  },
})

dealFlow`Acme Corp wants enterprise pricing`
```

## Event-Driven

Workflows respond to events:

```typescript
import { Workflow } from 'workflows.do'

const onboarding = Workflow($ => {
  $.on.Customer.signedUp(async (customer) => {
    await $.do('welcome', customer)
    await $.do('setupAccount', customer)
    await $.do('scheduleOnboarding', customer)
  })

  $.every.day.at9am(async () => {
    await $.do('checkStuckOnboarding')
  })
})
```

Built on [ai-workflows](https://npmjs.com/ai-workflows).

## Workflow Status

Track where things are:

```typescript
const status = await devLoop.status('feature-123')
// {
//   phase: 'review',
//   assignee: ['tom', 'rae', 'quinn'],
//   started: '2024-01-15T10:00:00Z',
//   history: [...]
// }
```

## For Founders

Your business is a set of workflows:

- How features get built (`dev`)
- How code gets reviewed (`review`)
- How content gets published (`marketing`)
- How deals get closed (`sales`)
- How incidents get handled (`incident`)

Define them once. They run forever. Your business operates itself.

```typescript
import { dev, marketing, sales } from 'workflows.do'

// Your business, automated
dev`build the next feature`
marketing`write the weekly newsletter`
sales`follow up with enterprise leads`
```

This is [Business-as-Code](https://agi.do/business-as-code).

---

[workflows.do](https://workflows.do) · [agents.do](https://agents.do) · [roles.do](https://roles.do) · [teams.do](https://teams.do) · [humans.do](https://humans.do)
