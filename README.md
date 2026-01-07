# [Workers.do](https://workers.do)

You're a founder. You need a team.

```typescript
import { product, engineering, marketing } from 'teams.do'

const mvp = await product`define the MVP`
const app = await engineering`build ${mvp}`
await marketing`launch ${app}`
```

That's your startup. Running.

## Meet Your Team

| Agent | Role |
|-------|------|
| **Priya** | Product—specs, roadmaps, priorities |
| **Ralph** | Engineering—builds what you need |
| **Tom** | Tech Lead—architecture, code review |
| **Rae** | Frontend—React, UI, accessibility |
| **Mark** | Marketing—copy, content, launches |
| **Sally** | Sales—outreach, demos, closing |
| **Quinn** | QA—testing, edge cases, quality |

Just tell them what you need:

```typescript
import { priya, ralph, tom, mark, quinn } from 'agents.do'

await priya`what should we build next?`
await ralph`implement the user dashboard`
await tom`review the pull request`
await mark`write a blog post about our launch`
await quinn`test the checkout flow`
```

## Build Features

Work flows through your team naturally:

```typescript
const spec = await priya`spec out user authentication`
const code = await ralph`build ${spec}`
const reviewed = await tom`review ${code}`
const docs = await mark`document ${reviewed}`
```

Or pipeline an entire sprint:

```typescript
const sprint = await priya`plan the sprint`
  .map(issue => ralph`build ${issue}`)
  .map(code => tom`review ${code}`)
```

Each agent passes their work to the next. No boilerplate. No orchestration code.

## Automate Everything

Your startup responds to events automatically:

```typescript
import { on } from 'workflows.do'

on.idea(async idea => {
  const spec = await priya`evaluate ${idea}`
  const code = await ralph`build ${spec}`
  await tom`review ${code}`
  await mark`announce ${code}`
})

on.bug(async bug => {
  const fix = await ralph`fix ${bug}`
  await quinn`verify ${fix}`
})

on.customer.signup(async customer => {
  await sally`welcome ${customer}`
})
```

## Humans When It Matters

AI does the work. Humans make the decisions.

```typescript
import { legal, ceo } from 'humans.do'

const contract = await legal`review this agreement`
const approved = await ceo`approve the partnership`
```

Same syntax. Messages go to Slack, email, or wherever your humans are. Your workflow waits for their response.

## Your Startup in Code

```typescript
import { Startup } from 'startups.do'
import { engineering, product, sales } from 'teams.do'

export default Startup({
  name: 'Acme AI',
  teams: { engineering, product, sales },
})
```

That's a company. It builds products, sells them, and grows.

## Everything You Need

**AI** — [llm.do](https://llm.do) powers your agents
**Payments** — [payments.do](https://payments.do) handles billing
**Identity** — [org.ai](https://org.ai) manages users and auth
**Database** — [database.do](https://database.do) stores your data
**Workflows** — [workflows.do](https://workflows.do) runs your processes
**Domains** — [builder.domains](https://builder.domains) gives you free domains

```typescript
import { llm } from 'llm.do'
import { payments } from 'payments.do'
import { org } from 'org.ai'

await llm`summarize this article`
await payments.charge(customer, amount)
await org.users.invite(email)
```

## Get Started

```bash
npm install agents.do
```

```typescript
import { priya, ralph, tom } from 'agents.do'

const idea = await priya`what should we build?`
const code = await ralph`build ${idea}`
const shipped = await tom`review and ship ${code}`
```

You just shipped your first feature. With a team.

---

**Solo founders** — Get a team without hiring one.

**Small teams** — AI does the work, humans decide.

**Growing startups** — Add humans without changing code.

---

[workers.do](https://workers.do) | [agents.do](https://agents.do) | [teams.do](https://teams.do) | [workflows.do](https://workflows.do)
