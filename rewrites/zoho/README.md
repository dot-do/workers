# zoho.do

<p align="center">
  <strong>The Everything Suite. Unified. AI-Native. Actually Affordable.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/zoho.do"><img src="https://img.shields.io/npm/v/zoho.do.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/zoho.do"><img src="https://img.shields.io/npm/dm/zoho.do.svg" alt="npm downloads" /></a>
  <a href="https://github.com/drivly/zoho.do/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/zoho.do.svg" alt="license" /></a>
</p>

---

Zoho built an empire by being the "affordable" alternative. 50+ apps. 90 million users. But "affordable" still means $52-65/user/month for their full suite. And each app is its own silo with its own data.

**zoho.do** is the unified suite. CRM, Projects, Desk, Campaigns, Books - all in one Durable Object. One database. One API. AI that sees everything. Deploy in 60 seconds.

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
  apps: ['crm', 'projects', 'desk', 'campaigns', 'books'], // Enable what you need
})
```

---

## The Unified Suite

### CRM (Zoho CRM)

Full-featured CRM with cross-app visibility:

```typescript
import { zoho } from 'zoho.do'

// Create a lead
const lead = await zoho.crm.leads.create({
  firstName: 'Alice',
  lastName: 'Chen',
  email: 'alice@acme.com',
  company: 'Acme Corporation',
  phone: '+1-555-0123',
  source: 'Website',
  industry: 'Technology',
})

// Convert to contact + account + deal
const conversion = await zoho.crm.leads.convert(lead.id, {
  createDeal: true,
  dealName: 'Acme Corp - Enterprise License',
  dealValue: 75000,
})

// AI scoring (unified across all apps)
const score = await zoho.ai.score(lead.id)
// {
//   score: 85,
//   factors: [
//     { source: 'crm', factor: 'Company size matches ICP' },
//     { source: 'campaigns', factor: 'Opened 5 marketing emails' },
//     { source: 'desk', factor: 'No support tickets (good sign)' },
//   ],
// }
```

### Contacts Are Universal

One contact record, visible everywhere:

```typescript
// Create a contact once
const contact = await zoho.contacts.create({
  firstName: 'Alice',
  lastName: 'Chen',
  email: 'alice@acme.com',
  company: 'Acme Corporation',
})

// Same contact appears in:
await zoho.crm.contacts.get(contact.id)      // CRM view
await zoho.campaigns.contacts.get(contact.id) // Marketing view
await zoho.desk.customers.get(contact.id)     // Support view
await zoho.books.customers.get(contact.id)    // Billing view

// No sync. No duplicates. One record.
```

### Projects (Zoho Projects)

Project management with CRM integration:

```typescript
// Create a project (auto-linked to deal)
const project = await zoho.projects.create({
  name: 'Acme Corp Implementation',
  description: 'Q1 enterprise rollout',
  deal_id: deal.id,  // Cross-app link
  template: 'enterprise-implementation',
  start_date: '2025-02-01',
  end_date: '2025-04-30',
})

// Tasks with dependencies
await zoho.projects.tasks.create({
  project_id: project.id,
  name: 'Technical discovery',
  assignee: 'tom@company.com',
  due_date: '2025-02-07',
  priority: 'high',
})

await zoho.projects.tasks.create({
  project_id: project.id,
  name: 'Environment setup',
  assignee: 'ralph@company.com',
  due_date: '2025-02-14',
  depends_on: ['technical-discovery'],
})

// Milestones
await zoho.projects.milestones.create({
  project_id: project.id,
  name: 'Go Live',
  due_date: '2025-04-15',
  linked_tasks: ['training', 'data-migration', 'testing'],
})

// Time tracking
await zoho.projects.timesheet.log({
  task_id: task.id,
  user: 'tom@company.com',
  hours: 4,
  date: '2025-02-05',
  billable: true,
  notes: 'Technical discovery call with client',
})
```

### Desk (Zoho Desk)

Help desk with full customer context:

```typescript
// Create a ticket
const ticket = await zoho.desk.tickets.create({
  subject: 'Cannot access dashboard',
  description: 'Getting 403 error when trying to login...',
  contact_id: contact.id, // Same contact as CRM
  priority: 'high',
  channel: 'email',
})

