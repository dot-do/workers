# airtable.do

> The spreadsheet-database. Edge-Native. Open by Default. AI-First.

Airtable bridged the gap between spreadsheets and databases. But at $20-45/user/month with row limits, record caps, and AI locked behind enterprise pricing, it's become expensive for what it is.

**airtable.do** is the spreadsheet-database reimagined. No row limits. No per-seat pricing. AI that builds apps for you. Own your data infrastructure.

## AI-Native API

```typescript
import { airtable } from 'airtable.do'           // Full SDK
import { airtable } from 'airtable.do/tiny'      // Minimal client
import { airtable } from 'airtable.do/sync'      // Real-time sync
```

Natural language for data workflows:

```typescript
import { airtable } from 'airtable.do'

// Talk to it like a colleague
const deals = await airtable`deals over $50k closing this month`
const forecast = await airtable`projected revenue for Q2`
const churn = await airtable`customers at risk of churning`

// Chain like sentences
await airtable`leads needing followup`
  .notify(`Time to reach out`)

// Apps that build themselves
await airtable`create project tracker with tasks, owners, and deadlines`
  .addView('kanban by status')
  .addView('calendar by deadline')
```

## The Problem

Airtable's pricing creates artificial scarcity:

| Plan | Price | Limits |
|------|-------|--------|
| Free | $0 | 1,000 records/base, 1GB attachments |
| Team | $20/user/month | 50,000 records/base, 20GB |
| Business | $45/user/month | 125,000 records/base, 100GB |
| Enterprise | Custom | 500,000 records, unlimited |

**50-person team on Business?** That's **$27,000/year**. For a spreadsheet with a database backend.

The real costs:
- **Record limits** - Hit 50k rows? Pay more or split your data
- **Per-seat pricing** - Every viewer costs money
- **Sync limits** - Real-time sync only on higher tiers
- **AI locked away** - AI features require Enterprise
- **Automation limits** - 25k-500k runs/month depending on tier
- **API rate limits** - 5 requests/second, seriously

## The Solution

**airtable.do** is what Airtable should be:

```
Traditional Airtable          airtable.do
-----------------------------------------------------------------
$20-45/user/month             $0 - run your own
Row limits (1k-500k)          Unlimited rows
Per-seat pricing              Use what you need
AI for Enterprise             AI-native from start
5 req/sec API limit           Unlimited API
Their servers                 Your Cloudflare account
Proprietary formulas          Open formulas + TypeScript
```

## One-Click Deploy

```bash
npx create-dotdo airtable
```

Your own Airtable. Running on Cloudflare. No limits.

```typescript
import { Airtable } from 'airtable.do'

export default Airtable({
  name: 'my-workspace',
  domain: 'data.my-company.com',
})
```

## Features

### Bases & Tables

```typescript
// Create bases naturally
await airtable`create Product Development base`
await airtable`add Features table with name, status, priority, owner, and due date`
await airtable`add Sprints table linked to Features`

// AI infers the schema from your description
await airtable`
  create CRM with:
  - Companies with name, industry, size, and website
  - Contacts linked to companies with name, email, role
  - Deals linked to contacts with amount, stage, close date
`
```

### Records

```typescript
// Create records naturally
await airtable`add task "Design homepage" for Sarah due Friday`
await airtable`new deal Acme Corp $50k in negotiation with John`
await airtable`
  add contacts:
  - Jane Smith, CEO at TechCo, jane@techco.com
  - Bob Wilson, CTO at StartupX, bob@startupx.com
`

// Query naturally
const tasks = await airtable`tasks assigned to Sarah`
const overdue = await airtable`overdue items`
const pipeline = await airtable`deals in negotiation over $25k`

// Update naturally
await airtable`mark "Design homepage" complete`
await airtable`move Acme deal to closed won`
await airtable`assign all unassigned tasks to Mike`
```

### Field Types

All the field types you'd expect - text, numbers, dates, dropdowns, linked records, formulas, attachments, and more. AI infers the right type from context.

### Formulas

```typescript
// Describe the calculation, AI writes the formula
await airtable`add formula "days until due" to Tasks`
await airtable`add field showing whether tasks are overdue`
await airtable`calculate total deal value per company`

// Or express complex logic naturally
await airtable`
  add priority score that's higher for:
  - critical items (100 points)
  - overdue items (1.5x multiplier)
  - high value deals (extra 25 points if over $50k)
`
```

### Views

```typescript
// Create views naturally
await airtable`show tasks as kanban by status`
await airtable`show deals as calendar by close date`
await airtable`show projects as timeline from start to due date`
await airtable`show designs as gallery with mockups`

// Filtered views
await airtable`show my tasks sorted by priority`
await airtable`show overdue items grouped by owner`
await airtable`show Q1 deals over $50k as funnel by stage`
```

