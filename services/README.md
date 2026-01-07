# [services.do](https://services.do)

> AI-delivered Services-as-Software.

```typescript
import { service } from 'services.do'

const bookkeeping = service`manage my books`

// What used to require a $5,000/month accountant
// is now a $50/month AI service.
```

## The Shift

For decades, businesses bought two things:

1. **Software** - Tools you use yourself
2. **Services** - People who do work for you

Software scaled. Services didn't.

You can buy Salesforce for 1,000 users at roughly the same per-seat cost as 10 users. But hiring 1,000 accountants costs 100x more than hiring 10.

**AI changes this.**

Services can now scale like software.

## Services-as-Software

| Traditional Service | Cost | AI Service | Cost |
|---------------------|------|------------|------|
| Bookkeeper | $2-5K/mo | [bookkeeping.do](https://bookkeeping.do) | $50/mo |
| SDR | $5-8K/mo | [sdr.do](https://sdr.do) | $100/mo |
| Recruiter | $10-20K/hire | [recruiting.do](https://recruiting.do) | $500/hire |
| Legal review | $500/hr | [legal.do](https://legal.do) | $50/doc |
| Customer support | $4K/mo | [support.do](https://support.do) | $100/mo |
| Marketing writer | $6K/mo | [content.do](https://content.do) | $200/mo |

Same outcomes. 10-100x cheaper.

## How It Works

Every service follows the same pattern:

```typescript
// 1. Define what you need
const service = bookkeeping({
  company: 'Acme Inc',
  integrations: ['stripe', 'mercury', 'gusto'],
})

// 2. It runs autonomously
// - Categorizes transactions
// - Reconciles accounts
// - Generates reports
// - Flags anomalies

// 3. Humans review when needed
service.on('review_needed', async (item) => {
  // Large transactions, unusual patterns, etc.
  await cfo`review ${item}`
})
```

## The Catalog

### Finance & Accounting

| Service | What It Does | Replaces |
|---------|--------------|----------|
| [bookkeeping.do](https://bookkeeping.do) | Categorize, reconcile, report | Bookkeeper |
| [accounting.do](https://accounting.do) | Full double-entry accounting | Accountant |
| [tax.do](https://tax.do) | Tax prep and filing | Tax preparer |
| [audit.do](https://audit.do) | Internal audit and compliance | Auditor |
| [cfo.do](https://cfo.do) | Financial strategy and planning | Fractional CFO |

### Sales & Marketing

| Service | What It Does | Replaces |
|---------|--------------|----------|
| [sdr.do](https://sdr.do) | Outbound prospecting | SDR |
| [bdr.do](https://bdr.do) | Inbound qualification | BDR |
| [content.do](https://content.do) | Blog posts, social, email | Content writer |
| [seo.do](https://seo.do) | Search optimization | SEO specialist |
| [ads.do](https://ads.do) | Ad campaign management | Media buyer |
| [pr.do](https://pr.do) | Press releases, outreach | PR agency |

### Operations

| Service | What It Does | Replaces |
|---------|--------------|----------|
| [support.do](https://support.do) | Customer support tickets | Support team |
| [ops.do](https://ops.do) | Operations management | Ops manager |
| [recruiting.do](https://recruiting.do) | Sourcing and screening | Recruiter |
| [hr.do](https://hr.do) | HR administration | HR generalist |
| [legal.do](https://legal.do) | Contract review, compliance | Paralegal |

### Technical

| Service | What It Does | Replaces |
|---------|--------------|----------|
| [devops.do](https://devops.do) | Infrastructure management | DevOps engineer |
| [qa.do](https://qa.do) | Testing and quality | QA engineer |
| [security.do](https://security.do) | Security monitoring | Security analyst |
| [data.do](https://data.do) | Data analysis and reporting | Data analyst |

## Using Services

### Standalone

```typescript
import { sdr } from 'sdr.do'

const mySdr = sdr({
  company: 'Acme Inc',
  icp: 'B2B SaaS, 50-500 employees, US',
  product: 'AI-powered CRM',
})

// Start prospecting
await mySdr.prospect({
  quantity: 100,
  channels: ['email', 'linkedin'],
})

// Handle responses
mySdr.on('reply', async (lead) => {
  if (lead.interested) {
    await mySdr.scheduleDemo(lead)
  }
})
```

### As Part of a Startup

```typescript
import { Startup } from 'startups.do'

const acme = Startup({
  name: 'Acme Inc',

  // AI team for product
  team: {
    product: 'Priya',
    dev: 'Ralph',
    qa: 'Quinn',
  },

  // AI services for operations
  services: {
    bookkeeping: 'bookkeeping.do',
    support: 'support.do',
    sdr: 'sdr.do',
  },
})
```

### With Human Oversight

```typescript
import { bookkeeping } from 'bookkeeping.do'
import { cfo } from 'humans.do'

const books = bookkeeping({
  company: 'Acme Inc',

  // Human reviews for important decisions
  checkpoints: {
    large_transactions: { threshold: 10000, reviewer: cfo },
    month_end_close: { reviewer: cfo },
    tax_filings: { reviewer: cfo },
  },
})
```

## The Service Loop

Every service follows the same autonomous loop:

```
┌─────────────────────────────────────────────────────┐
│                    INPUT                             │
│  (transactions, leads, tickets, documents, etc.)    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   PROCESS                            │
│  AI analyzes, categorizes, acts on each item        │
└─────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐
│     AUTOMATED       │  │   NEEDS REVIEW      │
│  (90% of items)     │  │   (10% of items)    │
└─────────────────────┘  └─────────────────────┘
              │                     │
              │                     ▼
              │          ┌─────────────────────┐
              │          │   HUMAN REVIEW      │
              │          │  (approve/modify)   │
              │          └─────────────────────┘
              │                     │
              └──────────┬──────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│                   OUTPUT                             │
│  (reports, responses, actions, deliverables)        │
└─────────────────────────────────────────────────────┘
```

## Pricing

Services are priced based on **outcomes**, not seats or hours:

| Service | Pricing Model | Example |
|---------|---------------|---------|
| bookkeeping.do | Per transaction | $0.10/txn, ~$50/mo typical |
| sdr.do | Per qualified lead | $5/lead |
| support.do | Per ticket | $0.50/ticket |
| content.do | Per piece | $10/blog, $2/social |
| legal.do | Per document | $20/contract review |

No minimums. No annual contracts. Pay for what you use.

## Building Services

Want to offer your own AI service?

```typescript
import { Service } from 'services.do'

export default Service({
  name: 'My Custom Service',
  description: 'Does amazing things',

  // Define inputs
  inputs: {
    task: 'string',
    context: 'object',
  },

  // Define the process
  process: async (input, ctx) => {
    const result = await ctx.ai`do ${input.task} with ${input.context}`
    return result
  },

  // Define when humans review
  checkpoints: {
    high_risk: (result) => result.confidence < 0.8,
    large_impact: (result) => result.impact > 10000,
  },

  // Pricing
  pricing: {
    model: 'per_task',
    price: 1.00,
  },
})
```

## The Vision

You're a founder. You need:

- Accounting (but can't afford a CFO)
- Sales (but can't afford an SDR team)
- Support (but can't afford a support team)
- Legal (but can't afford a lawyer on retainer)

Before: You either do it all yourself, or you don't do it.

After: AI services handle it all, for the cost of a few SaaS subscriptions.

**The future isn't software OR services. It's services delivered AS software.**

---

**Ready to scale your operations without scaling your team?**

[Browse services](https://services.do) | [Build a service](https://docs.services.do/build) | [Discord](https://discord.gg/services)

---

Part of [workers.do](https://workers.do) | Startups at [startups.new](https://startups.new)
