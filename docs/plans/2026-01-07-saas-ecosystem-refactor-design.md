# SaaS Ecosystem Refactor Design

**Date:** 2026-01-07
**Status:** Draft
**Author:** Brainstorming session

## Executive Summary

This document outlines the refactoring plan for the workers.do SaaS ecosystem, including:

1. **Domain architecture** - opensaas.org, saaskit.js.org, saas.dev, saas.studio, startups.new
2. **Repository structure** - Moving 65 rewrites to opensaas org, creating dot-do/saas
3. **StoryBrand narrative** - Founder as hero, AI team as the solution
4. **Technical architecture** - DO → App → SaaS class hierarchy
5. **Migration plan** - Scripted extraction with parallel subagent execution

---

## 1. The Vision: StoryBrand Framework

### The Hero: Startup Founder

A solo founder with an idea, limited capital, and no team. They've been thinking about their business for months, maybe years. They know what they want to build but can't afford engineers, marketers, or salespeople.

### The Problem

| Level | Problem |
|-------|---------|
| **External** | "I can't afford to hire a team" |
| **Internal** | "I feel overwhelmed and like an imposter - how do successful founders do this?" |
| **Philosophical** | "It shouldn't take millions of dollars to build a business" |

### The Guide: workers.do / startups.studio

- **Empathy**: "We've been solo founders too. We know the struggle."
- **Authority**: "We've built 65 enterprise SaaS patterns. We know what works."

### The Plan