### Forms

```typescript
// Create forms from tables
await airtable`create feedback form from Feedback table`
await airtable`create job application form with name, email, resume, and cover letter`

// Configure with natural language
await airtable`make feedback form public with logo and custom thank you message`
await airtable`notify #product-feedback on Slack when form submitted`
```

## AI-Native Data Management

AI doesn't just assist - it builds with you.

### Schema Design

```typescript
// Describe what you need, AI builds the schema
await airtable`
  I need to track content marketing:
  - blog posts with authors and topics
  - draft, review, published workflow
  - SEO metrics and social engagement
`
// AI creates Posts, Authors, Topics tables with proper relationships
```

### Data Entry

```typescript
// Enter data naturally
await airtable`add post "AI in Project Management" by Sarah, topics AI and Productivity`
await airtable`
  add contacts:
  - John Smith, CEO at Acme, john@acme.com, met at conference
  - Jane Doe, CTO at TechCo, jane@techco.com, inbound lead
`
```

### Data Cleanup

```typescript
// Fix messy data with one command
await airtable`clean up Contacts: fix phone formats, merge duplicates, categorize companies`
await airtable`standardize country names in Leads table`
await airtable`split full names into first and last name`
```

### Insights

```typescript
// Ask questions about your data
await airtable`which products are performing best this quarter?`
await airtable`who's exceeding quota?`
await airtable`show me churn risk by customer segment`

// Get actionable recommendations
await airtable`what should we focus on to hit Q2 targets?`
```

## Automations

```typescript
// Create automations naturally
await airtable`when new user signs up, send welcome email and notify #signups`
await airtable`when deal over $100k changes, notify sales director`
await airtable`every Monday at 9am, email pipeline report to sales team`

// Chain automations with agents
await airtable`new leads`
  .map(lead => priya`qualify ${lead}`)
  .map(lead => airtable`update ${lead} with qualification score`)
  .filter(lead => lead.score > 80)
  .map(lead => sally`draft outreach for ${lead}`)

// Bulk operations as pipelines
await airtable`overdue tasks`
  .map(task => airtable`notify owner of ${task}`)
  .map(task => airtable`escalate ${task} if over 7 days`)
```

## Interfaces (Apps)

```typescript
// Build dashboards naturally
await airtable`create sales dashboard with pipeline value, deals by stage, and recent activity`
await airtable`add funnel chart showing deals by status`
await airtable`add team performance page with quotas and leaderboard`

// Deploy as standalone apps
await airtable`publish sales dashboard at sales.my-company.com with SSO`
await airtable`create public status page from Projects table`
```

## API Compatible

Full Airtable REST API compatibility. Existing Airtable SDK code works - just change the URL:

```typescript
import Airtable from 'airtable'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
  endpointUrl: 'https://your-org.airtable.do',  // Just change this
}).base('appXXXXXXXX')
```

## Architecture

### Durable Object per Base

```
WorkspaceDO (bases, permissions)
  |
  +-- BaseDO:product-base
  |     +-- SQLite: tables, records, relations
  |     +-- Views, filters, formulas
  |     +-- WebSocket: real-time sync
  |
  +-- BaseDO:crm-base
  +-- BaseDO:content-base
  +-- AutomationDO (automation engine)
```

Each base is fully isolated. SQLite handles millions of rows efficiently. No artificial limits.

## Migration from Airtable

```bash
npx airtable-do migrate --token=your_pat --base=appXXXXXXXX
```

Imports everything: tables, records, views, linked records, formulas, automations.

## Roadmap

- [x] Tables with all field types
- [x] Linked records and rollups
- [x] Formulas (Airtable-compatible)
- [x] All view types
- [x] Forms
- [x] API compatibility
- [x] Automations (unlimited)
- [x] AI schema and formula generation
- [ ] Interfaces (custom apps)
- [ ] Extensions marketplace
- [ ] Synced tables
- [ ] Real-time collaboration
- [ ] Scripting (TypeScript)

## Why Open Source?

Your data infrastructure shouldn't have row limits:

1. **Your data** - Operational data is too important for third parties
2. **Your schema** - How you model data is institutional knowledge
3. **Your automations** - Business logic lives in workflows
4. **Your AI** - Intelligence on your data should be yours

Airtable showed the world what spreadsheet-database hybrids could be. **airtable.do** removes the limits and adds the AI.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- Field types and formula engine
- Views and visualization
- AI capabilities
- API compatibility
- Performance optimization

## License

MIT License - Build your business on it.

---

<p align="center">
  <strong>The row limits end here.</strong>
  <br />
  No caps. No per-seat pricing. AI-native.
  <br /><br />
  <a href="https://airtable.do">Website</a> |
  <a href="https://docs.airtable.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/airtable.do">GitHub</a>
</p>
