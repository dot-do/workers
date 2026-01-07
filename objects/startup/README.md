# Your Startup, Defined in Code

> Stop drowning in spreadsheets. Start building your future.

You have the vision. The drive. The late nights and early mornings. But every time an investor asks for an update, you spend hours digging through Notion docs, Airtable bases, Google Sheets, email threads, and that one Slack message you can never find.

**Your startup deserves a single source of truth.**

---

## The Problem

Every founder knows this pain:

- **Scattered data, scattered mind** - Your cap table is in one place, metrics in another, pitch deck in Dropbox, investor contacts in a CRM you barely use
- **Manual tracking is a full-time job** - Updating MRR, recording milestones, tracking runway... when do you actually build?
- **Investor update hell** - Monthly updates take days to compile. You dread the first of the month.
- **No visibility into your own business** - "How many users do we have?" shouldn't require opening 4 tools
- **Lost context** - When did we close that round? What was our burn rate in March? Who introduced us to that investor?

You started a company to change the world. Instead, you're playing data janitor.

---

## The Solution

**startup.do** is a Durable Object that manages your entire startup lifecycle in code. One place. One API. Complete clarity.

```typescript
import { Startup } from '@dotdo/startup'

// Your entire startup, in one call
const dashboard = await startup.getDashboard('my-startup')

// {
//   startup: { name, stage, status },
//   team: { founders, count },
//   funding: { total, rounds, investors },
//   metrics: { mrr, arr, users, growth, runway },
//   milestones: { upcoming, completed, total },
//   pitchDeck: { url, version, viewCount },
//   recentActivity: [...]
// }
```

Every founder, every round, every metric, every milestone. Queryable. Auditable. Automated.

---

## Get Started in 3 Simple Steps

### Step 1: Install

```bash
npm install @dotdo/startup
```

### Step 2: Define Your Startup

```typescript
import { Startup } from '@dotdo/startup'

// Create your startup
const myStartup = await startup.create({
  name: 'Acme AI',
  slug: 'acme-ai',
  tagline: 'AI that actually works',
  stage: 'seed',
  industry: 'AI/ML',
})

// Add your founding team
await startup.addFounder({
  startupId: myStartup.id,
  name: 'Alice Chen',
  email: 'alice@acme.ai',
  title: 'CEO',
  role: 'founder',
  equity: 40,
})
```

### Step 3: Track Everything

```typescript
// Record your metrics
await startup.recordMetrics({
  startupId: myStartup.id,
  period: '2024-01',
  mrr: 25000,
  arr: 300000,
  users: 1200,
  growth: 15,
  runway: 18,
})

// Track your funding
const seedRound = await startup.createRound({
  startupId: myStartup.id,
  type: 'seed',
  targetAmount: 2000000,
  status: 'raising',
})

// Add investors
await startup.addInvestor({
  startupId: myStartup.id,
  roundId: seedRound.id,
  name: 'Jane Smith',
  type: 'angel',
  investedAmount: 50000,
})

// Generate investor updates with AI
const draft = await startup.generateUpdateDraft(myStartup.id, '2024-01')
```

---

## Before & After

| Before startup.do | After startup.do |
|-------------------|------------------|
| Cap table in a spreadsheet that's always outdated | Real-time ownership tracking with full history |
| Metrics in 5 different tools | One API call: `getCurrentMetrics()` |
| Hours compiling investor updates | AI-generated drafts in seconds |
| "Who invested in our seed round?" takes 10 minutes | `getInvestors(startupId, roundId)` |
| Milestones tracked in your head | Structured roadmap with completion tracking |
| Pitch deck versions everywhere | Document management with view analytics |
| No audit trail | Every change logged automatically |
| Asking "what stage are we?" | `startup.stage` - always current |

---

## Full API Reference

### Startup Lifecycle

```typescript
// Create and manage your startup
await startup.create({ name, slug, stage, industry })
await startup.update(id, { stage: 'series-a' })
await startup.launch(id)
await startup.archive(id, 'acquired')

// Query startups
await startup.get(id)
await startup.getBySlug('acme-ai')
await startup.list()
```

### Team & Founders

