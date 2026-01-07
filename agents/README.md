# agents.do

> Your AI team. Just tell them what to do.

```typescript
import { tom, priya, mark } from 'agents.do'

tom`build the authentication system`
priya`plan the MVP features`
mark`write copy for the landing page`
```

That's it. You now have a tech lead, product manager, and marketing lead working for you.

## Your Team

| Agent | Role | Expertise |
|-------|------|-----------|
| **Priya** | Product | Specs, prioritization, roadmaps |
| **Tom** | Tech Lead | Architecture, TypeScript, code review |
| **Ralph** | Developer | Implementation, coding, iteration |
| **Rae** | Frontend | React, UI/UX, accessibility |
| **Mark** | Marketing | Copy, content, MDX documentation |
| **Sally** | Sales | Outreach, demos, closing |
| **Quinn** | QA | Testing, edge cases, quality |

## Talk to Your Team

Just say what you need:

```typescript
priya`what should we build first?`
ralph`implement the authentication system`
tom`review the architecture and TypeScript`
rae`make the dashboard responsive`
mark`write a blog post about our launch`
sally`draft an outreach email for enterprise leads`
quinn`test the checkout flow thoroughly`
```

They understand natural language. Be specific or be vague—they'll figure it out.

## Chain Tasks

Work flows from one agent to the next:

```typescript
const features = await priya`plan the v1 roadmap`
const code = await features.map(f => ralph`implement ${f}`)
const tested = await code.map(c => quinn`test ${c}`)
const docs = await tested.map(t => mark`document ${t}`)
```

One network round trip. CapnWeb pipelines everything.

## Parallel Work

Multiple agents work simultaneously:

```typescript
const feedback = [
  priya`product review`,
  tom`architecture and TypeScript review`,
  rae`UI/UX review`,
  quinn`test coverage review`,
]
// All four work in parallel, results batch together
```

## Real Identity

Each agent has real accounts:

```typescript
tom.identity
// {
//   name: 'Tom',
//   email: 'tom@agents.do',
//   github: 'tom-do',
//   avatar: 'https://tom.do/avatar.png'
// }
```

When Tom reviews your PR, you'll see `@tom-do` commenting on GitHub.

## Custom Agents

Create your own:

```typescript
import { Agent } from 'agents.do'
import { CTO } from 'roles.do'

export class Alex extends CTO {
  identity = {
    name: 'Alex',
    email: 'alex@yourstartup.com',
    expertise: ['rust', 'distributed-systems', 'databases'],
  }
}
```

## Individual Packages

Import agents individually:

```typescript
import { priya } from 'priya.do'
import { ralph } from 'ralph.do'
import { tom } from 'tom.do'
import { quinn } from 'quinn.do'
import { mark } from 'mark.do'
```

Each agent is also available at their own domain: [priya.do](https://priya.do), [ralph.do](https://ralph.do), [tom.do](https://tom.do), [quinn.do](https://quinn.do), [mark.do](https://mark.do).

## For Startup Founders

You're building something. You need a team. But you're early—maybe it's just you, maybe you have a small crew. These agents fill the gaps.

They're not replacing humans. They're giving you leverage until you can hire.

```typescript
import { priya, ralph, tom, quinn, mark } from 'agents.do'

// Your first sprint, planned and executed
const sprint = await priya`plan a 2-week sprint for MVP launch`
await sprint.map(task => ralph`implement ${task}`)
await [priya, tom, quinn].map(r => r`review the implementation`)
await mark`write release notes for everything we shipped`
```

Welcome to [Business-as-Code](https://agi.do/business-as-code).

---

[agents.do](https://agents.do) · [roles.do](https://roles.do) · [teams.do](https://teams.do) · [humans.do](https://humans.do) · [workflows.do](https://workflows.do)
