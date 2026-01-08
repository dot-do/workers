# hubspot.do

> CRM and Marketing Automation. Edge-Native. AI-First. Open by Default.

HubSpot charges $3,600/month for enterprise CRM. Your runway is shrinking. Your competitors are closing deals while you're negotiating contracts.

**hubspot.do** is the open-source alternative. Deploys in minutes. AI that writes emails, not just sends them. Your data, your infrastructure.

## AI-Native API

```typescript
import { hubspot } from 'hubspot.do'           // Full SDK
import { hubspot } from 'hubspot.do/tiny'      // Minimal client
import { hubspot } from 'hubspot.do/marketing' // Marketing-only operations
```

Natural language for sales and marketing:

```typescript
import { hubspot } from 'hubspot.do'

// Talk to it like a colleague
const warm = await hubspot`leads from Google Ads campaign`
const engaged = await hubspot`contacts who opened email but didn't click`
const pipeline = await hubspot`deals closing this quarter over $50k`

// Chain like sentences
await hubspot`leads from webinar`
  .map(l => hubspot`send personalized follow-up to ${l}`)

// Marketing that writes itself
await hubspot`create nurture sequence for trial users`
  .draft()          // AI writes the emails
  .review()         // you approve
  .schedule()       // sends automatically
```

## The Problem

HubSpot dominates SMB marketing automation:

| What HubSpot Charges | The Reality |
|---------------------|-------------|
| **Starter** | $20/mo (1,000 contacts, basic features) |
| **Professional** | $800/mo (automation, sequences) |
| **Enterprise** | $3,600/mo (advanced features) |
| **Additional Contacts** | $45/mo per 1,000 contacts |
| **Per-Seat Pricing** | Sales/Service hubs charge per user |

### The SaaS Tax

You are paying for:

- **Their infrastructure** - Data centers you don't control
- **Their margins** - 80%+ gross margins extracted from your business
- **Their roadmap** - Features built for enterprise, not startups
- **Their lock-in** - Customer data held hostage

### The AI Gap

HubSpot was built for humans clicking through web interfaces. Their "AI" features:
- Write subject lines (you still write the email)
- Suggest next actions (you still do them)
- Score leads (with rules you configure)

Real AI writes the entire email. Real AI qualifies leads by reading conversations. Real AI closes care gaps without human intervention.

## The Solution

**hubspot.do** reimagines CRM for startups and AI:

```
HubSpot                           hubspot.do
-----------------------------------------------------------------
$3,600/month enterprise           Deploy in minutes
$45/1,000 contacts               ~$5/month for 10,000 contacts
AI writes subject lines           AI writes entire campaigns
Per-seat licensing                Usage-based pricing
Data in their cloud               Your Cloudflare account
Months to implement               One command deploy
Vendor lock-in                    Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo hubspot
```

A complete CRM. Running on infrastructure you control. AI-native from day one.

```typescript
import { HubSpot } from 'hubspot.do'

export default HubSpot({
  name: 'my-startup',
  domain: 'crm.my-startup.com',
})
```

**Note:** This is production CRM software. See compliance section below.

## Features

### Contacts

```typescript
// Find anyone
const alice = await hubspot`Alice Chen at Acme`
const enterprise = await hubspot`contacts at companies over 500 employees`
const active = await hubspot`contacts who engaged this week`

// AI infers what you need
await hubspot`Alice Chen`                    // returns contact
await hubspot`emails to Alice Chen`          // returns email history
await hubspot`Alice Chen activity`           // returns full timeline
```

### Deals

```typescript
// Pipeline is one line
const closing = await hubspot`deals closing this month`
const large = await hubspot`enterprise deals over $100k`
const stalled = await hubspot`deals stuck in negotiation over 30 days`

// Move deals naturally
await hubspot`move Acme deal to proposal`
await hubspot`close won Acme deal $75k`
```

### Companies

```typescript
// Company intelligence
const target = await hubspot`companies in healthcare over 1000 employees`
const engaged = await hubspot`companies with multiple contacts engaged`

// Enrich automatically
await hubspot`enrich Acme Corp`
  .firmographics()    // company data
  .technographics()   // tech stack
  .intent()           // buying signals
