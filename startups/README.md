# Autonomous Startups

**Build a business without building a team.**

The workers.do platform enables **Autonomous Startups** - businesses that run on AI with human oversight. This directory contains the startup lifecycle tools that make it possible.

```typescript
import { priya, ralph, tom, mark, sally } from 'agents.do'

// Your AI team is already working
priya`plan the Q1 roadmap`
ralph`build the authentication system`
tom`review the architecture`
mark`write the launch announcement`
sally`qualify these 10 leads`
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

## The Startup Journey

The workers.do platform provides three connected experiences:

### 1. [startups.new](./startups.new) - Launch

**From idea to live startup in one click.**

```typescript
import { startup } from 'startups.do'

const acme = await startup`AI-powered CRM for marketing agencies`
// That's it. Your startup is running.
```

What you get instantly:
- Delaware C-Corp, bank account, business address
- AI team (Product, Engineering, Marketing, Sales, QA)
- Platform services (Payments, Auth, Database)
- Free domain via [builder.domains](./builder.domains)
- SOC 2 compliance from day one

**Use when:** You have an idea and want to launch immediately.

[Read more →](./startups.new/README.md)

---

### 2. [startups.studio](./startups.studio) - Build

**Manage a portfolio of startups from one dashboard.**

```typescript
import { studio } from 'startups.studio'

// Deploy, monitor, and scale multiple ventures
const portfolio = await studio.portfolio()
await studio.deploy('venture-1', { code: newFeature })
await studio.metrics('venture-2', '30d')
```

Built for serial entrepreneurs and venture studios:
- Unified control center for all your startups
- Shared infrastructure, unique businesses
- Deploy and monitor from one place
- Portfolio-wide analytics

**Use when:** You're building multiple startups or managing a portfolio.

[Read more →](./startups.studio/README.md)

---

### 3. [startup.games](./startup.games) - Learn

**Master startup skills before you stake your life on one.**

```typescript
import { games } from 'startup.games'

// Simulate realistic startup scenarios
const sim = await games.simulate({
  model: 'saas-b2b',
  market: 'developer-tools',
  difficulty: 'normal'
})

await sim.decide({ action: 'hire', role: 'engineer' })
await sim.decide({ action: 'build', feature: 'api-v2' })
```

Learn through realistic simulations:
- Practice years of decisions in hours
- Random events test your adaptability
- Compete on leaderboards, earn achievements
- Perfect for educators and aspiring founders

**Use when:** You want to learn startup skills risk-free.

[Read more →](./startup.games/README.md)

---

## Supporting Services

### [startups.as](./startups.as) - The Framework

The core framework for defining autonomous startups as code:

```typescript
import { startups } from 'startups.as'

await startups.create({
  name: 'acme',
  vision: 'Make AI accessible to every small business',
  agents: ['sales', 'support', 'marketing']
})
```

[Read more →](./startups.as/README.md)

---

### [builder.domains](./builder.domains) - Free Domains

Free domains for every project you launch:

```typescript
import { domains } from 'builder.domains'

await domains.claim('acme.hq.com.ai')
await domains.claim('acme-api.api.net.ai')
// All free. All instant. SSL included.
```

Available TLDs:
- `*.hq.com.ai` - AI company headquarters
- `*.app.net.ai` - AI applications
- `*.api.net.ai` - AI APIs
- `*.hq.sb` - Startup headquarters
- `*.io.sb` - Startup projects

[Read more →](./builder.domains/README.md)

---

## How It All Fits Together

```
1. IDEA
   ↓
   startups.new        → Launch your startup instantly
   ↓
2. BUSINESS
   ↓
   startups.as         → Define as code
   builder.domains     → Get free domain
   agents.do           → AI team starts working
   ↓
3. GROWTH
   ↓
   startups.studio     → Build and manage portfolio
   ↓
4. LEARNING
   ↓
   startup.games       → Practice and improve skills
```

---

## Quick Start

### Launch Your First Startup

```bash
npm install startups.new
```

```typescript
import { launch } from 'startups.new'

const startup = await launch({
  name: 'my-startup',
  template: 'saas',
  domain: 'my-startup.hq.com.ai'
})

console.log(startup.urls.app)  // Live now
```

### Manage Multiple Startups

```bash
npm install startups.studio
```

```typescript
import { studio } from 'startups.studio'

const portfolio = await studio.portfolio()
console.log(`Managing ${portfolio.stats.totalStartups} startups`)
console.log(`Total MRR: $${portfolio.stats.totalMRR}`)
```

### Practice First

```bash
npm install startup.games
```

```typescript
import { games } from 'startup.games'

const sim = await games.simulate({ model: 'saas-b2b' })
await sim.decide({ action: 'build', feature: 'api' })
const results = await sim.advance({ months: 3 })
```

---

## The Hero

Our hero is a **startup founder** who wants to:

1. Build a business without hiring a full team
2. Define their startup in code (Business-as-Code)
3. Have AI agents deliver services (Services-as-Software)
4. Maintain human oversight for important decisions

**workers.do** gives them an AI team that works like real people.

Workers work for them.

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
