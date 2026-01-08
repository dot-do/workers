# pipedrive.do

> Visual Sales Pipeline. Edge-Native. AI-First. Activity-Based.

Pipedrive built a $1.5B business on one insight: salespeople need a visual pipeline, not a database. They charge $14-99 per user per month. AI features are premium add-ons. Your sales data lives on their servers.

**pipedrive.do** is the open-source alternative. The same beautiful visual pipeline. The same activity-based selling methodology. AI built in from day one. Deploy in 60 seconds. Own everything.

## AI-Native API

```typescript
import { pipedrive } from 'pipedrive.do'           // Full SDK
import { pipedrive } from 'pipedrive.do/tiny'      // Minimal client
import { pipedrive } from 'pipedrive.do/crm'       // CRM-only operations
```

Natural language for sales workflows:

```typescript
import { pipedrive } from 'pipedrive.do'

// Talk to it like a colleague
const hot = await pipedrive`deals closing this week over $50k`
const stalled = await pipedrive`no activity in 5 days`
const forecast = await pipedrive`Q1 forecast by stage`

// Chain like sentences
await pipedrive`stalled deals over 7 days`
  .notify(`Checking in on our conversation`)

// Activities that schedule themselves
await pipedrive`create deal Acme: $75k enterprise, close end of Q1`
  .qualify()          // AI scores the lead
  .schedule()         // next best activity
  .assign()           // route to right rep
```

## The Problem

Pipedrive is the "simple" CRM. But simple isn't free:

| What Pipedrive Charges | The Reality |
|------------------------|-------------|
| **Essential** | $14/user - No automation, no AI |
| **Advanced** | $34/user - Basic automation only |
| **Professional** | $49/user - No revenue forecasting |
| **Enterprise** | $99/user - Finally, everything |
| **Add-ons** | LeadBooster, Campaigns, Smart Docs, Calling - $100+/month extra |

**A 20-person sales team: $12,000-24,000/year. Before add-ons.**

### The AI Upsell

Pipedrive's AI features are locked behind their "AI Sales Assistant" - premium add-on, 10 recommendations/day on lower tiers, no API access to AI features.

### The Integration Tax

Every useful integration costs extra. Calling, email marketing, document management - all add-ons.

## The Solution

**pipedrive.do** reimagines CRM for modern sales teams:

```
Pipedrive                       pipedrive.do
-----------------------------------------------------------------
$14-99/user/month               Deploy in minutes
$12k+/year maintenance          $0 - run your own
AI as premium add-on            AI-native from day one
Add-ons for everything          Everything included
Their servers                   Your Cloudflare account
Vendor lock-in                  Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo pipedrive
```

Your own Pipedrive. Running on infrastructure you control. Visual pipeline from day one.

```typescript
import { Pipedrive } from 'pipedrive.do'

export default Pipedrive({
  name: 'valley-sales',
  domain: 'crm.valley-sales.com',
  pipeline: {
    stages: ['Lead', 'Discovery', 'Proposal', 'Negotiation', 'Closed'],
  },
})
```

## Features

### Deals

```typescript
// Create deals naturally
const deal = await pipedrive`create deal Acme Corp: $75k enterprise, close March 31`
const urgent = await pipedrive`BigTech deal $150k closing this week`

// Find deals like you talk
await pipedrive`deals over $50k`
await pipedrive`deals closing this quarter`
await pipedrive`stalled deals no activity 7 days`

// Move through stages
await pipedrive`move ${deal} to proposal`
await pipedrive`Acme to negotiation`
```

### Pipeline Views

```typescript
// Talk to your pipeline
await pipedrive`pipeline overview`
await pipedrive`enterprise pipeline by stage`
await pipedrive`weighted forecast this quarter`

// Real-time updates
await pipedrive`watch pipeline`
  .on('deal:moved', deal => celebrate(deal))
  .on('deal:won', deal => ringBell())
```

### Activities

```typescript
// Schedule like talking to an assistant
await pipedrive`call Alice at Acme tomorrow 2pm`
await pipedrive`demo with BigTech Thursday 10am`
await pipedrive`follow up on all proposals this week`

// Complete activities
await pipedrive`done: called Alice, scheduled demo for Thursday`

// AI suggests what's next
await pipedrive`what should I do today?`
```

### Contacts & Organizations

```typescript
// Find anyone
const alice = await pipedrive`Alice Chen at Acme`
const buyers = await pipedrive`VP and above at enterprise accounts`
const cold = await pipedrive`contacts no activity 30 days`

// AI infers what you need
await pipedrive`Alice Chen`              // returns contact
await pipedrive`deals with Alice Chen`   // returns her deals
await pipedrive`Alice Chen history`      // returns full activity log
```

### Products

```typescript
// Add products to deals
await pipedrive`add 50 seats Enterprise License at $150 to Acme deal`
await pipedrive`apply 10% discount to Acme`

// Query products
await pipedrive`products on Acme deal`
await pipedrive`total value Acme with discount`
```

### Email

```typescript
// Send emails naturally
await pipedrive`email Alice: Thanks for the demo, proposal attached`
await pipedrive`follow up email to all proposals not responded in 3 days`

// AI writes emails
await pipedrive`write follow-up for Acme demo yesterday`
  .review()   // you approve
  .send()     // fires

// Track engagement
await pipedrive`who opened my emails this week?`
```

### Automations

```typescript
// Describe what you want
await pipedrive`when deal > $50k created, notify #sales and schedule call`
await pipedrive`when deal stalled 5 days, send follow-up email`
await pipedrive`when deal won, celebrate in Slack`

