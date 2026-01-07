# teams.do

> Tell the team what to do. They figure out who does what.

```typescript
import { engineering, product, sales } from 'teams.do'

engineering`build the new dashboard`
product`plan Q2 roadmap`
sales`close the enterprise deal`
```

Teams are groups of agents and humans. You talk to the team, not individuals.

## Available Teams

| Team | Members | Focus |
|------|---------|-------|
| **engineering** | Tom, Rae, Quinn + human devs | Building software |
| **product** | Priya + human PDMs | What to build |
| **marketing** | Mark + human marketers | Telling the story |
| **sales** | Sally + human AEs | Closing deals |
| **leadership** | CEO, CTO, CFO, CMO, CRO | Strategy & decisions |

## Just Talk

```typescript
engineering`we need a login system`
```

The team figures out:
- Tom handles the backend auth
- Rae builds the React components
- Quinn writes the tests
- Work happens in parallel
- Results come back together

You don't coordinate. They do.

## Parallel by Default

```typescript
const reviews = await engineering`review this PR`
// Tom reviews architecture
// Rae reviews frontend
// Quinn checks test coverage
// All in parallel, one round trip
```

## Team Composition

```typescript
import { Team } from 'teams.do'
import { tom, rae, quinn } from 'agents.do'
import { dev, qa } from 'humans.do'

export const engineering = Team({
  name: 'Engineering',
  members: [tom, rae, quinn, dev, qa],
  lead: tom,
})
```

Mix agents and humans. The team routes work appropriately.

## Delegation

Teams delegate internally:

```typescript
engineering`build the payment integration`
```

The lead (Tom) might:
1. Take the architecture himself
2. Delegate Stripe UI to Rae
3. Delegate test cases to Quinn
4. Escalate compliance questions to human

You just asked for payment integration. The team handled the rest.

## Cross-Team Work

Teams coordinate with each other:

```typescript
import { engineering, product, marketing } from 'teams.do'

// Product defines it
const spec = await product`spec out the new feature`

// Engineering builds it
const code = await engineering`build ${spec}`

// Marketing announces it
await marketing`write launch content for ${spec}`
```

## Team Workflows

Attach workflows to teams:

```typescript
import { Team } from 'teams.do'
import { dev, review } from 'workflows.do'

export const engineering = Team({
  name: 'Engineering',
  members: [tom, rae, quinn],
  workflows: [dev, review],
})

// Now this triggers the full dev workflow
engineering`build the feature`
// brainstorm → plan → implement → review → ship
```

## Custom Teams

Create teams for your business:

```typescript
import { Team } from 'teams.do'
import { tom, mark } from 'agents.do'
import { founder, advisor } from 'humans.do'

const founders = Team({
  name: 'Founders',
  members: [founder, advisor, tom, mark],
  lead: founder,
})

founders`decide on our Series A strategy`
```

## The Org Chart

Teams form your org structure:

```
           leadership
          /    |    \
   product  engineering  sales
      |         |          |
    priya    tom,rae    sally
             quinn
```

Work flows down. Escalations flow up. Status flows everywhere.

## For Solo Founders

Start with AI teams:

```typescript
import { engineering, product, marketing } from 'teams.do'

// You have departments, even if it's just you
product`define the MVP`
engineering`build it`
marketing`launch it`
```

As you hire, add humans to the teams:

```typescript
engineering.add(newHire)
```

Same interface. The team grows. Your code doesn't change.

---

[teams.do](https://teams.do) · [agents.do](https://agents.do) · [roles.do](https://roles.do) · [humans.do](https://humans.do) · [workflows.do](https://workflows.do)
