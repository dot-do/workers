# pipedrive.do

> You're a startup founder. You need a visual pipeline your sales team will actually use. Pipedrive wants $99/user/month plus add-ons for every feature. Your reps need to sell, not fight software.

<p align="center">
  <strong>Visual Sales Pipeline. AI-Powered. Radically Simple.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pipedrive.do"><img src="https://img.shields.io/npm/v/pipedrive.do.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/pipedrive.do"><img src="https://img.shields.io/npm/dm/pipedrive.do.svg" alt="npm downloads" /></a>
  <a href="https://github.com/drivly/pipedrive.do/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/pipedrive.do.svg" alt="license" /></a>
</p>

---

## The workers.do Way

Talk to your pipeline like a colleague:

```typescript
import { pipedrive, sally, priya } from 'workers.do'

// Natural language queries
const deals = await pipedrive`show deals closing this week`
const stalled = await pipedrive`find deals with no activity in 5 days`
const forecast = await pipedrive`forecast Q1 revenue by stage`

// AI agents work your pipeline
await sally`prioritize today's activities by deal value`
await sally`send follow-ups to stalled deals`
```

### Promise Pipelining

Chain operations without waiting. One network round trip:

```typescript
// Find stalled deals, analyze risk, create action plans - all pipelined
const revived = await pipedrive`find deals stalled over 7 days`
  .map(deal => priya`analyze why ${deal} is stalled`)
  .map(analysis => sally`create re-engagement plan for ${analysis}`)

// Activity-based selling flow
const priorities = await pipedrive`get hot deals by close date`
  .map(deal => sally`schedule next best activity for ${deal}`)
  .map(activity => [priya, sally].map(r => r`review ${activity} effectiveness`))
```

---

Pipedrive built a $1.5B business on one insight: salespeople need a visual pipeline, not a database. They charge $14-99 per user per month. AI features are premium add-ons. Your sales data lives on their servers.

**pipedrive.do** is the open-source alternative. The same beautiful visual pipeline. The same activity-based selling methodology. AI built in from day one. Deploy in 60 seconds. Own everything.

## The Problem

Pipedrive is the "simple" CRM. But simple isn't free:

| Plan | Per User/Month | What's Missing |
|------|---------------|----------------|
| **Essential** | $14 | No automation, no AI |
| **Advanced** | $34 | Basic automation only |
| **Professional** | $49 | No revenue forecasting |
| **Power** | $64 | No phone support |
| **Enterprise** | $99 | Finally, everything |

**A 20-person sales team on Professional: $11,760/year**

And that's before add-ons:
- LeadBooster (forms + chat): +$32.50/month
- Web Visitors: +$41/month
- Campaigns (email marketing): +$13.33/month
- Smart Docs: +$32.50/month
- Projects: +$6.70/month

**The "simple" CRM quickly becomes $200+/user/month.**

### The AI Upsell

Pipedrive's AI features are locked behind their "AI Sales Assistant":
- Available only on Advanced+ plans
- Limited to 10 AI recommendations/day on lower tiers
- "AI-powered" email generation is a premium add-on
- No API access to AI features

### The Integration Tax

Every useful integration costs extra:
- Calling: $2.50+/user/month
- Email sync: Included (but limited)
- Marketing automation: Requires Campaigns add-on
- Document management: Requires Smart Docs add-on

## The Solution

**pipedrive.do** gives you everything Pipedrive charges for, free:

```
Pipedrive                       pipedrive.do
-----------------------------------------------------------------
$14-99/user/month               $0 - run your own
AI as premium add-on            AI-native from day one
Their servers                   Your Cloudflare account
Limited API calls               Unlimited API
Add-ons for basic features      Everything included
Vendor lock-in                  Open source, MIT licensed
```

---

## One-Click Deploy

```bash
npx create-dotdo pipedrive
```

Your own Pipedrive. Running on Cloudflare's edge. In 60 seconds.

```typescript
import { Pipedrive } from 'pipedrive.do'

export default Pipedrive({
  name: 'my-sales-team',
  domain: 'deals.my-company.com',
})
```

---

## Features

### Visual Pipeline

The heart of Pipedrive - a beautiful kanban board for your deals:

```typescript
import { pd } from 'pipedrive.do'

