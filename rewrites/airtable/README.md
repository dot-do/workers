# airtable.do

> The spreadsheet-database. Open source. AI-supercharged.

Airtable bridged the gap between spreadsheets and databases. Anyone could build apps without code. But at $20-45/user/month with row limits, record caps, and AI locked behind enterprise pricing, it's become expensive for what it is.

**airtable.do** is the spreadsheet-database reimagined. No row limits. No per-seat pricing. AI that builds apps for you. Own your data infrastructure.

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

```bash
# Or add to existing workers.do project
npx dotdo add airtable
```

## The workers.do Way

You're building a product. Your team needs a flexible database. Airtable wants $27k/year with row limits and 5 requests/second API throttling. AI locked behind enterprise. There's a better way.

**Natural language. Tagged templates. AI agents that work.**

```typescript
import { airtable } from 'airtable.do'
import { priya, ralph, mark } from 'agents.do'

// Talk to your database like a human
const deals = await airtable`show deals over $50k closing this month`
const forecast = await airtable`projected revenue for Q2?`
const churn = await airtable`which customers are at risk?`
```

**Promise pipelining - chain work without Promise.all:**

```typescript
// CRM automation pipeline
const processed = await airtable`get new leads`
  .map(lead => priya`qualify ${lead}`)
  .map(lead => sally`draft outreach for ${lead}`)
  .map(lead => airtable`update ${lead} status`)

// Data cleanup pipeline
const cleaned = await airtable`find records with missing data`
  .map(record => ralph`enrich ${record} from sources`)
  .map(record => airtable`update ${record}`)
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Bases & Tables

The familiar structure:

```typescript
import { Base, Table, Field } from 'airtable.do'

// Create a base
const productBase = await Base.create({
  name: 'Product Development',
  tables: [
    Table.create({
      name: 'Features',
      fields: {
        Name: Field.text({ primary: true }),
        Description: Field.longText(),
        Status: Field.singleSelect(['Planned', 'In Progress', 'Shipped']),
        Priority: Field.singleSelect(['Low', 'Medium', 'High', 'Critical']),
        Owner: Field.user(),
        Team: Field.multipleSelect(['Frontend', 'Backend', 'Mobile', 'Platform']),
        Sprint: Field.linkedRecord('Sprints'),
        StartDate: Field.date(),
        DueDate: Field.date(),
        Progress: Field.percent(),
        Attachments: Field.attachment(),
        Created: Field.createdTime(),
        Modified: Field.lastModifiedTime(),
      },
    }),
    Table.create({
      name: 'Sprints',
      fields: {
        Name: Field.text({ primary: true }),
        StartDate: Field.date(),
        EndDate: Field.date(),
        Features: Field.linkedRecord('Features', { bidirectional: true }),
        TotalPoints: Field.rollup({
          linkedField: 'Features',
          rollupField: 'Points',
          aggregation: 'SUM',
        }),
      },
    }),
  ],
})
```

### Field Types

All the field types you need:

| Type | Description |
|------|-------------|
| **Text** | Single line text |
| **Long Text** | Rich text with formatting |
| **Number** | Integers and decimals with formatting |
| **Currency** | Money with currency symbol |
| **Percent** | Percentage values |
| **Checkbox** | Boolean values |
| **Date** | Date with optional time |
| **Duration** | Time duration |
| **Single Select** | Dropdown with one choice |
| **Multiple Select** | Tags, multiple choices |
| **User** | Collaborators |
| **Linked Record** | Relations to other tables |
| **Lookup** | Values from linked records |
| **Rollup** | Aggregations across links |
| **Count** | Count of linked records |
| **Formula** | Calculated values |
| **Attachment** | Files, images |
| **URL** | Links with preview |
| **Email** | Email addresses |
| **Phone** | Phone numbers |
| **Rating** | Star ratings |
| **Barcode** | Barcode/QR data |
| **Auto Number** | Auto-incrementing IDs |
| **Created Time** | When record was created |
| **Last Modified** | When record was updated |
| **Created By** | Who created it |
| **Last Modified By** | Who last updated it |

### Formulas

Powerful calculations:

```typescript
// Simple formulas
const fullName = Field.formula('FirstName & " " & LastName')
const daysUntilDue = Field.formula('DATETIME_DIFF(DueDate, TODAY(), "days")')
const isOverdue = Field.formula('AND(Status != "Done", DueDate < TODAY())')

