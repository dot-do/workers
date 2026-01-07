# workflows.do

You have a vision for your startup. You should be focused on strategy, customers, and growth - not babysitting every process.

```typescript
import { on } from 'workflows.do'

on.Feature.requested(async feature => {
  await plan(feature)      // Priya specs it out
  await implement(feature) // Ralph builds it
  await review(feature)    // Tom & Quinn review
  await ship(feature)      // Deployed
})
```

Define how your business runs. Then let it run.

## Your Business, Defined

Every startup runs on repeatable processes. Workflows let you define them once:

```typescript
on.Customer.signedUp(customer => {
  welcome(customer)
  setupAccount(customer)
  scheduleOnboarding(customer)
})

on.Deal.qualified(deal => {
  demo(deal)
  propose(deal)
  negotiate(deal)
  close(deal)
})

on.Incident.detected(incident => {
  alert(incident)
  triage(incident)
  fix(incident)
  postmortem(incident)
})
```

You define what happens. The system makes it happen.

## The Pattern

```typescript
on.Noun.verb(async (data) => {
  // Your process here
})
```

That's it. When something happens, your workflow runs.

## Development Workflow

Here's how features get built:

```typescript
import { on, Workflow } from 'workflows.do'
import { priya, ralph, tom, quinn } from 'agents.do'

export const dev = Workflow({
  on: 'Feature.requested',

  plan: {
    agent: priya,
    output: 'spec + issues'
  },

  implement: {
    agent: ralph,
    output: 'PR ready for review'
  },

  review: {
    agents: [priya, tom, quinn],
    approval: 'any 2 of 3',
    output: 'approved PR'
  },

  ship: {
    agent: ralph,
    output: 'deployed to production'
  }
})
```

Ralph implements. Priya, Tom, and Quinn review. You approve when it matters.

## Human Checkpoints

Stay in control of what matters:

```typescript
on.Contract.drafted(async contract => {
  await legalReview(contract)
  await checkpoint('founder')  // You approve
  await send(contract)
})
```

The process pauses. You review. One click to continue.

## Smart Routing

Workflows adapt based on results:

```typescript
on.PR.opened(async pr => {
  const review = await codeReview(pr)

  if (review.approved) {
    await merge(pr)
  } else if (review.needsChanges) {
    await requestChanges(pr)
  } else {
    await escalate(pr)
  }
})
```

## Parallel Work

Multiple agents work at once:

```typescript
on.Launch.planned(async launch => {
  await parallel(
    writeAnnouncement(launch),
    prepareDemo(launch),
    notifyPress(launch),
    updateDocs(launch)
  )

  await checkpoint('founder')
  await publish(launch)
})
```

## Schedules

Some things happen on a cadence:

```typescript
every.monday.at9am(async () => {
  await weeklyDigest()
})

every.day.at6pm(async () => {
  await checkStaleDeals()
})

every.hour(async () => {
  await monitorHealth()
})
```

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

You define the process:

```typescript
// How features get built
on.Feature.requested(feature => dev(feature))

// How deals progress
on.Lead.qualified(lead => sales(lead))

// How content ships
on.Content.drafted(content => marketing(content))

// How incidents resolve
on.Alert.fired(alert => incident(alert))
```

Then focus on what only you can do: vision, strategy, and the decisions that matter.

Your startup runs itself. You run your startup.

---

[workflows.do](https://workflows.do) - [agents.do](https://agents.do) - [humans.do](https://humans.do)
