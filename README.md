# [Workers.do](https://workers.do)

> AI + Code Workers `.do` work for you.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'

priya`plan the Q1 roadmap`
ralph`build the authentication system`
tom`review the architecture`
mark`write the launch announcement`
```

**workers.do** is the platform for building Autonomous Startups. Your workers are AI agents and humans—and they run on Cloudflare Workers.

Both kinds of workers. Working for you.

## You're a Founder

You need a team, but you're early. Maybe it's just you.

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

Each agent has real identity—email, GitHub account, avatar. When Tom reviews your PR, you'll see `@tom-do` commenting.

## Just Talk to Them

```typescript
import { priya, ralph, tom, mark, quinn } from 'agents.do'

await priya`what should we build next?`
await ralph`implement the user dashboard`
await tom`review the pull request`
await mark`write a blog post about our launch`
await quinn`test ${feature} thoroughly`
```

No method names. No parameters. Just say what you want.

## Work Flows Naturally

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

The `.map()` isn't JavaScript's—it's a remote operation. The callback is recorded, not executed. The server receives the entire pipeline and executes it in one pass.

## Automate Everything

Complex processes run themselves:

```typescript
import { on } from 'workflows.do'
import { priya, ralph, tom, quinn, mark, sally } from 'agents.do'

on.Idea.captured(async idea => {
  const product = await priya`brainstorm ${idea}`
  const backlog = await priya.plan(product)

  for (const issue of backlog.ready) {
    const pr = await ralph`implement ${issue}`

    do await ralph`update ${pr}`
    while (!await pr.approvedBy(quinn, tom, priya))

    await pr.merge()
  }

  await mark`document and launch ${product}`
  await sally`start outbound for ${product}`
})
```

Event-driven. PR-based. Real development workflow.

## Humans When It Matters

AI does the work. Humans make the decisions.

```typescript
import { legal, ceo } from 'humans.do'

const contract = await legal`review this agreement`
const approved = await ceo`approve the partnership`
```

Same syntax. Messages go to Slack, email, or wherever your humans are. Your workflow waits for their response.

## Business-as-Code

Define your entire startup:

```typescript
import { Startup } from 'startups.do'
import { engineering, product, sales } from 'teams.do'
import { dev, sales as salesWorkflow } from 'workflows.do'

export default Startup({
  name: 'Acme AI',
  teams: { engineering, product, sales },
  workflows: { build: dev, sell: salesWorkflow },
  services: ['llm.do', 'payments.do', 'org.ai'],
})
```

That's a company. It builds products, sells them, and grows.

## Platform Services

Everything you need to run a startup:

| Service | What It Does |
|---------|--------------|
| [database.do](https://database.do) | AI-native data with cascading generation |
| [functions.do](https://functions.do) | Code, Generative, Agentic, Human functions |
| [workflows.do](https://workflows.do) | Event-driven orchestration |
| [triggers.do](https://triggers.do) | Webhooks, schedules, events |
| [searches.do](https://searches.do) | Semantic & vector search |
| [actions.do](https://actions.do) | Tool calling & side effects |
| [integrations.do](https://integrations.do) | Connect external services |
| [analytics.do](https://analytics.do) | Metrics, traces, insights |
| [payments.do](https://payments.do) | Stripe Connect billing |
| [services.do](https://services.do) | AI-delivered service marketplace |
| [org.ai](https://org.ai) | Identity, SSO, users, secrets |
| [builder.domains](https://builder.domains) | Free domains for builders |

```typescript
import { llm } from 'llm.do'
import { payments } from 'payments.do'
import { org } from 'org.ai'

await llm`summarize this article`
await payments.charge(customer, amount)
await org.users.invite(email)
```

## The Double Meaning

**workers.do** runs on Cloudflare Workers—the fastest serverless runtime.

Your AI agents and human team members are also workers—digital workers that work for you.

Both kinds of workers. On [workers.do](https://workers.do).

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