// Complex formulas
const priorityScore = Field.formula(`
  IF(Priority = "Critical", 100,
    IF(Priority = "High", 75,
      IF(Priority = "Medium", 50, 25)))
  * IF(DueDate < TODAY(), 1.5, 1)
`)

// Rollup with filter
const completedPoints = Field.rollup({
  linkedField: 'Tasks',
  rollupField: 'Points',
  aggregation: 'SUM',
  filter: '{Status} = "Done"',
})
```

### Views

Same data, infinite perspectives:

```typescript
// Grid View (default)
const allFeatures = View.grid({
  fields: ['Name', 'Status', 'Priority', 'Owner', 'DueDate'],
  sort: [{ field: 'Priority', direction: 'desc' }],
  filter: { Status: { neq: 'Shipped' } },
})

// Kanban View
const featureBoard = View.kanban({
  groupBy: 'Status',
  cardFields: ['Name', 'Owner', 'Priority', 'DueDate'],
  coverField: 'Attachments',
})

// Calendar View
const roadmapCalendar = View.calendar({
  dateField: 'DueDate',
  endDateField: 'EndDate',  // Optional, for ranges
  color: 'Priority',
})

// Timeline View (Gantt)
const projectTimeline = View.timeline({
  startField: 'StartDate',
  endField: 'DueDate',
  groupBy: 'Team',
  color: 'Status',
})

// Gallery View
const designGallery = View.gallery({
  coverField: 'Mockups',
  titleField: 'Name',
  descriptionField: 'Description',
})

// Form View
const featureRequest = View.form({
  title: 'Submit Feature Request',
  fields: ['Name', 'Description', 'Priority'],
  submitMessage: 'Thanks! We\'ll review your request.',
  allowAnonymous: true,
})
```

### Forms

Collect data from anyone:

```typescript
const feedbackForm = Form.create({
  table: 'Feedback',
  title: 'Product Feedback',
  description: 'Help us improve our product',
  fields: {
    Name: { required: true },
    Email: { required: true },
    Category: {
      required: true,
      options: ['Bug', 'Feature Request', 'General']
    },
    Description: { required: true },
    Priority: { required: false },
    Attachments: { required: false },
  },
  branding: {
    logo: '/logo.png',
    color: '#0066FF',
  },
  notifications: {
    slack: '#feedback',
    email: 'product@company.com',
  },
})

// Public URL: https://your-org.airtable.do/forms/feedbackForm
```

## AI-Native Data Management

AI doesn't just assist - it builds with you.

### AI Schema Design

Describe your data, AI builds the schema:

```typescript
import { ai } from 'airtable.do'

const schema = await ai.designSchema(`
  I need to track our content marketing.
  We have blog posts, authors, and topics.
  Posts go through draft, review, published stages.
  Need to track SEO metrics and social engagement.
`)

// AI creates:
{
  tables: [
    {
      name: 'Posts',
      fields: {
        Title: Field.text({ primary: true }),
        Slug: Field.formula('LOWER(SUBSTITUTE(Title, " ", "-"))'),
        Status: Field.singleSelect(['Draft', 'In Review', 'Published']),
        Author: Field.linkedRecord('Authors'),
        Topics: Field.linkedRecord('Topics', { multiple: true }),
        PublishDate: Field.date(),
        Content: Field.longText(),
        FeaturedImage: Field.attachment(),
        SEOTitle: Field.text(),
        SEODescription: Field.text(),
        PageViews: Field.number(),
        TimeOnPage: Field.duration(),
        SocialShares: Field.number(),
        // ...
      },
    },
    {
      name: 'Authors',
      fields: { /* ... */ },
    },
    {
      name: 'Topics',
      fields: { /* ... */ },
    },
  ],
  relationships: [/* ... */],
  suggestedViews: [/* ... */],
}
```

### AI Data Entry

Enter data in natural language:

```typescript
// Create records from natural language
await ai.createRecord('Posts', `
  New blog post about AI in project management by Sarah,
  topics: AI, Productivity. Ready for review.
`)
// Creates record with fields populated

