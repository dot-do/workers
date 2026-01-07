# [Workers.do](https://workers.do) [Services-as-Software](https://services.as/software)

> AI + Code Workers `.do` work for you.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'

priya`plan the Q1 roadmap`
ralph`build the authentication system`
tom`review the architecture`
mark`write the launch announcement`
```

**workers.do** is the platform for building Autonomous Startups with [Business-as-Code](https://agi.do/business-as-code). Your workers are AI agents and humans—and they run on Cloudflare Workers.

Both kinds of workers. Working for you.

## The Vision

You're a founder. You need a team, but you're early. Maybe it's just you.

**workers.do** gives you an AI team that works like real people:

```typescript
import { engineering, product, marketing } from 'teams.do'

const mvp = await product`define the MVP`
const app = await engineering`build ${mvp}`
await marketing`launch ${app}`
```

That's your startup. Running.

## Your Team

| Agent | Role | What They Do |
|-------|------|--------------|
| **Priya** | Product | Specs, prioritization, roadmaps, product review |
| **Ralph** | Developer | Implementation, coding, iteration |
| **Tom** | Tech Lead | Architecture, TypeScript, code review |
| **Rae** | Frontend | React, UI/UX, accessibility |
| **Mark** | Marketing | Copy, content, documentation |
| **Sally** | Sales | Outreach, demos, closing |
| **Quinn** | QA | Testing, edge cases, quality |

Each agent has real identity—email, GitHub account, avatar. When Tom reviews your PR, you'll see `@tom-do` commenting.

## Natural Language

Just tell them what you need:

```typescript
priya`what should we build next?`
ralph`implement the user dashboard`
tom`review the pull request`
mark`write a blog post about our launch`
quinn`test ${feature} thoroughly`
```

No method names. No parameters. Just say what you want.

## Promise Pipelining

Chain promises without round trips:

```typescript
const spec = await priya`spec out user auth`
const code = await ralph`implement ${spec}`
const reviews = await [priya, tom, quinn].map(r => r`review ${code}`)
const docs = await mark`document ${code}`
```

Or pipeline everything in a single network call:

```typescript
const shipped = await priya`plan ${feature}`
  .map(issue => ralph`implement ${issue}`)
  .map(code => [priya, tom, quinn].map(r => r`review ${code}`))
```

No `Promise.all`. No callback hell. One round trip.

### Magic Map

The `.map()` isn't JavaScript's—it's a remote operation:

```typescript
// This doesn't fetch issues, then loop locally
// It records the transform and executes remotely
const implementations = await priya`plan the sprint`
  .map(issue => ralph`implement ${issue}`)
```

The callback `issue => ralph\`implement ${issue}\`` is recorded, not executed. The server receives the entire pipeline and executes it in one pass. Results stream back.