// Create a pipeline
const pipeline = await pd.pipelines.create({
  name: 'Enterprise Sales',
  stages: [
    { name: 'Lead In', probability: 10 },
    { name: 'Discovery', probability: 20 },
    { name: 'Proposal', probability: 50 },
    { name: 'Negotiation', probability: 80 },
    { name: 'Closed Won', probability: 100, won: true },
    { name: 'Closed Lost', probability: 0, lost: true },
  ],
})

// Create a deal
const deal = await pd.deals.create({
  title: 'Acme Corp - Enterprise License',
  value: 75000,
  currency: 'USD',
  pipeline_id: pipeline.id,
  stage_id: 'discovery',
  person_id: contact.id,
  org_id: company.id,
  expected_close_date: '2025-03-31',
})

// Move through stages (just update stage_id)
await pd.deals.update(deal.id, {
  stage_id: 'proposal',
})
```

### Real-Time Pipeline View

```typescript
// Get pipeline overview
const overview = await pd.pipelines.overview(pipeline.id)

console.log(overview)
// {
//   stages: [
//     { name: 'Lead In', deals: 12, value: 180000 },
//     { name: 'Discovery', deals: 8, value: 320000 },
//     { name: 'Proposal', deals: 5, value: 275000 },
//     { name: 'Negotiation', deals: 3, value: 150000 },
//   ],
//   totalValue: 925000,
//   weightedValue: 412500,
//   avgDealSize: 33035,
//   avgSalesCycle: 32, // days
// }

// Real-time updates via WebSocket
pd.pipelines.watch(pipeline.id, (event) => {
  if (event.type === 'deal_moved') {
    console.log(`${event.deal.title} moved to ${event.stage.name}`)
  }
})
```

### Activity-Based Selling

Pipedrive's core philosophy: focus on activities, not just outcomes:

```typescript
// Schedule activities
const activity = await pd.activities.create({
  type: 'call',
  subject: 'Discovery call with Alice',
  deal_id: deal.id,
  person_id: contact.id,
  due_date: '2025-01-15',
  due_time: '14:00',
  duration: '30m',
  note: 'Discuss technical requirements and timeline',
})

// Activity types
const activityTypes = await pd.activityTypes.list()
// Built-in: call, meeting, task, deadline, email, lunch
// Custom: demo, proposal_review, contract_negotiation

// Mark as done
await pd.activities.update(activity.id, {
  done: true,
  outcome: 'scheduled_demo',
  note: 'Alice interested in demo. Scheduled for Thursday.',
})

// AI suggests next activities
const suggestions = await pd.ai.suggestActivities(deal.id)
// [
//   { type: 'email', subject: 'Send demo recording', reason: 'No follow-up after demo' },
//   { type: 'call', subject: 'Check with champion', reason: 'Deal stalled 7 days' },
// ]
```

### Contacts & Organizations

```typescript
// Create a person (contact)
const person = await pd.persons.create({
  name: 'Alice Chen',
  email: ['alice@acme.com', 'alice.chen@gmail.com'],
  phone: ['+1-555-0123', '+1-555-0124'],
  org_id: org.id,
  label: 'champion',
  custom_fields: {
    role: 'VP Engineering',
    department: 'Engineering',
  },
})

// Create an organization
const org = await pd.organizations.create({
  name: 'Acme Corporation',
  address: '123 Tech Street, San Francisco, CA',
  custom_fields: {
    industry: 'Technology',
    company_size: '201-500',
    annual_revenue: '$50M-100M',
  },
})

// Link person to org
await pd.persons.update(person.id, {
  org_id: org.id,
})

// Find related deals
const deals = await pd.deals.list({
  org_id: org.id,
  status: 'open',
})
```

### Products & Line Items

```typescript
// Create products
const product = await pd.products.create({
  name: 'Enterprise License',
  code: 'ENT-001',
  unit: 'seat',
  prices: [
    { currency: 'USD', price: 150, cost: 0 },
    { currency: 'EUR', price: 135, cost: 0 },
  ],
})

// Add products to deals
await pd.deals.addProduct(deal.id, {
  product_id: product.id,
  quantity: 50,
  item_price: 150,
  discount_percentage: 10,
})

// Calculate deal value from products
const dealProducts = await pd.deals.products(deal.id)
// {
//   products: [{ name: 'Enterprise License', quantity: 50, sum: 6750 }],
//   totalValue: 6750,
//   currency: 'USD',
// }
```

### Email Integration

Two-way email sync without add-ons:

```typescript
// Connect email account
await pd.mail.connect({
  provider: 'google', // or 'microsoft', 'imap'
  credentials: { ... },
})