```typescript
// Manage your founding team
await startup.addFounder({ startupId, name, email, title, equity })
await startup.updateFounder(founderId, { title: 'CTO' })
await startup.founderDeparture(founderId)
await startup.getFounders(startupId)
```

### Funding & Investors

```typescript
// Track funding rounds
await startup.createRound({ startupId, type: 'seed', targetAmount })
await startup.closeRound(roundId, raisedAmount, valuation)
await startup.getRounds(startupId)
await startup.getTotalFunding(startupId)

// Manage investor relationships
await startup.addInvestor({ startupId, roundId, name, type, investedAmount })
await startup.updateInvestor(investorId, { relationship: 'active' })
await startup.recordContact(investorId, 'Great call about Series A')
await startup.getInvestors(startupId, 'active')
```

### Documents & Pitch Decks

```typescript
// Manage key documents
await startup.addDocument({ startupId, type: 'pitch-deck', name, url })
await startup.getDocuments(startupId, 'pitch-deck')
await startup.getPitchDeck(startupId)
await startup.recordDocumentView(documentId)
```

### Metrics & Growth

```typescript
// Track key metrics
await startup.recordMetrics({
  startupId,
  period: '2024-01',
  mrr: 25000,
  users: 1200,
  growth: 15,
  runway: 18,
})

// Query metrics
await startup.getMetrics(startupId, '2024-01')
await startup.getMetricsHistory(startupId, '2023-01', '2024-12')
await startup.getCurrentMetrics(startupId)
```

### Milestones & Roadmap

```typescript
// Plan and track milestones
await startup.addMilestone({
  startupId,
  title: 'Launch v2.0',
  type: 'product',
  targetDate: new Date('2024-06-01'),
})
await startup.completeMilestone(milestoneId, 'https://launch-announcement.com')
await startup.getMilestones(startupId, 'in-progress')
```

### Investor Updates

```typescript
// Create and send investor updates
await startup.createUpdate({
  startupId,
  period: '2024-01',
  subject: 'January Update: 15% MoM Growth',
  content: '...',
  highlights: ['Closed 3 enterprise deals', 'Launched mobile app'],
})
await startup.sendUpdate(updateId, recipientCount)
await startup.getUpdates(startupId)

// AI-powered draft generation
const draft = await startup.generateUpdateDraft(startupId, '2024-01')
```

### Dashboard

```typescript
// Get everything at once
const dashboard = await startup.getDashboard(startupId)
// Returns: startup, team, funding, metrics, milestones, pitchDeck, recentActivity
```

---

## Built on dotdo

startup.do extends the [dotdo](../do) base class, inheriting powerful capabilities:

- **Durable Object** - Strong consistency, automatic persistence, global routing
- **SQLite Storage** - Full SQL queries, ACID transactions, zero latency
- **Multi-transport** - REST, Workers RPC, WebSocket, MCP from one definition
- **Agentic AI** - Natural language interface via the `do()` method
- **Type-safe** - Full TypeScript types for schema and API

```typescript
// REST API
POST /startups { "name": "Acme AI", "slug": "acme-ai" }
GET /startups/acme-ai/dashboard

// Workers RPC
const startup = await env.STARTUP.getDashboard('acme-ai')

// AI Agent
await env.STARTUP.do("Add Alice as CEO with 40% equity")
await env.STARTUP.do("Record $25k MRR for January 2024")
await env.STARTUP.do("Generate investor update for Q1")
```

---

## Part of workers.do

startup.do is part of the [workers.do](https://workers.do) platform for building Autonomous Startups:

- **[business.do](../business)** - Detailed business operations (use with startup.do)
- **[dotdo](../do)** - Base Durable Object with AI agent
- **[llm.do](https://llm.do)** - AI gateway with billing
- **[payments.do](https://payments.do)** - Stripe Connect integration
- **[org.ai](https://org.ai)** - Auth for AI and humans

---

## Start Building Your Future

```bash
npm install @dotdo/startup
```

Stop managing spreadsheets. Start managing your startup.

Your investors will thank you. Your co-founders will thank you. Future you will thank you.

[Read the docs](https://startup.do) | [View on GitHub](https://github.com/workers-do/workers/tree/main/objects/startup) | [Join Discord](https://discord.gg/workers-do)