```

### Marketing Automation

```typescript
// Campaigns that write themselves
await hubspot`create welcome sequence for new signups`
  .draft()           // AI writes emails
  .review()          // you approve
  .activate()        // starts sending

// Segmentation is natural
await hubspot`contacts who downloaded whitepaper but not pricing`
  .map(c => hubspot`send pricing follow-up to ${c}`)

// A/B test without configuration
await hubspot`test subject lines for product launch email`
```

### Email Campaigns

```typescript
// Send naturally
await hubspot`send product update to all customers`
await hubspot`email Alice about her expiring trial`

// AI writes, you approve
await hubspot`draft re-engagement email for churned users`
  .review()     // see what AI wrote
  .approve()    // send it
```

### Lists and Segments

```typescript
// Segmentation as sentences
const vips = await hubspot`customers spending over $10k annually`
const atrisk = await hubspot`customers with declining engagement`
const upsell = await hubspot`customers using feature X but not Y`

// Smart lists update automatically
await hubspot`create list: enterprise leads from LinkedIn`
```

### Lead Scoring

```typescript
// AI scores based on behavior, not rules
const hot = await hubspot`leads most likely to buy this week`
const mql = await hubspot`marketing qualified leads`

// Custom scoring models
await hubspot`score leads based on pricing page visits and email opens`
```

### Workflows

```typescript
// Create workflows by describing them
await hubspot`when lead visits pricing, notify sales and send case study`

// Complex sequences are still one line
await hubspot`nurture webinar attendees for 30 days then hand to sales`
```

### Meetings

```typescript
// Scheduling without friction
await hubspot`find time for Alice Chen and our sales team`
await hubspot`book demo with Acme Corp next week`

// Round-robin just works
await hubspot`assign inbound demos to sales team round robin`
```

### Tickets and Support

```typescript
// Support is natural language
await hubspot`open tickets from enterprise customers`
await hubspot`tickets waiting on us over 24 hours`

// AI handles routine responses
await hubspot`new ticket from Alice about billing`
  .draft()          // AI writes response
  .review()         // you check
  .send()           // resolved
```

### Analytics

```typescript
// Ask questions, get answers
await hubspot`campaign performance this quarter`
await hubspot`which emails have best open rates`
await hubspot`attribution for closed deals`

// Forecasting is a question
await hubspot`revenue forecast for Q2`
await hubspot`pipeline coverage for annual target`
```

## AI-Native CRM

### Promise Pipelining

Chain operations without waiting. One network round trip:

```typescript
// Find leads, qualify, outreach - all pipelined
await hubspot`leads from product hunt launch`
  .map(l => hubspot`enrich ${l}`)
  .map(l => hubspot`score ${l}`)
  .map(l => hubspot`send welcome sequence to ${l}`)

// Marketing to sales handoff
await hubspot`marketing qualified leads this week`
  .map(l => hubspot`assign ${l} to sales rep`)
  .map(l => hubspot`create task: follow up with ${l}`)

// Multi-reviewer approval
await hubspot`deals over $100k needing approval`
  .map(d => [sales, finance].map(r => r`review ${d}`))
  .map(d => hubspot`move ${d} to contract`)
```

### AI Agents Work Your CRM

```typescript
import { hubspot, sally, mark, priya } from 'workers.do'

// Sally handles sales
await sally`qualify inbound leads from today`
await sally`follow up with stalled deals`

// Mark handles marketing
await mark`draft newsletter for this week`
await mark`create case study for Acme win`

// Priya handles product feedback
await priya`analyze support tickets for feature requests`

// They work together
await hubspot`closed won deals this month`
  .map(d => mark`write case study for ${d}`)
  .map(d => sally`ask ${d.contact} for referral`)
```

### Real-Time Events

```typescript
// AI reacts to every CRM event
await hubspot`when contact created`
  .map(c => hubspot`enrich and score ${c}`)
  .map(c => hubspot`route ${c} to right rep`)

await hubspot`when deal reaches negotiation`
  .map(d => hubspot`notify manager about ${d}`)
  .map(d => hubspot`prepare contract for ${d}`)

await hubspot`when ticket created`
  .map(t => hubspot`draft response for ${t}`)
  .review()
  .send()
