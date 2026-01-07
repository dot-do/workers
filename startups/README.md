# [startups.new](https://startups.new)

> Launch your startup in one click.

```typescript
import { startup } from 'startups.do'

const acme = await startup`AI-powered CRM for marketing agencies`

// That's it. Your startup is running.
// - Incorporated in Delaware
// - Bank account with routing number
// - Business phone, email, address
// - AI team already working
// - SOC 2 compliant from day one
```

## You Have an Idea

You've been thinking about it for months. Maybe years. A business that could work.

But you're stuck. You can't afford engineers. You can't afford marketers. You can't afford salespeople. Every "how to start a startup" guide assumes you have $500K in the bank and a co-founder with a CS degree.

You're not alone. Most founders feel this way.

**What if you didn't need any of that?**

## Your AI Team

When you launch at [startups.new](https://startups.new), you get a team:

| Agent | Role | What They Do |
|-------|------|--------------|
| **Priya** | Product | Plans your roadmap, writes specs, prioritizes features |
| **Ralph** | Engineering | Builds your product, ships code, fixes bugs |
| **Tom** | Tech Lead | Reviews architecture, ensures quality, maintains standards |
| **Rae** | Frontend | Creates beautiful UIs, handles accessibility, optimizes UX |
| **Mark** | Marketing | Writes copy, creates content, runs campaigns |
| **Sally** | Sales | Does outbound, qualifies leads, books demos |
| **Quinn** | QA | Tests everything, finds edge cases, ensures quality |

They start working immediately. You don't hire them. You don't manage them. You don't pay them salaries.

They just work.

## The Loop

```typescript
import { on } from 'workflows.do'
import { priya, ralph, tom, quinn, mark, sally } from 'agents.do'

on.Idea.captured(async idea => {
  // 1. PRODUCT: Idea becomes spec becomes backlog
  const product = await priya`brainstorm ${idea}`
  const backlog = await priya.plan(product)

  // 2. ENGINEERING: Build with quality gates
  for (const issue of backlog.ready) {
    const pr = await ralph`implement ${issue}`

    // Review loop until approved
    do await ralph`update ${pr}`
    while (!await pr.approvedBy(quinn, tom, priya))

    await pr.merge()
  }

  // 3. GO-TO-MARKET: Launch and sell
  await mark`document and launch ${product}`
  await sally`start outbound for ${product}`
})
```

You describe an idea. The team builds it, reviews it, ships it, documents it, and starts selling it.

While you sleep.

## What You Get

When your startup is created, you instantly have:

### Business Infrastructure
- **Delaware C-Corp** via [incorporate.do](https://incorporate.do)
- **Registered Agent** in all 50 states via [agents.do](https://agents.do)
- **Business Address** + virtual mailbox via [address.do](https://address.do)
- **Bank Account** with routing/account numbers via [accounts.do](https://accounts.do)
- **Virtual Cards** for expenses via [cards.do](https://cards.do)
- **Business Phone** via [phone.numbers.do](https://phone.numbers.do)
- **Business Email** via [email.do](https://email.do)
- **Free Domain** via [builder.domains](https://builder.domains)
- **SOC 2 Compliance** via [soc2.do](https://soc2.do)

### Product Infrastructure
- **Database** that generates itself via [database.do](https://database.do)
- **Workflows** that run autonomously via [workflows.do](https://workflows.do)
- **Functions** (code, AI, human) via [functions.do](https://functions.do)
- **Payments** via [payments.do](https://payments.do)
- **Authentication** via [org.ai](https://org.ai)

### Your AI Team
- Product, Engineering, Marketing, Sales, QA
- Already working on your idea
- Real GitHub accounts, real email addresses, real identity

## How It Works

### 1. Describe Your Business

Go to [startups.new](https://startups.new). Tell us what you want to build.

Or pick from templates:
- **SaaS** - Subscription software
- **Marketplace** - Connect buyers and sellers
- **Agency** - Service business
- **API** - Developer tools

Or clone a billion-dollar company:
- Clone Salesforce, HubSpot, or Zendesk
- Clone Shopify or Stripe
- Clone Notion or Airtable
- [65+ options](https://opensaas.org)

### 2. Your Startup Generates

```typescript
const startup = await db.Startup('AI CRM for agencies')

// Cascading generation:
// Startup → Teams → Agents → Workflows
// Everything connected, everything running
```

Your business structure, your product, your team—all generated from your description.

### 3. Your Team Starts Working

**Day 1:**
- Priya creates initial product spec
- Ralph starts building MVP
- Mark writes launch copy
- Sally prepares outbound sequences

**Week 1:**
- MVP shipped to production
- Landing page live
- First outbound emails sent
- Content pipeline started

**Month 1:**
- Features shipping daily
- Leads coming in
- Sally booking demos
- You closing deals

## Your Role

You're the CEO. Not the developer. Not the marketer. Not the salesperson.

**You make decisions:**
- Approve the product roadmap
- Close big deals (Sally qualifies, you close)
- Set strategic direction
- Talk to customers

**Your team handles execution:**
- Building features
- Writing content
- Qualifying leads
- Testing quality
- Shipping code

## Daily Digest

Every morning:

```
Good morning! Here's what happened while you slept:

SALES
- Sally sent 47 outbound emails
- 8 responses received
- 3 demos scheduled for this week
- 1 deal ready for your close ($12,000 ARR)

PRODUCT
- Ralph shipped: User dashboard redesign
- Ralph shipped: API rate limiting
- 2 PRs awaiting your review

MARKETING
- Mark published: "Why AI CRMs Beat Traditional CRMs"
- 847 page views yesterday
- 12 new email subscribers

SUPPORT
- 4 tickets resolved automatically
- 1 ticket escalated (needs your input)

ACTION ITEMS
- [ ] Close deal with Acme Corp (Sally's notes attached)
- [ ] Review PR #47 (architecture change)
- [ ] Reply to escalated ticket
```

## Pricing

**Free tier:**
- Full AI team
- Basic infrastructure
- 1,000 workflow runs/month
- Community support

**Growth ($99/month):**
- Unlimited workflow runs
- Priority AI processing
- Custom domain
- Email support

**Scale ($499/month):**
- Dedicated resources
- SLA guarantees
- Phone support
- Custom integrations

**Enterprise:**
- Self-hosted option
- SOC 2 Type II report
- Dedicated success manager
- Custom contracts

Plus 15% platform fee on revenue (via Stripe Connect).

## The Dream

You have an idea. You go to [startups.new](https://startups.new). You describe it.

Tomorrow, you have:
- A real company
- A real product
- A real team
- Real customers coming

You didn't raise money. You didn't hire anyone. You didn't spend months building.

You just started.

---

**Ready?**

[Launch your startup](https://startups.new)

---

## For Developers

If you want to build on the platform programmatically:

```bash
npm install startups.do
```

```typescript
import { Startup } from 'startups.do'

const myStartup = Startup({
  name: 'Acme AI',
  type: 'saas',

  // Your product definition
  product: {
    description: 'AI-powered CRM for agencies',
    features: ['contact management', 'deal pipeline', 'automation'],
  },

  // Your team composition
  team: {
    product: 'Priya',
    dev: 'Ralph',
    techLead: 'Tom',
    frontend: 'Rae',
    marketing: 'Mark',
    sales: 'Sally',
    qa: 'Quinn',
  },

  // Your workflows
  workflows: {
    development: 'default',  // Idea → Build → Review → Ship
    sales: 'default',        // Outbound → Qualify → Demo → Close
    support: 'default',      // Ticket → Triage → Resolve → Follow-up
  },
})

// Start your startup
await myStartup.launch()
```

See the [full documentation](https://docs.startups.do) for more.

---

Built on [workers.do](https://workers.do) | Powered by [opensaas.org](https://opensaas.org) | Framework: [saaskit.js.org](https://saaskit.js.org)
