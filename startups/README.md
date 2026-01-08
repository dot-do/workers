# Startups

**Build a business without building a team.**

This directory contains the startup lifecycle tools for the workers.do platform - enabling **Autonomous Startups** that run on AI with human oversight.

---

## Directory Overview

| Package | Domain | Purpose |
|---------|--------|---------|
| [startups.do](./startups.do) | [startups.do](https://startups.do) | Main SDK - Create and manage startups |
| [startups.as](./startups.as) | [startups.as](https://startups.as) | Framework for defining startups as code |
| [startups.studio](./startups.studio) | [startups.studio](https://startups.studio) | Portfolio management for serial builders |
| [startup.games](./startup.games) | [startup.games](https://startup.games) | Learn startup skills through simulation |
| [builder.domains](./builder.domains) | [builder.domains](https://builder.domains) | Free domains for every project |

---

## The Startup Journey

### 1. Create - [startups.do](./startups.do)

**From idea to live startup in one command.**

```typescript
import startups from 'startups.do'

const acme = await startups.do`AI-powered CRM for marketing agencies`
await startups.launch(acme.id)
// Your startup is running.
```

What you get:
- AI team (Product, Engineering, Marketing, Sales, QA)
- Platform services (Payments, Auth, Database)
- Free domain via builder.domains
- Business infrastructure from day one

---

### 2. Define - [startups.as](./startups.as)

**Define your startup as code with full control.**

```typescript
import { startups } from 'startups.as'

await startups.create({
  name: 'acme',
  vision: 'Make AI accessible to every small business',
  model: 'saas',
  agents: ['sales', 'support', 'marketing']
})
```

[Read more](./startups.as/README.md)

---

### 3. Scale - [startups.studio](./startups.studio)

**Manage a portfolio of startups from one dashboard.**

```typescript
import { studio } from 'startups.studio'

const portfolio = await studio.portfolio()
await studio.deploy('venture-1', { code: newFeature })
await studio.metrics('venture-2', '30d')
```

Built for serial entrepreneurs and venture studios.

[Read more](./startups.studio/README.md)

---

### 4. Learn - [startup.games](./startup.games)

**Master startup skills before you stake your life on one.**

```typescript
import { games } from 'startup.games'

const sim = await games.simulate({
  model: 'saas-b2b',
  market: 'developer-tools',
  difficulty: 'normal'
})

await sim.decide({ action: 'hire', role: 'engineer' })
```

Practice years of decisions in hours. Perfect for educators and aspiring founders.

[Read more](./startup.games/README.md)

---

### 5. Launch - [builder.domains](./builder.domains)

**Free domains for every project you launch.**

```typescript
import { domains } from 'builder.domains'

await domains.claim('acme.hq.com.ai')
await domains.claim('acme-api.api.net.ai')
// All free. All instant. SSL included.
```

[Read more](./builder.domains/README.md)

---

## How It Fits Together

```
IDEA
  ↓
  startups.do         → Create your startup
  ↓
DEFINITION
  ↓
  startups.as         → Define as code
  builder.domains     → Claim your domain
  agents.do           → AI team starts working
  ↓
GROWTH
  ↓
  startups.studio     → Manage your portfolio
  ↓
LEARNING
  ↓
  startup.games       → Practice and improve
```

---

## Quick Start

```bash
npm install startups.do
```

```typescript
import startups from 'startups.do'

// Create from natural language
const startup = await startups.do`
  A SaaS that helps developers ship faster
  with AI-powered code review and testing.
`

// Or with full configuration
const startup = await startups.create({
  name: 'devfast',
  description: 'AI-powered developer tools',
  model: 'saas',
  services: ['llm.do', 'payments.do']
})

// Launch it
await startups.launch(startup.id)

// Monitor
const metrics = await startups.metrics(startup.id)
console.log(`MRR: $${metrics.mrr}`)
```

---

## The Vision

Traditional startups require:
- Hiring before validation
- Burning runway on salaries
- Months of setup before shipping
- Scaling people before revenue

**Autonomous Startups flip this:**
- AI agents handle execution
- Near-zero operational cost
- Launch in days, not months
- Scale revenue, not headcount

You focus on vision, strategy, and customers. AI handles everything else.

---

## Platform Architecture

These startup tools are built on the workers.do platform:

```
agents/       → AI workers (Priya, Ralph, Tom, Rae, Mark, Sally, Quinn)
roles/        → Base job descriptions (CEO, CTO, PDM, Dev, QA)
humans/       → Human workers via channels (Slack, Email, Discord)
teams/        → Groups of workers (Engineering, Product, Sales)
workflows/    → Orchestrated processes (dev, review, marketing)
workers/      → Cloudflare Workers (the runtime)
startups/     → Startup lifecycle tools (you are here)
```

---

## Learn More

- [workers.do](https://workers.do) - Platform overview
- [agents.do](https://agents.do) - AI agents documentation
- [Business-as-Code](https://agi.do/business-as-code) - The philosophy
- [Services-as-Software](https://services.as/software) - The model

---

MIT License