```

## API Compatible

hubspot.do implements the HubSpot API specification. Existing integrations work unchanged.

```typescript
// Change one line - everything else works
import Hubspot from '@hubspot/api-client'
const client = new Hubspot.Client({
  basePath: 'https://your-instance.hubspot.do'  // just change this
})
```

### Migration

```bash
# Export from HubSpot Cloud, import to your instance
npx hubspot.do migrate --from=hubspot-cloud --to=https://your-instance.hubspot.do
```

Full data migration: contacts, companies, deals, activities, custom properties.

## Architecture

### Durable Object per Workspace

```
HubSpotDO (config, users, pipelines)
  |
  +-- ContactsDO (demographics, activities)
  |     |-- SQLite: Contact records
  |     +-- R2: Email attachments
  |
  +-- DealsDO (pipeline, amounts, stages)
  |     |-- SQLite: Deal data
  |     +-- R2: Contracts, proposals
  |
  +-- MarketingDO (campaigns, workflows)
  |     |-- SQLite: Email tracking
  |     +-- R2: Templates, assets
  |
  +-- ServiceDO (tickets, knowledge base)
        |-- SQLite: Ticket data
        +-- R2: Attachments
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active contacts, recent deals | <10ms |
| **Warm** | R2 + Index | Historical activities (90+ days) | <100ms |
| **Cold** | R2 Archive | Compliance, audit trails | <1s |

## vs HubSpot

| Feature | HubSpot | hubspot.do |
|---------|---------|-----------|
| **Implementation** | Sales calls, procurement | Deploy in minutes |
| **Monthly Cost** | $800-3,600/mo | ~$5/mo |
| **AI** | Subject line suggestions | AI writes entire campaigns |
| **Data Location** | HubSpot's cloud | Your Cloudflare account |
| **Customization** | Limited to their UI | Code anything |
| **Lock-in** | Years of migration | MIT licensed |
| **API** | Rate limited | Unlimited |

## Use Cases

### Startup CRM

```typescript
// Your entire sales process
await hubspot`new lead Alice Chen from Product Hunt`
await hubspot`qualify Alice based on company size and role`
await hubspot`send personalized demo request to Alice`
await hubspot`schedule demo for Alice next Tuesday`
await hubspot`create deal Acme Corp $25k`
```

### Marketing Automation

```typescript
// Launch campaign in one conversation
await hubspot`create campaign for product launch`
  .audience(`customers who used feature X`)
  .sequence(`announce, demo invite, case study, pricing`)
  .draft()
  .review()
  .schedule(`next Monday`)
```

### Sales Pipeline

```typescript
// Pipeline management as conversation
await hubspot`deals stuck in proposal over 2 weeks`
  .map(d => hubspot`send nudge to ${d.contact}`)

await hubspot`deals closing this month`
  .map(d => hubspot`forecast probability for ${d}`)
```

### Customer Success

```typescript
// Retention workflows
await hubspot`customers with declining engagement`
  .map(c => hubspot`schedule check-in with ${c}`)

await hubspot`customers approaching renewal`
  .map(c => hubspot`send renewal reminder to ${c}`)
```

## Roadmap

### CRM Core
- [x] Contacts with custom properties
- [x] Companies with hierarchies
- [x] Deals with pipelines
- [x] Tickets with SLAs
- [x] Products and quotes
- [ ] Custom objects

### Marketing
- [x] Email campaigns
- [x] Smart lists
- [x] Workflows
- [x] Forms
- [x] Landing pages
- [ ] Social media integration

### Sales
- [x] Pipelines
- [x] Tasks and sequences
- [x] Meetings
- [x] Documents
- [x] Forecasting
- [ ] Call recording

### AI
- [x] Natural language queries
- [x] Email drafting
- [x] Lead scoring
- [x] Campaign generation
- [ ] Predictive analytics
- [ ] Conversation intelligence

## Contributing

hubspot.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/hubspot.do
cd hubspot.do
pnpm install
pnpm test
```

## License

MIT License - Your customers, your data, your CRM.

---

<p align="center">
  <strong>The $3,600/month ends here.</strong>
  <br />
  AI-native. Edge-first. Customer-owned.
  <br /><br />
  <a href="https://hubspot.do">Website</a> |
  <a href="https://docs.hubspot.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/hubspot.do">GitHub</a>
</p>