// Bulk create from text
await ai.createRecords('Contacts', `
  John Smith, CEO at Acme Corp, john@acme.com, met at conference
  Jane Doe, CTO at TechCo, jane@techco.com, inbound lead
  Bob Wilson, PM at StartupX, bob@startupx.com, referral from John
`)
```

### AI Data Cleanup

Fix messy data automatically:

```typescript
// Clean and standardize data
const cleanup = await ai.cleanData({
  table: 'Contacts',
  operations: [
    { type: 'normalize', field: 'Phone', format: 'E.164' },
    { type: 'deduplicate', fields: ['Email'], action: 'merge' },
    { type: 'categorize', field: 'Company', into: 'Industry' },
    { type: 'fix-typos', field: 'Country' },
    { type: 'parse-names', source: 'FullName', into: ['FirstName', 'LastName'] },
  ],
})

// Preview changes before applying
console.log(`${cleanup.recordsAffected} records will be updated`)
cleanup.preview.forEach(change => console.log(change))

// Apply changes
await cleanup.apply()
```

### AI Formula Generation

Describe calculations, AI writes formulas:

```typescript
// Generate formula from description
const formula = await ai.formula(`
  Calculate the health score based on:
  - Days since last activity (more recent = better)
  - Number of completed tasks (more = better)
  - Whether payment is overdue (bad)
  Scale should be 0-100
`)

// Returns:
'100 - (IF(DaysSinceActivity > 30, 30, DaysSinceActivity)) + (CompletedTasks * 2) - (IF(PaymentOverdue, 50, 0))'
```

### AI Insights

Get insights from your data:

```typescript
const insights = await ai.analyze({
  table: 'Sales',
  questions: [
    'What products are performing best this quarter?',
    'Which sales reps are exceeding quota?',
    'What\'s the trend in deal size over time?',
  ],
})

// Returns:
[
  {
    question: 'What products are performing best?',
    insight: 'Enterprise Plan leads with $1.2M in Q4, up 45% from Q3. Growth is driven by new security features.',
    visualization: { type: 'bar', data: [/* ... */] },
    recommendation: 'Consider bundling security add-ons with Team plan to increase average deal size.',
  },
  // ...
]
```

### Natural Language Queries

Query your data conversationally:

```typescript
const results = await ai.query('Sales', `
  show me all deals over $50k that closed this month
  with the enterprise plan, sorted by size
`)

const forecast = await ai.query('Pipeline', `
  what's our projected revenue for Q2 based on current pipeline?
`)

const analysis = await ai.query('Customers', `
  which customers are at risk of churning?
`)
```

## Automations

Powerful automations without limits:

```typescript
import { Automation, Trigger, Action } from 'airtable.do'

// Record-based trigger
const welcomeEmail = Automation.create({
  name: 'Welcome new signup',
  trigger: Trigger.recordCreated('Users'),
  actions: [
    Action.sendEmail({
      to: '{Email}',
      template: 'welcome',
      data: { name: '{Name}' },
    }),
    Action.createRecord('Onboarding', {
      User: '{Record ID}',
      Status: 'Started',
      StartDate: 'TODAY()',
    }),
    Action.slack({
      channel: '#new-signups',
      message: 'New signup: {Name} ({Email})',
    }),
  ],
})

// Conditional automation
const escalateHighValue = Automation.create({
  name: 'Escalate high-value deals',
  trigger: Trigger.fieldChanged('Deals', 'Amount'),
  conditions: [
    Condition.field('Amount', '>', 100000),
    Condition.field('Status', '!=', 'Won'),
  ],
  actions: [
    Action.updateRecord({
      Priority: 'Critical',
      Owner: '@sales-director',
    }),
    Action.notify({
      user: '@sales-director',
      message: 'High-value deal needs attention: {Name} - ${Amount}',
    }),
  ],
})

// Scheduled automation
const weeklyReport = Automation.create({
  name: 'Weekly pipeline report',
  trigger: Trigger.schedule({ day: 'Monday', time: '09:00' }),
  actions: [
    Action.runScript(async (base) => {
      const deals = await base.table('Deals').records({
        filter: { Status: { in: ['Negotiation', 'Proposal'] } },
      })
      const total = deals.reduce((sum, d) => sum + d.Amount, 0)
      return { deals: deals.length, total }
    }),
    Action.sendEmail({
      to: 'sales-team@company.com',
      subject: 'Weekly Pipeline Report',
      template: 'pipeline-report',
      data: '{{script.output}}',
    }),
  ],
})
```

## Interfaces (Apps)

Build custom apps from your data:

```typescript
import { Interface, Page, Component } from 'airtable.do'

