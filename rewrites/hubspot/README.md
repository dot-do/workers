# hubspot.do

> Your own HubSpot. One click. AI-native. Open source.

[![npm version](https://img.shields.io/npm/v/hubspot.do.svg)](https://www.npmjs.com/package/hubspot.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The Problem

HubSpot is a $30 billion company. They charge $800 to $3,600 per month for enterprise features. You are paying for:

- **Their data centers** - You foot the bill for infrastructure you do not control
- **Their margins** - 80%+ gross margins extracted from your business
- **Their roadmap** - Features built for their largest customers, not you
- **Their lock-in** - Your customer data held hostage in their walled garden

And here is the worst part: **you are a tenant in someone else's system**. Your CRM data, your customer relationships, your sales pipeline - all living on servers you will never own, governed by terms you did not write, priced at whatever they decide next quarter.

This was the only option in 2006 when HubSpot launched. It is not the only option anymore.

---

## The Solution

**hubspot.do** is a complete HubSpot alternative that you own.

```bash
npx create-dotdo hubspot
```

One command. Your own instance. Running on Cloudflare's global edge network. Pennies per month instead of hundreds or thousands of dollars.

```typescript
import { HubSpot } from 'hubspot.do'

const crm = new HubSpot(env.HUBSPOT)

// Full CRM capabilities
await crm.contacts.create({
  email: 'alice@startup.com',
  firstName: 'Alice',
  lastName: 'Chen',
  company: 'Acme Corp'
})

// Pipeline management
await crm.deals.create({
  name: 'Enterprise Contract',
  amount: 50000,
  stage: 'qualification',
  contact: 'alice@startup.com'
})

// Marketing automation
await crm.workflows.trigger('welcome-sequence', {
  contact: 'alice@startup.com'
})
```

Not a "HubSpot alternative." Not a "lightweight CRM." This is **your own HubSpot** - the complete platform, reimagined for the AI era, running entirely under your control.

---

## Why This Matters

### For Startup Founders

You are burning $10,000 to $40,000 per year on CRM software before you have product-market fit. That is runway. That is hiring budget. That is your survival.

With hubspot.do:
- **Deploy in 60 seconds** - No sales calls, no procurement, no enterprise contracts
- **Pay for usage** - Pennies per thousand operations, not per seat
- **Own your data** - Export everything, migrate anywhere, no lock-in
- **Scale infinitely** - From zero to millions of contacts without upgrades

### For AI-First Companies

HubSpot was built for humans clicking through web interfaces. Your AI agents need something different:

- **Every action is an API call** - No UI-only features, no hidden functionality
- **MCP tools built in** - Claude, GPT, and any LLM can operate your CRM directly
- **Real-time webhooks** - AI workflows triggered by every customer interaction
- **Structured data** - Schema-first design, not form fields bolted onto a legacy system

### For Anyone Who Values Freedom

Your customer relationships are your business. They should not be trapped in a vendor's database, subject to their pricing whims, their outages, their decisions about what features you need.

hubspot.do gives you **sovereignty over your sales data**.

---

## One-Click Deploy

### Cloudflare Workers

```bash
npx create-dotdo hubspot
```

This scaffolds a complete hubspot.do instance configured for your Cloudflare account.

### Manual Setup

```typescript
// src/index.ts
import { HubSpotDO, HubSpotEntrypoint } from 'hubspot.do'

export { HubSpotDO }
export default HubSpotEntrypoint
```

```jsonc
// wrangler.jsonc
{
  "name": "my-hubspot",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [{ "name": "HUBSPOT", "class_name": "HubSpotDO" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["HubSpotDO"] }]
}
```

```bash
npx wrangler deploy
```

Your HubSpot is now live at the edge. Globally distributed. Zero cold starts.

---

## Features

### CRM Core

| Feature | Description |
|---------|-------------|
| **Contacts** | Full contact management with custom properties, lifecycle stages, and activity timeline |
| **Companies** | Organization records with hierarchies, domains, and relationship mapping |
| **Deals** | Sales pipeline with stages, amounts, close dates, and win probability |
| **Tickets** | Support ticketing with SLAs, priorities, and agent assignment |
| **Products** | Product catalog with SKUs, pricing, and inventory tracking |
| **Quotes** | Quote generation with line items, discounts, and approval workflows |

### Marketing Hub

| Feature | Description |
|---------|-------------|
| **Email Campaigns** | Drag-and-drop email builder with templates and A/B testing |
| **Forms** | Lead capture forms with conditional logic and progressive profiling |
| **Landing Pages** | Page builder with conversion tracking and personalization |
| **Lists** | Smart segmentation with AND/OR logic and real-time updates |
| **Workflows** | Visual automation builder for nurture sequences and lead scoring |
| **Analytics** | Campaign performance, attribution modeling, and ROI tracking |

### Sales Hub

| Feature | Description |
|---------|-------------|
| **Pipelines** | Multiple pipelines with customizable stages and probability |
| **Tasks** | Task queues with due dates, reminders, and sequences |
| **Meetings** | Calendar integration with booking links and round-robin |
| **Sequences** | Multi-step outreach automation with personalization |
| **Documents** | Document tracking with view notifications and analytics |
| **Forecasting** | Revenue forecasting with weighted pipeline and trends |

### Service Hub

| Feature | Description |
|---------|-------------|
| **Tickets** | Multi-channel ticket creation with routing and escalation |
| **Knowledge Base** | Self-service articles with search and feedback |
| **Customer Portal** | Branded portal for ticket submission and tracking |
| **Feedback Surveys** | NPS, CSAT, and CES surveys with automation triggers |
| **SLA Management** | Response and resolution time tracking with alerts |

### Integrations

| Feature | Description |
|---------|-------------|
| **Email Sync** | Two-way sync with Gmail, Outlook, and IMAP providers |
| **Calendar Sync** | Google Calendar and Microsoft 365 integration |
| **Calling** | VoIP integration with call logging and recording |
| **Slack** | Real-time notifications and deal room collaboration |
| **Zapier/n8n** | Webhook triggers for 5000+ app integrations |

---

## AI-Native

hubspot.do is built from the ground up for AI agents. Not retrofitted. Not an afterthought.

### MCP Tools

Every CRM operation is available as an MCP tool:

```typescript
import { hubspotTools, invokeTool } from 'hubspot.do/mcp'

// List available tools
console.log(hubspotTools.map(t => t.name))
// ['contacts_create', 'contacts_search', 'deals_create', 'deals_update',
//  'workflows_trigger', 'lists_add', 'emails_send', 'meetings_book', ...]

// AI agents can invoke directly
await invokeTool('contacts_create', {
  email: 'lead@prospect.com',
  firstName: 'New',
  lastName: 'Lead',
  source: 'ai-outreach'
})
```

### Natural Language Queries

```typescript
import { HubSpot } from 'hubspot.do'

const crm = new HubSpot(env.HUBSPOT)

// Natural language search
const results = await crm.search({
  natural: 'find all enterprise deals closing this quarter over $50k'
})

// AI-powered lead scoring
const score = await crm.contacts.score({
  contact: 'alice@startup.com',
  model: 'engagement-propensity'
})
```

### agents.do Integration

hubspot.do is a core service of the [workers.do](https://workers.do) platform:

```typescript
import { sally, mark } from 'agents.do'
import { HubSpot } from 'hubspot.do'

// Sally handles sales outreach
const leads = await sally`find warm leads from yesterday's webinar`
for (const lead of leads) {
  await sally`send personalized follow-up to ${lead}`
}

// Mark writes marketing content
const campaign = await mark`create email sequence for product launch`
await crm.workflows.deploy(campaign)

// They work together
await sally.watch(crm.deals, { stage: 'closed-won' }, async (deal) => {
  await mark`write case study about ${deal.company}`
})
```

### Webhook Everything

Every CRM event triggers webhooks your AI agents can consume:

```typescript
import { HubSpot } from 'hubspot.do'

const crm = new HubSpot(env.HUBSPOT)

// React to any CRM event
crm.on('contact.created', async (contact) => {
  await enrichContact(contact)
  await scoreContact(contact)
  await routeToRep(contact)
})

crm.on('deal.stage_changed', async (deal, prev, next) => {
  if (next === 'negotiation') {
    await notifyManager(deal)
    await prepareContract(deal)
  }
})

crm.on('ticket.created', async (ticket) => {
  const response = await aiGenerateResponse(ticket)
  await ticket.reply(response)
})
```

---

## API Compatible

hubspot.do implements the HubSpot API specification. Your existing integrations work unchanged.

### Drop-In Replacement

```typescript
// Before: HubSpot Cloud
import Hubspot from '@hubspot/api-client'
const client = new Hubspot.Client({ accessToken: process.env.HUBSPOT_TOKEN })

// After: hubspot.do (same code, just change the base URL)
import Hubspot from '@hubspot/api-client'
const client = new Hubspot.Client({
  accessToken: process.env.HUBSPOT_TOKEN,
  basePath: 'https://your-instance.hubspot.do'
})

// Everything works the same
const contact = await client.crm.contacts.basicApi.create({
  properties: { email: 'new@contact.com', firstname: 'New' }
})
```

### Supported API Endpoints

| API | Compatibility |
|-----|---------------|
| **CRM Objects** | Full - contacts, companies, deals, tickets, products, quotes |
| **CRM Associations** | Full - all standard and custom association types |
| **CRM Properties** | Full - property groups, definitions, and validation |
| **CRM Pipelines** | Full - stages, probability, and automation |
| **CRM Search** | Full - filter groups, sorting, and pagination |
| **Marketing Emails** | Full - templates, campaigns, and analytics |
| **Forms** | Full - submissions, progressive profiling |
| **Workflows** | Full - actions, branches, and enrollment |
| **Files** | Full - upload, folders, and CDN delivery |
| **Webhooks** | Full - subscriptions and event delivery |

### Migration Path

```bash
# Export from HubSpot Cloud
npx hubspot.do migrate export --source=hubspot-cloud

# Import to your instance
npx hubspot.do migrate import --target=https://your-instance.hubspot.do
```

Full data migration including contacts, companies, deals, activities, and custom properties.

---

## Architecture

```
+------------------------------------------------------------------+
|                        Your Application                           |
+------------------+-------------------+----------------------------+
|   HubSpot SDK    |   REST API        |   MCP Tools               |
|   (Compatible)   |   (HTTP/RPC)      |   (AI Agents)             |
+------------------+---------+---------+----------------------------+
                             |
+----------------------------v---------------------------------+
|                       hubspot.do Worker                       |
+--------------------------------------------------------------+
|                                                              |
|  +----------+  +------------+  +-----------+  +-----------+  |
|  |   CRM    |  |  Marketing |  |   Sales   |  |  Service  |  |
|  +----------+  +------------+  +-----------+  +-----------+  |
|  | Contacts |  | Emails     |  | Pipelines |  | Tickets   |  |
|  | Companies|  | Forms      |  | Tasks     |  | KB        |  |
|  | Deals    |  | Workflows  |  | Meetings  |  | Feedback  |  |
|  | Tickets  |  | Analytics  |  | Sequences |  | SLAs      |  |
|  +----------+  +------------+  +-----------+  +-----------+  |
|                                                              |
+--------------------------------------------------------------+
|             Durable Object (HubSpotDO)                       |
+------------------------+-------------------------------------+
|       SQLite           |              R2                      |
|   (Hot Data Layer)     |    (Files, Attachments, Assets)     |
+------------------------+-------------------------------------+
```

### Why Durable Objects?

1. **Single-threaded consistency** - No race conditions on contact updates
2. **SQLite built-in** - Real relational database, not key-value hacks
3. **Automatic scaling** - Millions of CRM instances, zero configuration
4. **Global distribution** - Data lives at the edge, near your users
5. **Zero cold starts** - Always warm, always fast
6. **R2 integration** - Unlimited storage for files and attachments

### Storage Tiers

| Tier | Storage | Use Case |
|------|---------|----------|
| **Hot** | SQLite | Active contacts, recent deals, live workflows |
| **Warm** | R2 | Historical activities, email content, attachments |
| **Cold** | R2 Archive | Compliance archives, audit trails |

```typescript
import { TieredHubSpot } from 'hubspot.do/storage'

const crm = new TieredHubSpot({
  hot: env.HUBSPOT,
  warm: env.R2_BUCKET,
  cold: env.ARCHIVE,
  thresholds: {
    hotMaxContacts: 1_000_000,
    activityRetentionDays: 90,
  }
})
```

---

## Getting Started

### Installation

```bash
npm install hubspot.do
```

### Basic Usage

```typescript
import { HubSpot } from 'hubspot.do'

const crm = new HubSpot(env.HUBSPOT)

// Create a contact
const contact = await crm.contacts.create({
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  company: 'Acme Corp',
  phone: '+1-555-0123',
  lifecycleStage: 'lead'
})

// Search contacts
const results = await crm.contacts.search({
  filters: [
    { property: 'lifecycleStage', operator: 'eq', value: 'lead' },
    { property: 'createdate', operator: 'gte', value: lastWeek }
  ],
  sorts: [{ property: 'createdate', direction: 'desc' }],
  limit: 50
})

// Create a deal
const deal = await crm.deals.create({
  name: 'Enterprise License',
  amount: 25000,
  stage: 'qualification',
  closeDate: nextMonth,
  associatedContacts: [contact.id]
})

// Update deal stage
await crm.deals.update(deal.id, {
  stage: 'proposal',
  amount: 30000
})

// Trigger a workflow
await crm.workflows.enroll('new-lead-nurture', contact.id)
```

### Real-Time Updates

```typescript
import { HubSpot } from 'hubspot.do'

const crm = new HubSpot(env.HUBSPOT)

// Subscribe to contact changes
const unsubscribe = crm.contacts.watch({
  filters: [{ property: 'lifecycleStage', operator: 'eq', value: 'customer' }]
}, (event) => {
  console.log(`New customer: ${event.contact.email}`)
  sendWelcomePackage(event.contact)
})

// Subscribe to deal movements
crm.deals.watch({
  filters: [{ property: 'stage', operator: 'eq', value: 'closed-won' }]
}, async (event) => {
  await celebrateWin(event.deal)
  await provisionAccount(event.deal)
})
```

### Marketing Automation

```typescript
import { HubSpot } from 'hubspot.do'

const crm = new HubSpot(env.HUBSPOT)

// Create an email template
const template = await crm.emails.createTemplate({
  name: 'Welcome Email',
  subject: 'Welcome to {{company.name}}!',
  body: `
    Hi {{contact.firstName}},

    Thanks for signing up! Here's what to do next...

    Best,
    The Team
  `
})

// Create a workflow
const workflow = await crm.workflows.create({
  name: 'New Signup Nurture',
  trigger: {
    type: 'form_submission',
    formId: 'signup-form'
  },
  actions: [
    { type: 'send_email', templateId: template.id, delay: 0 },
    { type: 'wait', duration: '3d' },
    { type: 'send_email', templateId: 'follow-up-1', delay: 0 },
    { type: 'branch', condition: 'has_opened_email', yes: 'qualify', no: 'wait' },
    { type: 'update_property', property: 'lifecycleStage', value: 'mql', id: 'qualify' }
  ]
})

// Activate the workflow
await crm.workflows.activate(workflow.id)
```

---

## The Rewrites Ecosystem

hubspot.do is part of the rewrites family - reimplementations of legacy SaaS platforms on Cloudflare Durable Objects:

| Rewrite | Original | Monthly Cost Savings |
|---------|----------|---------------------|
| **hubspot.do** | HubSpot ($800-3600/mo) | 95-99% |
| [salesforce.do](https://salesforce.do) | Salesforce ($75-300/user/mo) | 95-99% |
| [zendesk.do](https://zendesk.do) | Zendesk ($55-115/agent/mo) | 90-95% |
| [intercom.do](https://intercom.do) | Intercom ($74-139/seat/mo) | 90-95% |
| [mailchimp.do](https://mailchimp.do) | Mailchimp ($13-350/mo) | 80-95% |
| [stripe.do](https://stripe.do) | Stripe Atlas ($500 + 2.9%) | 50-70% |

Each rewrite follows the same pattern:
- **Your own instance** - Not multi-tenant, not shared, yours
- **Durable Object per workspace** - Isolated, consistent, scalable
- **SQLite for hot data** - Real database, real queries
- **R2 for files** - Unlimited storage, global CDN
- **MCP tools** - AI-native from day one
- **API compatible** - Existing integrations work

---

## Pricing Comparison

### HubSpot Cloud Pricing (2025)

| Plan | Monthly Cost | What You Get |
|------|--------------|--------------|
| **Starter** | $20/mo | 1,000 contacts, basic features |
| **Professional** | $800/mo | 2,000 contacts, automation |
| **Enterprise** | $3,600/mo | 10,000 contacts, advanced features |

Plus: $45/mo per additional 1,000 contacts. Per-seat pricing for Sales and Service Hubs.

### hubspot.do Pricing

| Resource | Cost | Notes |
|----------|------|-------|
| **Durable Object** | $0.15/million requests | Your CRM instance |
| **SQLite Storage** | $0.20/GB/month | Contact and deal data |
| **R2 Storage** | $0.015/GB/month | Files and attachments |
| **Workers** | Free tier: 100k/day | API and webhook handling |

**Example: 10,000 contacts, 50,000 monthly operations**

- HubSpot Enterprise: **$3,600/month**
- hubspot.do: **~$5/month**

That is a **99.86% cost reduction**.

---

## Frequently Asked Questions

### Is this really a complete HubSpot replacement?

hubspot.do implements the core CRM, Marketing, Sales, and Service Hub functionality that 90% of HubSpot users actually use. Enterprise features like predictive lead scoring and custom behavioral events are on the roadmap.

### What about HubSpot's ecosystem of integrations?

hubspot.do is API-compatible with HubSpot. Most integrations that work with HubSpot's API will work with hubspot.do by changing the base URL. We also provide native webhooks and MCP tools for AI-first integrations.

### Can I migrate from HubSpot Cloud?

Yes. We provide migration tools that export your contacts, companies, deals, activities, and custom properties from HubSpot Cloud and import them into your hubspot.do instance.

### What about support?

hubspot.do is open source (MIT license). Community support is available via GitHub Issues. Enterprise support contracts are available for organizations that need SLAs.

### Is my data secure?

Your data runs on Cloudflare's infrastructure with enterprise-grade security. You control the encryption keys. You control access. Your data never leaves infrastructure you control.

### What if Cloudflare goes down?

Cloudflare has a 99.99% uptime SLA. Your Durable Object data is automatically replicated across multiple regions. For additional resilience, enable continuous backup to your own R2 bucket or external storage.

---

## Contributing

hubspot.do is open source and welcomes contributions.

```bash
# Clone the repository
git clone https://github.com/drivly/hubspot.do.git
cd hubspot.do

# Install dependencies
npm install

# Run tests
npm test

# Start local development
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT - see [LICENSE](LICENSE)

---

## The Manifesto

We are in the early days of a fundamental shift.

For two decades, SaaS vendors built empires by hosting software you could have run yourself. They charged rent on your data. They dictated your upgrade path. They held your customer relationships hostage.

The cloud was supposed to democratize computing. Instead, it created new landlords.

**That era is ending.**

Edge computing, Durable Objects, and AI agents are collapsing the complexity that justified SaaS premiums. The same CRM that costs $3,600/month can now run on infrastructure that costs $5/month. The same features that required a 500-person engineering team can be replicated by AI-assisted development in weeks.

hubspot.do is not just a cheaper HubSpot. It is a statement:

**Your customer data belongs to you.**

**Your sales pipeline belongs to you.**

**Your business relationships belong to you.**

One click. Your own HubSpot. Forever.

---

<p align="center">
  <strong>Take back control.</strong>
</p>
