# zoho.do

> The Everything Suite. Unified. AI-Native. Actually Affordable.

Zoho built an empire as the "affordable" alternative. 50+ apps. 90 million users. But "affordable" still means $52-65/user/month for their full suite. Each app is its own database. Your data is fragmented. Your AI can't see the full picture.

**zoho.do** is the unified suite. CRM, Projects, Desk, Campaigns, Books - all in one Durable Object. One database. One API. AI that sees everything.

## AI-Native API

```typescript
import { zoho } from 'zoho.do'           // Full SDK
import { zoho } from 'zoho.do/tiny'      // Minimal client
import { zoho } from 'zoho.do/crm'       // CRM-only operations
```

Natural language for business workflows:

```typescript
import { zoho } from 'zoho.do'

// Talk to it like a colleague
const health = await zoho`how is Acme Corp relationship?`
const deals = await zoho`deals closing this quarter`
const atRisk = await zoho`customers with open tickets no contact 30 days`

// Chain like sentences
await zoho`leads from website this week`
  .map(lead => zoho`create deal for ${lead}`)
  .map(deal => zoho`assign to sales rep nearest ${deal.location}`)

// Cross-app operations document themselves
await zoho`deal won Acme Enterprise`
  .project(`Acme Implementation Q1 2025`)
  .invoice()
  .notify(`Welcome aboard`)
```

## The Problem

Zoho's genius was bundling. Their curse is fragmentation:

### The Bundle Tax

| Bundle | Per User/Month | What You Get |
|--------|---------------|--------------|
| **Zoho One** | $45-90 | 45+ apps (but do you need 45 apps?) |
| **CRM Plus** | $57 | CRM + Sales + Marketing + Service |
| **Zoho People Plus** | $9 | HR only |
| **Finance Plus** | $25 | Accounting only |
| **Workplace** | $3-6 | Just productivity apps |

**A 50-person company on Zoho One: $27,000-54,000/year**

And that's "affordable" compared to Salesforce.

### The Integration Problem

Each Zoho app is its own database:
- Zoho CRM has contacts
- Zoho Campaigns has contacts (different database)
- Zoho Desk has contacts (another database)
- Zoho Books has customers (yet another database)

You end up with:
- Duplicate data everywhere
- Sync conflicts between apps
- "Zoho Flow" automation costs extra
- Data silos within your "unified" suite

### The AI Afterthought

Zoho's AI (Zia) is inconsistent:
- Available in some apps, not others
- Different capabilities per app
- Premium features require higher tiers
- No cross-app intelligence
- Can't take actions, only suggests

### The True Cost

| Line Item | Monthly Cost |
|-----------|-------------|
| Zoho One (50 users) | $2,250-4,500 |
| Zoho Flow (automations) | +$10-60 |
| Extra storage | +$4/5GB |
| Phone credits | +$25 |
| Premium support | +$125-500 |
| **Total** | **$2,400-5,100/month** |

**Annual cost: $28,800-61,200**

## The Solution

**zoho.do** unifies everything in one architecture:

```
Zoho                            zoho.do
-----------------------------------------------------------------
50+ separate apps               1 unified platform
50+ separate databases          1 database (SQLite)
Sync conflicts                  Single source of truth
Per-app pricing                 One deployment
Per-app AI                      Unified AI across everything
Cloud only                      Your infrastructure
$45-90/user/month               $0 - run your own
```

---

## One-Click Deploy

```bash
npx create-dotdo zoho
```

All Zoho apps. One deployment. Running on Cloudflare's edge.

```typescript
import { Zoho } from 'zoho.do'

export default Zoho({
  name: 'my-company',
  domain: 'work.my-company.com',
  apps: ['crm', 'projects', 'desk', 'campaigns', 'books'],
})
```

---

## Features

### CRM

```typescript
// Find anyone
const alice = await zoho`Alice Chen from Acme`
const hot = await zoho`leads score > 80`
const closing = await zoho`deals closing this month`

// AI infers what you need
await zoho`Alice Chen`              // returns contact
await zoho`Alice deals`             // returns her deals
await zoho`Acme history`            // returns full account timeline

// Create naturally
const lead = await zoho`create lead Alice Chen from Acme, web source`
await zoho`convert ${lead} to deal Enterprise License 75k`

// AI scoring sees everything
await zoho`score ${lead}`
// 85: Company matches ICP, opened 5 emails, no support tickets
```

### Contacts Are Universal

One contact record, visible everywhere:

```typescript
// Create once, appears everywhere
await zoho`create contact Alice Chen alice@acme.com`

// Same person in every view
await zoho`Alice CRM view`        // deals, activities
await zoho`Alice campaigns`       // email engagement
await zoho`Alice tickets`         // support history
await zoho`Alice invoices`        // billing

// No sync. No duplicates. One record.
```

### Projects

```typescript
// Create with tasks in one expression
const project = await zoho`create project Acme Implementation Q1 2025`
  .task('discovery', { assignee: tom, due: 'Feb 7' })
  .task('setup', { assignee: ralph, due: 'Feb 14', after: 'discovery' })
  .task('training', { assignee: priya, due: 'Feb 21' })
  .milestone('Go Live', { due: 'Apr 15' })

// Natural queries
await zoho`Acme project status`
await zoho`tom tasks this week`
await zoho`overdue tasks engineering`

// Time tracking
await zoho`log 4 hours discovery call with Acme billable`
```