This is [CapnWeb](https://github.com/cloudflare/capnweb) pipelining—record-replay promises that batch automatically. See [rpc.do](https://rpc.do) for the technical details.

## Workflows

Complex processes run themselves:

```typescript
import { on } from 'workflows.do'
import { priya, ralph, tom, quinn, mark } from 'agents.do'

on.Idea.captured(async idea => {
  const product = await priya`brainstorm ${idea}`
  const backlog = await priya.plan.tdd`${product}`

  for (const issue of backlog) {
    const pr = await ralph`implement ${issue}`

    do await ralph`update ${pr}`
    while (!await pr.approvedBy(quinn, tom, priya))

    await pr.merge()
  }

  await mark`document ${product}`
})
```

Event-driven. PR-based. Real development workflow.

## When You Need Humans

Same interface, different workers:

```typescript
import { pdm, legal, ceo } from 'humans.do'

await pdm`approve this spec`      // → Slack message, waits for response
await legal`review this contract` // → Email with attachment
await ceo`sign off on funding`    // → Chat with approve/reject buttons
```

AI agents do the work. Humans make the decisions.

## The Architecture

```
roles/        Base job descriptions (CEO, CTO, PDM, Dev...)
agents/       AI workers (Priya, Tom, Rae, Mark, Sally, Quinn)
humans/       Human workers (via Slack, Email, Teams, Discord)
teams/        Groups (Engineering, Product, Sales, Marketing)
workflows/    Processes (DevLoop, CodeReview, SalesCycle)
```

[roles.do](https://roles.do) · [agents.do](https://agents.do) · [humans.do](https://humans.do) · [teams.do](https://teams.do) · [workflows.do](https://workflows.do)

## The Double Meaning

**workers.do** runs on Cloudflare Workers—the fastest serverless runtime.

Your AI agents and human team members are also workers—digital workers that work for you.

Both kinds of workers. On [workers.do](https://workers.do).

## Business-as-Code

Define your entire startup in code:

```typescript
import { Startup } from 'startups.do'
import { engineering, product, sales } from 'teams.do'
import { dev, sales as salesWorkflow } from 'workflows.do'

export default Startup({
  name: 'Acme AI',

  teams: { engineering, product, sales },

  workflows: {
    build: dev,
    sell: salesWorkflow,
  },

  services: ['llm.do', 'payments.do', 'org.ai'],
})
```

Your business runs itself. With human oversight when it matters.

## Platform Services

Everything you need to run a startup:

| Service | Domain | What It Does |
|---------|--------|--------------|
| **AI Gateway** | [llm.do](https://llm.do) | Multi-model LLM with metering |
| **Identity** | [org.ai](https://org.ai) | SSO, users, secrets |
| **Payments** | [payments.do](https://payments.do) | Stripe Connect billing |
| **Domains** | [builder.domains](https://builder.domains) | Free domains for builders |

```typescript
import { llm } from 'llm.do'
import { org } from 'org.ai'
import { payments } from 'payments.do'

// AI does the work
const content = await llm.complete({ model: 'claude-3-opus', prompt })

// Platform handles identity
const user = await org.users.get(userId)

// Platform handles billing
await payments.usage.record(user.id, { tokens: content.usage.total })
```

## Quick Start

```bash
npm install agents.do

# Or individual agents
npm install priya.do ralph.do tom.do quinn.do mark.do
```

```typescript
import { priya, ralph, tom, quinn, mark } from 'agents.do'

// Your first feature
const spec = await priya`spec out user authentication`
const code = await ralph`implement ${spec}`
await [priya, tom, quinn].map(r => r`review ${code}`)
const docs = await mark`document ${code}`
```

## The Journey

| Step | Platform | What You Do |
|------|----------|-------------|
| **Create** | [startups.new](https://startups.new) | Launch your startup |
| **Build** | [startups.studio](https://startups.studio) | Develop and deploy |
| **Learn** | [startup.games](https://startup.games) | Practice and iterate |

## SDKs

Every service is an SDK:

```typescript
// Agents
import { tom, priya } from 'agents.do'
import { tom } from 'tom.do'

// Teams
import { engineering } from 'teams.do'

// Workflows
import { dev } from 'workflows.do'

// Platform
import { llm } from 'llm.do'
import { org } from 'org.ai'
import { payments } from 'payments.do'
```

## Repository Structure

```
agents/        AI agents (Priya, Tom, Rae, Mark, Sally, Quinn)
roles/         Base roles (CEO, CTO, PDM, Dev, QA...)
humans/        Human workers + channels (Slack, Email, Discord...)
teams/         Team compositions (Engineering, Product, Sales...)
workflows/     Workflow definitions (DevLoop, CodeReview...)
workers/       Cloudflare Workers (the runtime kind)
sdks/          SDK packages (tom.do, priya.do, llm.do...)
objects/       Durable Objects (Agent, Human, Workflow...)
primitives/    TypeScript interfaces (submodule)
apps/          Web applications (Dashboard, Admin, Docs)
```

## Why workers.do?

**For solo founders**: You get a team without hiring one.

**For small teams**: AI handles the work, humans make decisions.

**For growing startups**: Add humans to teams without changing code.

**For everyone**: Business runs itself. You focus on what matters.

---

Workers work for you.

[workers.do](https://workers.do) · [agents.do](https://agents.do) · [teams.do](https://teams.do) · [workflows.do](https://workflows.do) · [agi.do](https://agi.do)