// Agent sees EVERYTHING about this customer
const context = await zoho.desk.tickets.context(ticket.id)
// {
//   contact: { ... },
//   company: { ... },
//   crmDeals: [{ name: 'Enterprise License', value: 75000, stage: 'Implementation' }],
//   projects: [{ name: 'Acme Implementation', progress: 45 }],
//   invoices: [{ number: 'INV-001', amount: 25000, status: 'paid' }],
//   previousTickets: [{ subject: 'Setup question', resolved: true }],
//   campaigns: [{ name: 'Product Launch', opened: true, clicked: true }],
// }

// AI resolution (knows context from all apps)
const resolution = await zoho.ai.resolveTicket(ticket.id)
// AI knows:
// - They're a paying customer (from Books)
// - On an enterprise plan (from CRM deal)
// - In active implementation (from Projects)
// - Should be prioritized
```

### Campaigns (Zoho Campaigns)

Email marketing with unified contacts:

```typescript
// Create a campaign
const campaign = await zoho.campaigns.create({
  name: 'Q1 Product Launch',
  type: 'email',
  subject: 'Introducing our new features',
  content: '<h1>Big news!</h1>...',
  segment: {
    // Query across ALL apps
    query: `
      contacts.lifecycle_stage = 'customer'
      AND books.total_revenue > 10000
      AND desk.open_tickets = 0
    `,
  },
})

// Schedule
await zoho.campaigns.schedule(campaign.id, {
  send_at: '2025-01-15T09:00:00Z',
  timezone: 'America/New_York',
})

// Track across apps
campaign.on('opened', async (contact) => {
  // Update CRM engagement score
  await zoho.crm.contacts.update(contact.id, {
    last_marketing_engagement: new Date(),
    engagement_score: contact.engagement_score + 5,
  })
})

campaign.on('clicked', async (contact, link) => {
  if (link.type === 'pricing') {
    // Create CRM task for sales
    await zoho.crm.tasks.create({
      subject: `Follow up with ${contact.name} - clicked pricing`,
      contact_id: contact.id,
      due_date: 'tomorrow',
    })
  }
})
```

### Books (Zoho Books)

Accounting with complete context:

```typescript
// Create an invoice (linked to CRM deal)
const invoice = await zoho.books.invoices.create({
  customer_id: contact.id, // Same contact everywhere
  deal_id: deal.id,        // Links to CRM
  items: [
    { product: 'Enterprise License', quantity: 50, rate: 150 },
    { product: 'Implementation Services', quantity: 40, rate: 200, unit: 'hours' },
  ],
  due_date: '2025-03-01',
  terms: 'Net 30',
})

// When invoice is paid, everything updates
invoice.on('paid', async () => {
  // CRM: Update deal to Closed Won
  await zoho.crm.deals.update(deal.id, {
    stage: 'Closed Won',
    closed_date: new Date(),
  })

  // Projects: Start the project
  await zoho.projects.update(project.id, {
    status: 'active',
  })

  // Desk: Note on customer record
  await zoho.desk.customers.addNote(contact.id, {
    content: `Invoice ${invoice.number} paid. Implementation can begin.`,
  })
})

// Financial reports
const revenue = await zoho.books.reports.revenue({
  period: 'Q1',
  by: 'customer',
  include_crm_data: true, // See deal source, campaign attribution
})
```

### People (Zoho People)

HR with organizational context:

```typescript
// Employee onboarding
const employee = await zoho.people.employees.create({
  firstName: 'Bob',
  lastName: 'Smith',
  email: 'bob@company.com',
  department: 'Engineering',
  role: 'Senior Developer',
  manager: 'tom@company.com',
  start_date: '2025-02-01',
})

// Auto-provisioning
employee.on('created', async () => {
  // Create user in all apps
  await zoho.createUser({
    email: employee.email,
    name: `${employee.firstName} ${employee.lastName}`,
    apps: ['crm', 'projects', 'desk'],
    role: 'employee',
  })

  // Assign to projects
  await zoho.projects.teams.add(employee.id, 'engineering')

  // Create onboarding project
  await zoho.projects.create({
    name: `Onboarding: ${employee.firstName}`,
    template: 'employee-onboarding',
    assignee: employee.manager,
  })
})

// Time off (syncs with Projects)
await zoho.people.timeOff.request({
  employee_id: employee.id,
  type: 'vacation',
  start_date: '2025-03-15',
  end_date: '2025-03-22',
  reason: 'Spring break',
})
// Auto-updates project timelines, reassigns tasks
```

---

## AI That Sees Everything

### Unified AI (Zia Reimagined)

AI that works across all apps:

```typescript
import { zoho } from 'zoho.do'