// Emails are automatically linked to contacts/deals
const emails = await pd.mail.list({
  deal_id: deal.id,
})

// Send email (tracked)
await pd.mail.send({
  to: 'alice@acme.com',
  subject: 'Proposal for Acme Corp',
  body: '<h1>Hi Alice,</h1><p>As discussed...</p>',
  deal_id: deal.id,
  track: true, // Track opens and clicks
})

// Email templates
const template = await pd.mailTemplates.create({
  name: 'Proposal Follow-Up',
  subject: 'Following up on {{deal.title}}',
  body: 'Hi {{person.first_name}},\n\nI wanted to follow up on...',
})

await pd.mail.send({
  to: 'alice@acme.com',
  template_id: template.id,
  variables: {
    deal: deal,
    person: person,
  },
})
```

### Workflow Automation

No add-on required:

```typescript
// Create automation
const automation = await pd.automations.create({
  name: 'New Deal Notification',
  trigger: {
    type: 'deal_created',
    conditions: [
      { field: 'value', operator: 'gte', value: 50000 },
    ],
  },
  actions: [
    {
      type: 'slack_message',
      channel: '#sales',
      message: 'New enterprise deal: {{deal.title}} (${{deal.value}})',
    },
    {
      type: 'create_activity',
      activity_type: 'call',
      subject: 'Initial outreach for {{deal.title}}',
      due_date: '{{now + 1d}}',
    },
    {
      type: 'send_email',
      template_id: 'welcome-sequence-1',
    },
  ],
})

// Automation templates
const templates = await pd.automations.templates()
// [
//   'Deal won celebration',
//   'Stalled deal follow-up',
//   'Lead assignment',
//   'Activity reminder',
//   'Contract expiration warning',
// ]
```

### Web Forms (LeadBooster Alternative)

No $32.50/month add-on:

```typescript
// Create a web form
const form = await pd.webForms.create({
  name: 'Contact Sales',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'company', type: 'text' },
    { name: 'phone', type: 'phone' },
    { name: 'message', type: 'textarea' },
    { name: 'budget', type: 'select', options: ['<$10k', '$10k-50k', '$50k-100k', '>$100k'] },
  ],
  successMessage: 'Thanks! We will be in touch soon.',
  notifications: [
    { type: 'email', to: 'sales@company.com' },
    { type: 'slack', channel: '#leads' },
  ],
  createDeal: {
    pipeline_id: pipeline.id,
    stage_id: 'lead_in',
    titleTemplate: '{{company}} - Inbound Lead',
  },
})

// Embed anywhere
console.log(form.embedCode)
// <iframe src="https://deals.company.com/forms/xyz" ...></iframe>

// Or use the API
await pd.webForms.submit(form.id, {
  name: 'Bob Smith',
  email: 'bob@startup.com',
  company: 'StartupXYZ',
  budget: '$10k-50k',
})
```

### Calling (Built In)

No $2.50+/user add-on:

```typescript
// Make a call (via browser or integration)
const call = await pd.calls.start({
  to: person.phone[0],
  deal_id: deal.id,
  person_id: person.id,
})

// Call is automatically logged when ended
call.on('ended', async (result) => {
  await pd.activities.create({
    type: 'call',
    deal_id: deal.id,
    person_id: person.id,
    done: true,
    duration: result.duration,
    note: result.transcription, // AI transcription included
    outcome: result.outcome,
  })
})

// VoIP integrations
await pd.calls.configure({
  provider: 'twilio', // or 'vonage', 'aircall', 'ringcentral'
  credentials: { ... },
})
```

---

## AI-Native Sales

### AI Sales Assistant

AI that actually helps close deals:

```typescript
import { pd } from 'pipedrive.do'

// AI analyzes your pipeline daily
const insights = await pd.ai.dailyInsights()

console.log(insights)
// {
//   focus: [
//     { deal: 'Acme Corp', action: 'Send proposal', reason: 'Demo went well, momentum building' },
//     { deal: 'BigTech Inc', action: 'Call champion', reason: 'No activity in 5 days' },
//   ],
//   risks: [
//     { deal: 'StartupXYZ', risk: 'Stalled', days: 14, suggestion: 'Offer limited-time discount' },
//   ],
//   wins: [
//     { deal: 'MegaCorp', probability: 95, tip: 'Get signature this week' },
//   ],
//   forecast: {
//     thisMonth: { committed: 125000, likely: 85000, possible: 200000 },
//     nextMonth: { committed: 50000, likely: 120000, possible: 350000 },
//   },
// }
```

### AI Email Writer

```typescript
// AI writes personalized emails
const email = await pd.ai.composeEmail({
  deal_id: deal.id,
  type: 'follow_up',
  context: 'Had a great demo yesterday, they seemed interested in the analytics features',
})