### Desk

```typescript
// Tickets with full context
await zoho`ticket from Alice: cannot access dashboard, 403 error`

// Agent sees everything about this customer
await zoho`Alice context`
// Enterprise deal $75k in implementation
// Project 45% complete, on schedule
// Paid $25k invoice on time
// Opened last 3 marketing emails
// One previous ticket (resolved)

// AI resolution knows the full picture
await zoho`resolve Alice ticket`
// Knows: paying customer, enterprise plan, active implementation
// Prioritizes accordingly
```

### Campaigns

```typescript
// Target with cross-app queries
await zoho`campaign Q1 Launch to customers revenue > 10k no open tickets`

// Schedule naturally
await zoho`send Q1 Launch Tuesday 9am Eastern`

// Engagement flows back to CRM automatically
// Opens -> engagement score updates
// Pricing clicks -> sales task created
```

### Books

```typescript
// Invoices linked to everything
await zoho`invoice Acme: 50 licenses at 150, 40 hours implementation at 200`

// Payment triggers cascade
await zoho`Acme paid`
// Deal -> Closed Won
// Project -> Active
// Support -> Note added

// Reports with attribution
await zoho`Q1 revenue by customer with deal source`
```

### People

```typescript
// Onboarding is one line
await zoho`hire Bob Smith engineering senior dev reports to Tom Feb 1`
// Creates user in all apps
// Adds to engineering team
// Creates onboarding project

// Time off syncs with projects
await zoho`Bob vacation Mar 15-22`
// Auto-updates timelines, reassigns tasks
```

---

## AI That Sees Everything

```typescript
// Ask anything
await zoho`how is Acme Corp relationship?`
// "$75k deal in implementation, 45% complete, on schedule.
//  One ticket last week (resolved). Invoice paid on time.
//  Alice opened last 3 emails. Schedule mid-implementation check-in."

// Predictions use all apps
await zoho`churn risk Acme`
// 72% risk: 5 open tickets, unsubscribed newsletter,
// no meeting in 45 days, late on invoice

// Forecasting
await zoho`Q2 revenue forecast`
// New: $450k, Renewals: $850k, Expansions: $120k
// Total: $1.42M (+23% YoY)

// Capacity planning
await zoho`engineering capacity Q1`
// Available: 2400h, Committed: 1800h, Pipeline: 1200h
// Gap: 600h - hire or push BigCorp to Q2
```

### Cross-App Automation

```typescript
// Enterprise customer journey in one expression
await zoho`when deal closes > 50k`
  .then(deal => zoho`${deal.contact} is now customer`)
  .then(deal => zoho`create project for ${deal} from enterprise template`)
  .then(deal => zoho`invoice ${deal}`)
  .then(deal => zoho`add ${deal.contact} to enterprise segment`)
  .then(deal => zoho`notify customer success about ${deal}`)
```

---

## Universal Search

```typescript
// Search across all apps naturally
await zoho`find acme`
// Returns: contacts, deals, projects, tickets, invoices

// Contextual inference
await zoho`acme`                  // full picture
await zoho`acme deals`            // just deals
await zoho`acme this quarter`     // time-scoped
```

---

## Architecture

### One Durable Object = One Company

```
CompanyDO (per organization)
  |
  +-- SQLite: contacts, deals, projects, tickets, invoices
  |     (All entities share foreign keys - no sync needed)
  |
  +-- R2: files, attachments, exports
  |
  +-- Modules: CRM, Projects, Desk, Campaigns, Books, People
  |
  +-- AI Layer: cross-app intelligence, predictions, automation
```

### Why This Matters

Traditional Zoho:
```
App A  <--sync-->  App B  <--sync-->  App C
  |                  |                  |
  '-------> Data Warehouse <-----------'
                    |
              Analytics/AI (delayed)
```

zoho.do:
```
           SQLite (One Database)
                    |
   CRM - Projects - Desk - Campaigns - Books - People
                    |
              AI Layer (Real-time)
```

## vs Zoho One

| Feature | Zoho One | zoho.do |
|---------|----------|---------|
| **Cost (50 users)** | $27,000-54,000/year | ~$600/year |
| **Apps** | 50+ separate databases | One unified database |
| **Sync** | Constant conflicts | No sync needed |
| **AI** | Per-app, fragmented | Cross-app, unified |
| **Deploy** | SaaS only | Your infrastructure |

## Migration

```bash
npx zoho.do migrate --from-zoho
# Migrates all apps, unifies database, deduplicates contacts
```

## Roadmap

### Apps
- [x] CRM
- [x] Projects
- [x] Desk
- [x] Campaigns
- [x] Books
- [x] Forms
- [x] Analytics
- [ ] People (in progress)
- [ ] Survey
- [ ] Sign
- [ ] Inventory
- [ ] Subscriptions

### AI
- [x] Natural Language Queries
- [x] Cross-App Intelligence
- [x] Churn Prediction
- [x] Revenue Forecasting
- [ ] Capacity Planning
- [ ] Automated Workflows

## Contributing

zoho.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/zoho.do
cd zoho.do
pnpm install
pnpm test
```

## License

MIT License

---

<p align="center">
  <strong>One suite. One database. One AI.</strong>
  <br />
  The unified business platform Zoho could have been.
  <br /><br />
  <a href="https://zoho.do">Website</a> |
  <a href="https://docs.zoho.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/zoho.do">GitHub</a>
</p>
