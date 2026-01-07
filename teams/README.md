# teams.do

> You have a vision. Now you have a team.

```typescript
import { engineering } from 'teams.do'

engineering`we need a login system by Friday`
```

That's it. Tom coordinates the work. Ralph builds the backend. The team delivers.

## Your Teams

```typescript
import { engineering, product, marketing, sales } from 'teams.do'

engineering`build the dashboard`
product`plan Q2 roadmap`
marketing`write the launch campaign`
sales`close the Acme deal`
```

Each team is a mix of AI agents and humans. You talk to the team. They figure out the rest.

## How It Works

You say what you need:

```typescript
engineering`add Stripe payments`
```

Behind the scenes:
- Tom (lead) breaks down the work
- Ralph builds the integration
- The team coordinates, reviews, ships
- You get notified when it's done

One request. Full execution.

## Run Your Company

```typescript
// Monday morning
product`what should we build this sprint?`

// Got customer feedback
engineering`users are complaining about slow load times`

// Preparing for launch
marketing`we're announcing next Tuesday, get everything ready`

// Big opportunity
sales`enterprise prospect wants a demo Thursday`
```

Talk to your teams like you'd talk to department heads. They handle coordination, delegation, and execution.

## Solo Founder? You Still Have Teams

```typescript
import { engineering, product, marketing } from 'teams.do'

const spec = await product`define the MVP for a todo app`
const app = await engineering`build ${spec}`
await marketing`launch ${app}`
```

Day one, you have departments. As you grow, add humans:

```typescript
engineering.add(sarahTheNewHire)
```

Same conversation. Bigger team. Your workflow doesn't change.

## Inside a Team

```typescript
import { Team } from 'teams.do'

export const engineering = Team({
  name: 'Engineering',
  members: [tom, ralph, rae, quinn],  // AI agents
  lead: tom,
})
```

Add humans when you're ready:

```typescript
import { sarah, mike } from 'humans.do'

engineering.add(sarah, mike)
```

AI and humans work together. The team routes work to whoever handles it best.

## Teams Talk to Teams

```typescript
// Product specs it
const feature = await product`spec out the new onboarding flow`

// Engineering builds it
await engineering`build ${feature}`

// Marketing announces it
await marketing`write the announcement for ${feature}`
```

You orchestrate at the company level. Teams handle the details.

## Your Org, Your Way

```typescript
import { Team } from 'teams.do'

const founders = Team({
  name: 'Founders',
  members: [you, cofounder, tom, priya],
  lead: you,
})

founders`should we raise a Series A?`
```

Create any team structure that fits how you work.

---

**You're the founder. You set the vision. Your teams make it real.**

[teams.do](https://teams.do) | [agents.do](https://agents.do) | [humans.do](https://humans.do)