console.log(email)
// {
//   subject: 'Re: Analytics Deep Dive for Acme',
//   body: 'Hi Alice,\n\nThank you for your time yesterday...',
//   tone: 'professional',
//   callToAction: 'Schedule technical review call',
// }

// AI suggests email improvements
const improved = await pd.ai.improveEmail({
  subject: 'Checking in',
  body: 'Hi, wanted to see if you had any questions about the proposal.',
})
// {
//   subject: 'Quick question about the Acme proposal',
//   body: 'Hi Alice,\n\nI wanted to make sure the proposal addresses...',
//   improvements: ['More specific subject line', 'Added value proposition', 'Clear CTA'],
// }
```

### AI Lead Scoring

```typescript
// Automatic lead scoring
const score = await pd.ai.scoreLead(person.id)

console.log(score)
// {
//   score: 87,
//   grade: 'A',
//   factors: [
//     { factor: 'Company size', impact: +15, reason: '201-500 employees matches ICP' },
//     { factor: 'Engagement', impact: +20, reason: 'Opened 5 emails, clicked 3' },
//     { factor: 'Title', impact: +10, reason: 'VP-level decision maker' },
//     { factor: 'Industry', impact: +12, reason: 'Technology sector' },
//   ],
//   recommendation: 'Hot lead - prioritize immediate outreach',
// }

// Bulk scoring
const scoredLeads = await pd.ai.scoreLeads({
  pipeline_id: pipeline.id,
  stage: 'lead_in',
})
// Returns all leads sorted by score
```

### AI Forecasting

```typescript
// Revenue forecasting
const forecast = await pd.ai.forecast({
  period: 'Q1',
  team: 'all',
})

console.log(forecast)
// {
//   period: 'Q1 2025',
//   predicted: 850000,
//   confidence: 0.78,
//   breakdown: {
//     committed: 320000,  // 95%+ probability
//     likely: 280000,     // 70-94% probability
//     possible: 250000,   // 30-69% probability
//   },
//   trends: {
//     vsLastQuarter: +15,
//     vsSamePeriodLastYear: +42,
//   },
//   risks: [
//     { deal: 'BigDeal Corp', value: 150000, risk: 'Champion leaving company' },
//   ],
// }

// Deal-level predictions
const prediction = await pd.ai.predictDeal(deal.id)
// {
//   willClose: 0.72,
//   predictedCloseDate: '2025-02-15',
//   predictedValue: 72000, // vs current 75000
//   nextBestAction: 'Schedule executive sponsor meeting',
// }
```

### AI Activity Suggestions

```typescript
import { sally } from 'agents.do'
import { pd } from 'pipedrive.do'

// Sally is your AI SDR
await sally`
  Review my pipeline and tell me what I should focus on today.
  Prioritize based on deal value and likelihood to close.
  Create activities for my top 5 priorities.
`

// Sally analyzes and creates activities:
// - Call Acme Corp (discovery follow-up)
// - Email BigTech (send case study)
// - Meeting prep for MegaCorp demo
// - Contract review for StartupXYZ
// - LinkedIn connect with new champion at Enterprise Inc

// Automatic activity creation based on deal stage
pd.deals.on('stage_changed', async (deal, fromStage, toStage) => {
  const activities = await pd.ai.suggestActivities({
    deal_id: deal.id,
    stage: toStage,
  })

  for (const activity of activities) {
    await pd.activities.create(activity)
  }
})
```

---

## API Compatible

Drop-in replacement for Pipedrive's REST API:

```typescript
// Before: Pipedrive Cloud
import Pipedrive from 'pipedrive'
const client = new Pipedrive.ApiClient()
client.basePath = 'https://api.pipedrive.com/v1'

// After: pipedrive.do (just change the base path)
import Pipedrive from 'pipedrive'
const client = new Pipedrive.ApiClient()
client.basePath = 'https://your-instance.pipedrive.do/api/v1'