// Ask anything
const answer = await zoho.ai.ask(`
  How is the Acme Corp relationship going?
`)

// AI sees:
// - CRM: Deal value, stage, activities
// - Projects: Implementation progress, blockers
// - Desk: Support tickets, satisfaction
// - Books: Payment history, outstanding invoices
// - Campaigns: Email engagement

console.log(answer)
// "Acme Corp is a $75,000 enterprise deal currently in implementation.
//  Project is 45% complete, on schedule for April go-live.
//  They had one support ticket last week (resolved).
//  Invoice #001 ($25,000) was paid on time.
//  Contact Alice Chen opened your last 3 marketing emails.
//  Recommendation: Schedule mid-implementation check-in call."
```

### Cross-App Automation

```typescript
// Automation that spans apps
await zoho.automations.create({
  name: 'Enterprise Customer Journey',
  trigger: {
    app: 'crm',
    event: 'deal.stage_changed',
    condition: { stage: 'Closed Won', value: { gte: 50000 } },
  },
  actions: [
    // CRM: Update record
    { app: 'crm', action: 'update_contact', data: { lifecycle_stage: 'customer' } },

    // Projects: Create implementation project
    { app: 'projects', action: 'create_project', data: { template: 'enterprise-implementation' } },

    // Desk: Create customer record with context
    { app: 'desk', action: 'create_customer', data: { priority: 'high' } },

    // Books: Create initial invoice
    { app: 'books', action: 'create_invoice', data: { template: 'enterprise-onboarding' } },

    // Campaigns: Add to customer segment
    { app: 'campaigns', action: 'add_to_segment', data: { segment: 'enterprise-customers' } },

    // People: Notify account team
    { app: 'people', action: 'notify', data: { team: 'customer-success' } },
  ],
})
```

### Predictive Intelligence

```typescript
// Churn prediction (uses all apps)
const churnRisk = await zoho.ai.predictChurn(contact.id)
// {
//   risk: 0.72, // 72% likely to churn
//   signals: [
//     { source: 'desk', signal: '5 open tickets, avg resolution 3 days' },
//     { source: 'campaigns', signal: 'Unsubscribed from newsletter' },
//     { source: 'crm', signal: 'No meeting in 45 days' },
//     { source: 'books', signal: 'Late on last invoice' },
//   ],
//   recommendation: 'Schedule urgent executive check-in',
// }

// Revenue forecasting (CRM + Books + Projects)
const forecast = await zoho.ai.forecast({
  period: 'Q2',
  include: ['new_deals', 'renewals', 'expansions'],
})
// {
//   newDeals: { predicted: 450000, confidence: 0.75 },
//   renewals: { predicted: 850000, confidence: 0.92 }, // Based on Books data
//   expansions: { predicted: 120000, confidence: 0.68 },
//   total: 1420000,
//   vsLastYear: +23,
// }

// Resource planning (Projects + People)
const capacity = await zoho.ai.planCapacity({
  period: 'Q1',
  team: 'engineering',
})
// {
//   available: 2400, // hours
//   committed: 1800, // from Projects
//   pipeline: 1200,  // from CRM deals
//   gap: 600,        // need to hire or delay
//   recommendation: 'Hire 1 engineer or push BigCorp project to Q2',
// }
```

---

## API Compatible

Drop-in replacement for Zoho APIs:

```typescript
// Before: Zoho Cloud
import { ZCRMRestClient } from '@zohocrm/nodejs-sdk-2.0'

// After: zoho.do (same SDK, different endpoint)
const config = {
  baseUrl: 'https://your-instance.zoho.do',
  // ... rest of config
}
```

### Unified API (New)

One API for everything:

```typescript
import { zoho } from 'zoho.do'

// Universal entity operations
const entities = await zoho.search({
  query: 'acme',
  apps: ['crm', 'projects', 'desk', 'books'],
})
// Returns contacts, deals, projects, tickets, invoices matching "acme"