// AI builds the automation from your description
```

### Web Forms

```typescript
// Create lead capture
await pipedrive`create contact form for enterprise leads`
  .embed()   // returns iframe code
  .notify('#sales')
  .createDeal('inbound')
```

### Calling

```typescript
// Click to call
await pipedrive`call Alice Chen`
  .transcribe()   // AI listens
  .summarize()    // creates activity note
  .suggest()      // next steps

// Review calls
await pipedrive`my calls today`
await pipedrive`calls with no follow-up`
```

## AI-Native Sales

### Daily Briefing

```typescript
// Start your day
await pipedrive`what should I focus on today?`
// AI analyzes your pipeline:
// - Hot deals to close
// - Stalled deals needing attention
// - Activities due
// - Follow-ups needed
```

### Deal Intelligence

```typescript
// AI analyzes any deal
await pipedrive`analyze Acme deal`
// {
//   health: 'at risk',
//   reason: 'No activity in 7 days, champion on vacation',
//   action: 'Schedule with technical buyer instead',
// }

// Predict outcomes
await pipedrive`will Acme close this quarter?`
await pipedrive`what's blocking BigTech?`
```

### Lead Scoring

```typescript
// AI scores automatically
await pipedrive`score my leads`
await pipedrive`hot leads this week`
await pipedrive`leads matching our ICP`
```

### Forecasting

```typescript
// Revenue forecasting
await pipedrive`Q1 forecast`
await pipedrive`forecast by rep`
await pipedrive`commit vs pipeline this month`

// AI explains the numbers
await pipedrive`why is forecast down vs last quarter?`
```

### Sally: Your AI SDR

```typescript
import { sally } from 'agents.do'

// Sally works your pipeline
await sally`review my pipeline and flag stalled deals`
await sally`prioritize my activities by deal value`
await sally`draft follow-ups for all proposals sent this week`

// Sally takes action (you approve)
await sally`schedule next steps for all hot deals`
  .review()   // you check her work
  .execute()  // she does it
```

## Promise Pipelining

Chain operations without waiting. One network round trip:

```typescript
import { pipedrive, sally, priya } from 'pipedrive.do'

// Find stalled deals, analyze, create action plans - all pipelined
const revived = await pipedrive`stalled deals over 7 days`
  .map(deal => priya`analyze why ${deal} is stuck`)
  .map(analysis => sally`create re-engagement plan for ${analysis}`)

// Activity-based selling flow
const priorities = await pipedrive`hot deals by close date`
  .map(deal => sally`schedule next activity for ${deal}`)
  .map(activity => [priya, sally].map(r => r`review ${activity}`))

// Pipeline sweep
await pipedrive`deals closing this week`
  .map(deal => pipedrive`what's needed to close ${deal}?`)
  .map(gaps => sally`address ${gaps}`)
```

## API Compatible

Drop-in replacement for Pipedrive's REST API:

```typescript
// Before: Pipedrive Cloud
import Pipedrive from 'pipedrive'
client.basePath = 'https://api.pipedrive.com/v1'

// After: pipedrive.do (just change the base path)
client.basePath = 'https://your-instance.pipedrive.do/api/v1'

// All APIs work the same
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

## Architecture

### Durable Object per Workspace

```
WorkspaceDO (config, users, pipelines)
  |
  +-- DealsDO (deals, stages, products)
  |     |-- SQLite: Deal records
  |     +-- R2: Attachments, proposals
  |
  +-- ContactsDO (persons, organizations)
  |     |-- SQLite: Contact data
  |     +-- Relationship graph
  |
  +-- ActivitiesDO (calls, meetings, tasks)
  |     |-- SQLite: Activity log
  |     +-- Calendar sync
  |
  +-- MailDO (emails, templates)
  |     |-- SQLite: Thread data
  |     +-- R2: Attachments
  |
  +-- AIDO (insights, scoring, forecasting)
        |-- llm.do integration
        +-- Vectorize for semantic search
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active deals, recent activities | <10ms |
| **Warm** | R2 + Index | Historical deals (1-3 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention | <1s |

### Real-Time Collaboration

Every pipeline action broadcasts instantly. Drag a deal, everyone sees it. Bell rings when deals close.

## vs Pipedrive

| Feature | Pipedrive | pipedrive.do |
|---------|-----------|--------------|
| **Pricing** | $14-99/user/month | ~$15/month total |
| **AI** | Premium add-on | Native, unlimited |
| **Data** | Their servers | Your Cloudflare |
| **Add-ons** | $100+/month extra | Everything included |
| **API** | Rate limited | Unlimited |
| **Lock-in** | Data export fees | MIT licensed |

## Migration

One command from Pipedrive:

```bash
npx pipedrive.do migrate --from-pipedrive

# Migrates everything:
# - Pipelines and stages
# - All deals with history
# - Persons and organizations
# - Activities and notes
# - Products and line items
# - Email history
# - Custom fields
```

## Contributing

pipedrive.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/pipedrive.do
cd pipedrive.do
pnpm install
pnpm test
```

## License

MIT License

---

<p align="center">
  <strong>The $1.5B CRM ends here.</strong>
  <br />
  Visual pipeline. AI-native. Activity-based.
  <br /><br />
  <a href="https://pipedrive.do">Website</a> |
  <a href="https://docs.pipedrive.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/pipedrive.do">GitHub</a>
</p>