// All APIs work the same
const dealsApi = new Pipedrive.DealsApi(client)
const deals = await dealsApi.getDeals()
```

### Supported API Endpoints

| API | Compatibility |
|-----|---------------|
| **Deals** | Full - CRUD, search, timeline, products, participants |
| **Persons** | Full - CRUD, search, merge, activities |
| **Organizations** | Full - CRUD, search, relationships |
| **Activities** | Full - CRUD, types, calendars |
| **Pipelines** | Full - CRUD, stages, movements |
| **Products** | Full - CRUD, variations, deal products |
| **Mail** | Full - threads, messages, templates |
| **Webhooks** | Full - all event types |
| **Users** | Full - teams, permissions, goals |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        pipedrive.do Worker                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      WorkspaceDO (per team)                      ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │                                                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  ││
│  │  │  Pipelines  │  │   Deals     │  │  Persons & Orgs         │  ││
│  │  │  & Stages   │  │   Engine    │  │  Relationship Graph     │  ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  ││
│  │                                                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  ││
│  │  │  Activities │  │   Email     │  │  AI Sales Assistant     │  ││
│  │  │  Scheduler  │  │   Sync      │  │  (llm.do integration)   │  ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  ││
│  │                                                                 ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │                    WebSocket Hub                            │││
│  │  │          Real-time pipeline updates & collaboration        │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  SQLite (deals, contacts)  │  R2 (files)  │  Vectorize (AI search) │
└─────────────────────────────────────────────────────────────────────┘
```

### Real-Time Collaboration

Every pipeline action broadcasts instantly:

```typescript
// Connect to workspace
const ws = pd.realtime.connect()

ws.on('deal:created', (deal) => {
  // Someone created a deal
})

ws.on('deal:moved', (deal, fromStage, toStage) => {
  // Someone moved a deal (drag-drop)
  playWonSound() // if moved to Closed Won
})

ws.on('activity:completed', (activity) => {
  // Someone completed an activity
})

ws.on('user:typing', (user, context) => {
  // Show typing indicator in shared views
})
```

### Durable Object per Workspace

Each sales team runs in isolated infrastructure:

```
acme.pipedrive.do           <- Acme's workspace
startup.pipedrive.do        <- Startup's workspace
agency.pipedrive.do         <- Agency's workspace (manages multiple clients)
```

---

## Pricing Comparison

### Pipedrive Pricing (2025)

| Plan | Per User/Month | 20 Users/Year |
|------|---------------|---------------|
| Essential | $14 | $3,360 |
| Advanced | $34 | $8,160 |
| Professional | $49 | $11,760 |
| Power | $64 | $15,360 |
| Enterprise | $99 | $23,760 |

Plus add-ons:
- LeadBooster: +$32.50/company/month
- Web Visitors: +$41/company/month
- Campaigns: +$13.33/company/month
- Smart Docs: +$32.50/company/month
- Projects: +$6.70/company/month
- Calling: +$2.50/user/month

**20-person team on Professional with all add-ons: ~$18,000/year**

### pipedrive.do Pricing

| Resource | Cost | Notes |
|----------|------|-------|
| Durable Object | $0.15/million requests | Your workspace |
| SQLite Storage | $0.20/GB/month | All your data |
| R2 Storage | $0.015/GB/month | Attachments |
| Workers | Free tier: 100k/day | API calls |
| AI | ~$0.01/query | Via llm.do |

**Example: 20 users, 10,000 deals/year, 50k activities**

| | Pipedrive Professional | pipedrive.do |
|-|----------------------|--------------|
| Software | $11,760/year | ~$15/month |
| Add-ons | $1,500+/year | $0 (included) |
| AI features | Limited | Unlimited |
| **Total** | **$13,260+/year** | **~$180/year** |

**Savings: 98.6%**

---

## Migration

One-command migration from Pipedrive:

```bash
npx pipedrive.do migrate --from-pipedrive

# Migrates:
# - Pipelines and stages
# - All deals with history
# - Persons and organizations
# - Activities and notes
# - Products and line items
# - Email history
# - Custom fields
# - Automations (converted)
```

---

## Contributing

pipedrive.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/pipedrive.do
cd pipedrive.do
pnpm install
pnpm test
pnpm dev
```

---

## License

MIT License

---

<p align="center">
  <strong>Sell more. Pay less. Own everything.</strong>
  <br />
  Visual pipeline CRM without the visual tax.
  <br /><br />
  <a href="https://pipedrive.do">Website</a> |
  <a href="https://docs.pipedrive.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/pipedrive.do">GitHub</a>
</p>