// Cross-app queries
const results = await zoho.query(`
  SELECT
    c.name as contact_name,
    d.name as deal_name,
    d.value as deal_value,
    p.name as project_name,
    p.progress,
    i.total as invoice_total,
    i.status as invoice_status
  FROM crm.contacts c
  JOIN crm.deals d ON c.id = d.contact_id
  LEFT JOIN projects.projects p ON d.id = p.deal_id
  LEFT JOIN books.invoices i ON c.id = i.customer_id
  WHERE c.lifecycle_stage = 'customer'
`)
```

---

## Architecture

### One Durable Object = One Company

```
┌─────────────────────────────────────────────────────────────────────┐
│                          zoho.do Worker                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   CompanyDO (per organization)                  ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │                                                                 ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │              Unified Entity Store (SQLite)                  │││
│  │  │                                                             │││
│  │  │  contacts  │  deals  │  projects  │  tickets  │  invoices  │││
│  │  │    All entities share foreign keys - no sync needed         │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                 ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            ││
│  │  │   CRM   │  │ Projects│  │  Desk   │  │ Campaigns│            ││
│  │  │  Module │  │  Module │  │  Module │  │  Module │            ││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            ││
│  │                                                                 ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            ││
│  │  │  Books  │  │  People │  │  Forms  │  │ Analytics│            ││
│  │  │  Module │  │  Module │  │  Module │  │  Module │            ││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            ││
│  │                                                                 ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │                    Unified AI Layer                        │││
│  │  │         Cross-app intelligence, predictions, automation    │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  SQLite (all data)  │  R2 (files)  │  Vectorize (AI)  │  KV (cache)│
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Matters

Traditional Zoho:
```
App A Database  <--sync-->  App B Database  <--sync-->  App C Database
       \                          |                          /
        \                         |                         /
         '---------->  Data Warehouse  <------------------'
                            |
                     Analytics/AI
                   (delayed, incomplete)
```

zoho.do:
```
                    SQLite (One Database)
                           |
    +--------+--------+--------+--------+--------+
    |        |        |        |        |        |
   CRM   Projects   Desk   Campaigns  Books   People
    |        |        |        |        |        |
    +--------+--------+--------+--------+--------+
                           |
                    AI Layer (Real-time)
```

---

## Pricing Comparison

### Zoho One Pricing (2025)

| Plan | Per User/Month | 50 Users/Year |
|------|---------------|---------------|
| Zoho One (Flexible) | $45 | $27,000 |
| Zoho One (All Employee) | $90 | $54,000 |

Plus:
- Storage: +$4/5GB/month
- Zoho Flow: +$10-60/month
- Premium support: +$125-500/month

### zoho.do Pricing

| Resource | Cost | Notes |
|----------|------|-------|
| Durable Object | $0.15/million requests | Your company |
| SQLite Storage | $0.20/GB/month | ALL your data |
| R2 Storage | $0.015/GB/month | Files |
| Workers | Free tier: 100k/day | API calls |
| AI | ~$0.01/query | Via llm.do |

**Example: 50 users, 100k entities, 500k operations/month**

| | Zoho One | zoho.do |
|-|----------|---------|
| Software | $27,000-54,000/year | ~$50/month |
| Add-ons | $2,000+/year | $0 (included) |
| Sync conflicts | Constant | None |
| AI | Fragmented | Unified |
| **Total** | **$29,000-56,000/year** | **~$600/year** |

**Savings: 97-99%**

---

## Migration

```bash
npx zoho.do migrate --from-zoho

# Migrates from:
# - Zoho CRM
# - Zoho Projects
# - Zoho Desk
# - Zoho Campaigns
# - Zoho Books
# - Zoho People
# - Zoho Forms
# - Custom apps

# Unifies into single database
# Deduplicates contacts
# Preserves relationships
# Converts automations
```

---

## Available Modules

| Module | Zoho Equivalent | Status |
|--------|-----------------|--------|
| CRM | Zoho CRM | Complete |
| Projects | Zoho Projects | Complete |
| Desk | Zoho Desk | Complete |
| Campaigns | Zoho Campaigns | Complete |
| Books | Zoho Books | Complete |
| People | Zoho People | In Progress |
| Forms | Zoho Forms | Complete |
| Analytics | Zoho Analytics | Complete |
| Survey | Zoho Survey | Planned |
| Sign | Zoho Sign | Planned |
| Inventory | Zoho Inventory | Planned |
| Subscriptions | Zoho Subscriptions | Planned |

---

## Contributing

zoho.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/zoho.do
cd zoho.do
pnpm install
pnpm test
pnpm dev
```

---

## License

MIT License

---

<p align="center">
  <strong>One suite. One database. One AI. One deployment.</strong>
  <br />
  The unified business platform Zoho could have been.
  <br /><br />
  <a href="https://zoho.do">Website</a> |
  <a href="https://docs.zoho.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/zoho.do">GitHub</a>
</p>