const salesDashboard = Interface.create({
  name: 'Sales Dashboard',
  pages: [
    Page.create({
      name: 'Overview',
      components: [
        Component.number({
          title: 'Pipeline Value',
          table: 'Deals',
          aggregation: 'SUM',
          field: 'Amount',
          filter: { Status: { neq: 'Lost' } },
          format: 'currency',
        }),
        Component.chart({
          title: 'Deals by Stage',
          table: 'Deals',
          type: 'funnel',
          groupBy: 'Status',
          value: { field: 'Amount', aggregation: 'SUM' },
        }),
        Component.grid({
          title: 'Recent Deals',
          table: 'Deals',
          fields: ['Name', 'Company', 'Amount', 'Status', 'Owner'],
          sort: [{ field: 'Created', direction: 'desc' }],
          limit: 10,
          editable: true,
        }),
        Component.kanban({
          title: 'Pipeline',
          table: 'Deals',
          groupBy: 'Status',
          cardFields: ['Name', 'Amount', 'Owner'],
        }),
      ],
    }),
    Page.create({
      name: 'Team Performance',
      components: [/* ... */],
    }),
  ],
})

// Deploy as standalone app
const appUrl = await salesDashboard.deploy({
  subdomain: 'sales',
  auth: 'sso',  // or 'public', 'password'
})
// https://sales.your-org.airtable.do
```

## API Compatible

Full Airtable API compatibility:

```typescript
// REST API
GET    /v0/{baseId}/{tableName}
POST   /v0/{baseId}/{tableName}
PATCH  /v0/{baseId}/{tableName}
DELETE /v0/{baseId}/{tableName}

GET    /v0/{baseId}/{tableName}/{recordId}
PATCH  /v0/{baseId}/{tableName}/{recordId}
DELETE /v0/{baseId}/{tableName}/{recordId}

// With standard parameters
?filterByFormula=...
?sort[0][field]=...
?sort[0][direction]=...
?maxRecords=...
?pageSize=...
?offset=...
?view=...
```

Existing Airtable SDK code works:

```typescript
import Airtable from 'airtable'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
  endpointUrl: 'https://your-org.airtable.do',  // Just change the URL
}).base('appXXXXXXXX')

const records = await base('Features').select({
  filterByFormula: '{Status} = "In Progress"',
  sort: [{ field: 'Priority', direction: 'desc' }],
}).all()
```

## Architecture

### Durable Object per Base

Each base is fully isolated:

```
WorkspaceDO (bases, permissions)
  |
  +-- BaseDO:product-base
  |     +-- SQLite: all tables, records, relations
  |     +-- Views, filters, sorts
  |     +-- Formulas computed on read
  |     +-- WebSocket: real-time sync
  |
  +-- BaseDO:crm-base
  +-- BaseDO:content-base
  +-- AutomationDO (automation engine)
  +-- InterfaceDO (custom apps)
```

### Efficient Storage

Records stored efficiently:

```typescript
interface RecordRow {
  id: string
  table_id: string
  fields: object  // JSON of field values
  created_time: string
  modified_time: string
  created_by: string
  modified_by: string
}

// Indexes on common query patterns
// Linked records resolved efficiently via SQLite joins
// Formulas computed on read, cached
```

### No Row Limits

```typescript
// SQLite handles millions of rows efficiently
// Pagination for API responses
// Indexed queries stay fast
// R2 for cold storage if needed
```

## Migration from Airtable

Import your existing bases:

```bash
npx airtable-do migrate \
  --token=your_airtable_pat \
  --base=appXXXXXXXX
```

Imports:
- All tables and fields
- All records and data
- Views and view configurations
- Linked records and relations
- Formulas (converted)
- Automations
- Interfaces (basic conversion)

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

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>airtable.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://airtable.do">Website</a> | <a href="https://docs.airtable.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