1. Go to [startups.new](https://startups.new)
2. Describe your business (or pick a template/clone)
3. Your AI team starts working

### The Call to Action

"Launch your startup"

### Success

- Running business with AI team
- Revenue coming in while you sleep
- Sally closed a deal
- Ralph shipped a feature
- You're the CEO, not the everything-doer

### Failure Avoided

- Never launching
- Burning savings on contractors
- Giving up on the dream
- Staying stuck in the "someday" loop

### The Transformation Moment

Not "I built it" but "It's running without me."

---

## 2. Domain & Repository Architecture

### Domain Hierarchy

```
mdxui.dev                    → Business-as-Code UI components
    ↓ used by
saaskit.js.org               → SaaS framework (DO → App → SaaS)
    ↓ examples
opensaas.org                 → 65+ open source SaaS clones
    ↓ deployed to
saas.dev                     → Managed platform (1-click deploy)
    ↓ managed via
saas.studio / startups.studio → Visual builder & management UI
```

### Domain Purposes

| Domain | Purpose | Audience |
|--------|---------|----------|
| **startups.new** | Entry point - create your startup | Non-technical founders |
| **startups.studio** | Manage autonomous Business-as-Code | All founders |
| **opensaas.org** | 65+ open source SaaS clones | Enterprise + developers |
| **saaskit.js.org** | Framework for building SaaS | Developers |
| **saas.dev** | Managed platform (1-click deploy) | Everyone |
| **saas.studio** | Visual builder for SaaS | Visual builders |
| **services.do** | AI-delivered Services-as-Software | Businesses needing services |
| **builder.domains** | Free domains for AI Agents & Builders | All builders |

### Repository Structure

| Repo | Purpose |
|------|---------|
| `~/projects/ui` (mdxui) | Component infrastructure |
| `dot-do/saas` | saaskit framework + studio apps |
| `opensaas/*` (65 repos) | Individual SaaS clones |
| `workers/` | Core platform (agents, workflows, humans) |

### opensaas Organization

```
opensaas/salesforce    → salesforce.do (npm)
opensaas/hubspot       → hubspot.do (npm)
opensaas/firebase      → firebase.do (npm)
opensaas/fsx           → fsx.do (npm)
... (65 total)
```

### Submodule Views

Different "views" of the same code for different audiences:

```
workers/opensaas/      → README for workers.do context + submodules
dot-do/saas/examples/  → saaskit examples pointing to opensaas repos
```

---

## 3. Technical Architecture

### Class Hierarchy

```typescript
// Base Durable Object
class DO extends DurableObject<Env> {
  // Core DO primitives: state, storage, alarms, websockets
}

// Application layer
class App extends DO {
  // Hono routing
  // RPC protocol
  // Tiered storage (SQLite hot + R2 warm/cold)
  // MCP tools generation
  // Authentication
  // Multi-tenancy
}

// SaaS layer
class SaaS extends App {
  // database.do schema integration
  // Cascading generation
  // Agent team composition
  // Workflow automation
  // Billing integration
}
```

### Graph Model (database.do)

Schemaless Things + Relationships model:

```typescript
const MyCRM = SaaS({
  team: {
    product: 'Priya',
    dev: 'Ralph',
    sales: 'Sally',
  },
  workflows: { sales: 'default', support: 'default' },
})

// The graph builds itself as you use it
await crm.Contact.create({ name: 'Alice', email: 'alice@acme.com' })
await crm.Deal.create({ title: 'Enterprise Plan', contact: alice })
```

### Storage Tiers

| Tier | Technology | Data | Latency | Cost |
|------|------------|------|---------|------|
| **Hot** | SQLite in DO | Active, <2 years | <10ms | $$$ |
| **Warm** | R2 | Historical, 2-7 years | ~100ms | $$ |
| **Cold** | R2 Archive | Compliance, 7+ years | ~1s | $ |

### AI Team Composition

```typescript
export default SaaS({
  team: {
    product: 'Priya',      // Plans features, specs, roadmaps
    dev: 'Ralph',          // Builds features, ships code
    techLead: 'Tom',       // Reviews architecture, code quality
    frontend: 'Rae',       // UI/UX, React, accessibility
    qa: 'Quinn',           // Tests, edge cases, quality
    marketing: 'Mark',     // Content, copy, campaigns
    sales: 'Sally',        // Outbound, demos, closing
  },
})
```

---

## 4. The Autonomous Loop

The core workflow that makes startups autonomous:

```typescript
import { on } from 'workflows.do'
import { priya, ralph, tom, quinn, mark, sally } from 'agents.do'

on.Idea.captured(async idea => {
  // 1. PRODUCT: Idea → Spec → Backlog
  const product = await priya`brainstorm ${idea}`
  const backlog = await priya.plan(product)

  // 2. ENGINEERING: Build with quality gates
  for (const issue of backlog.ready) {
    const pr = await ralph`implement ${issue}`

    // Review loop - keeps iterating until approved
    do await ralph`update ${pr}`
    while (!await pr.approvedBy(quinn, tom, priya))

    await pr.merge()
  }

  // 3. GO-TO-MARKET: Launch + Sell
  await mark`document and launch ${product}`
  await sally`start outbound for ${product}`
})
```

### What This Means for the Founder

| Phase | What Happens | Founder Involvement |
|-------|--------------|---------------------|
| **Idea captured** | Founder describes idea | 5 minutes |
| **Product spec** | Priya brainstorms, creates spec | Review & approve |
| **Backlog created** | Issues broken down, dependencies mapped | Optional review |
| **Development** | Ralph builds, submits PRs | None (automated) |
| **Review loop** | Quinn tests, Tom reviews, Priya checks fit | None (automated) |
| **Merge & deploy** | Code merged, deployed to production | None (automated) |
| **Documentation** | Mark writes docs, changelog, blog post | Optional review |
| **Launch** | Mark announces, creates campaigns | Optional review |
| **Sales** | Sally starts outbound, handles inbound | Close deals (human) |

---

## 5. Business Infrastructure

When a startup is created, they instantly receive:

### Business Formation (via incorporate.do, agents.do, address.do)

- Delaware C-Corp (or LLC, S-Corp)
- Registered agent in all 50 states
- Business address + virtual mailbox
- Business email
- Business phone number

### Financial Infrastructure (via accounts.do, cards.do, payments.do)

- Bank account with routing/account number
- Virtual cards for expenses
- Payment processing (Stripe)
- Full accounting (accounting.do)

### Compliance (via soc2.do)

- SOC 2 compliance from day one
- Evidence auto-collected from all services
- Trust center for enterprise sales

### Communications (via builder.domains, email.do, phone.numbers.do)

- Free domain (*.hq.com.ai, etc.)
- Business email
- Business phone with AI handling

---

## 6. Migration Plan

### Phase 1: Script the Automation

Create scripts for:
- Creating GitHub repo in opensaas org
- Moving code from workers/rewrites/{name}
- Setting up npm publishing
- Configuring CI/CD
- Wiring submodules

### Phase 2: Test with Gold Standards

Run migration on mature rewrites first:
- `fsx` (infrastructure, well-tested)
- `firebase` (complex, multiple subsystems)
- `hubspot` (enterprise SaaS, full pattern)

Verify:
- npm publish works
- Submodules work
- CI/CD passes

### Phase 3: Parallel Execution (Subagents)

- Spawn 65 parallel subagents
- Each agent: create repo, migrate code, setup CI, wire submodule
- All complete in ~1 session
- workers/rewrites/ becomes thin folder with README + submodules

### Phase 4: Create dot-do/saas Repo

```
dot-do/saas/
├── packages/
│   ├── saaskit/          # Framework: DO → App → SaaS
│   └── studio/           # UI: mdxui composition
├── apps/
│   └── saas.studio/      # The builder application
└── docs/
    └── opensaas.org/     # Documentation site
```

---

## 7. Complete Ecosystem Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        startups.new                              │
│         "Describe your idea" → Autonomous Startup generated      │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                  INSTANT BUSINESS INFRASTRUCTURE                 │
│                                                                  │
│  incorporate.do    → Delaware C-Corp, LLC, S-Corp               │
│  agents.do         → Registered agent (all 50 states)           │
│  address.do        → Virtual mailbox + business address          │
│  accounts.do       → Bank account with routing/account #        │
│  cards.do          → Virtual + physical cards                    │
│  phone.numbers.do  → Business phone number                       │
│  builder.domains   → Free domain (*.hq.com.ai, etc.)            │
│  email.do          → Business email                              │
│  soc2.do           → Instant SOC 2 compliance (free)            │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    startups.studio                               │
│           Autonomous Business-as-Code management                 │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         workers.do                               │
│  agents.do │ teams.do │ workflows.do │ humans.do │ roles.do     │
│         (Priya, Ralph, Tom, Sally, Mark, Quinn)                  │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                        services.do                               │
│            AI-delivered Services-as-Software                     │
│    bookkeeping.do │ sdr.do │ support.do │ recruiting.do         │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Platform Services                         │
│                                                                  │
│  FINANCIAL           │  OPERATIONS         │  AI                 │
│  payments.do         │  database.do        │  llm.do            │
│  accounting.do       │  workflows.do       │  functions.do      │
│  treasury.do         │  triggers.do        │  searches.do       │
│                      │  analytics.do       │  actions.do        │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                        saaskit.js.org                            │
│              DO → App → SaaS class hierarchy                     │
│           + database.do Things/Relationships graph               │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                        opensaas.org                              │
│     65+ ready-to-fork clones (Salesforce, HubSpot, Firebase...)  │
│              opensaas/* repos, MIT licensed                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. READMEs Created

| Location | Purpose |
|----------|---------|
| `workers/startups/README.md` | startups.new landing - founder journey |
| `workers/opensaas/README.md` | opensaas.org - clone catalog |
| `workers/saaskit/README.md` | saaskit.js.org - framework |
| `workers/services/README.md` | services.do - Services-as-Software |

---

## 9. Next Steps

1. **Review and approve** this design document
2. **Create opensaas GitHub org** and verify access
3. **Write migration scripts** for repo creation
4. **Test with fsx, firebase, hubspot**
5. **Execute parallel migration** with 65 subagents
6. **Create dot-do/saas repo** with saaskit framework
7. **Update workers/rewrites** to submodule references

---

## Appendix: The One-Call Dream

```typescript
const startup = await db.Startup('AI CRM for agencies')

// Instantly generated:
// ✅ Delaware C-Corp (incorporate.do)
// ✅ Registered agent (agents.do)
// ✅ Business address (address.do)
// ✅ Bank account (accounts.do)
// ✅ Virtual cards (cards.do)
// ✅ Domain (builder.domains)
// ✅ Email (email.do)
// ✅ Phone (phone.numbers.do)
// ✅ SOC 2 compliance (soc2.do)
// ✅ AI team (Priya, Ralph, Tom, Sally, Mark, Quinn)
// ✅ CRM SaaS clone (from opensaas.org)
//
// Team already working:
// - Sally doing outbound
// - Mark creating content
// - Ralph building features
// - Priya planning roadmap
```

The founder's input is the idea. Everything else runs.
