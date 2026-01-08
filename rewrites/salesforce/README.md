# salesforce.do

> CRM for sales teams. Edge-Native. Open by Default. AI-First.

Salesforce charges $25-330 per user per month. Einstein AI costs extra. Implementation takes months. Apex is proprietary. SOQL is locked in. Your customer data lives on their servers. A 100-person sales team on Enterprise with Einstein: **$315,000/year**.

**salesforce.do** is the open-source alternative. Deploy in minutes, not months. AI-native from day one. Your data, your infrastructure, your rules.

## AI-Native API

```typescript
import { salesforce } from 'salesforce.do'           // Full SDK
import { salesforce } from 'salesforce.do/tiny'      // Minimal client
import { salesforce } from 'salesforce.do/soql'      // SOQL-only operations
```

Natural language for sales workflows:

```typescript
import { salesforce } from 'salesforce.do'

// Talk to it like a colleague
const pipeline = await salesforce`deals closing this quarter`
const hot = await salesforce`hot leads from website this week`
const stalled = await salesforce`opportunities with no activity in 2 weeks`

// Chain like sentences
await salesforce`qualified leads over $50k`
  .notify(`Ready to send proposal?`)

// Deals that update themselves
await salesforce`new deal Acme Corp $150k enterprise`
  .track()           // activity logging
  .forecast()        // AI predicts close
  .alert()           // notify on changes
```

## The Problem

Salesforce charges $25-330 per user per month:

| What Salesforce Charges | The Reality |
|------------------------|---------------|
| **Implementation** | $50k-500k+ (3-18 months) |
| **Annual Maintenance** | $165-330/user/month |
| **Einstein AI** | +$50-150/user/month on top |
| **Admin Salary** | $80k-150k/year (required) |
| **Vendor Lock-in** | Apex/SOQL proprietary |

### The Einstein Tax

Since Einstein launched:
- Lead Scoring: +$75/user/month
- Opportunity Scoring: +$75/user/month
- Forecasting: +$75/user/month
- GPT: +$50+/user/month

Want AI features? Double your bill.

### The Integration Nightmare

Salesforce talks API-first. But:
- SOQL is proprietary
- Apex can't run anywhere else
- Data exports are painful
- Custom objects trap your schema
- Implementation takes months

## The Solution

**salesforce.do** reimagines CRM for the AI era:

```
Traditional Salesforce          salesforce.do
-----------------------------------------------------------------
$25-330/user/month              $0 - run your own
Einstein AI premium             AI-native from day one
Vendor lock-in                  Open source, MIT licensed
Their servers                   Your Cloudflare account
18-month implementation         Deploy in minutes
$150k/year admin                Self-managing with AI
```

## One-Click Deploy

```bash
npx create-dotdo salesforce
```

A full CRM. Running on infrastructure you control. SOQL-compatible from day one.

```typescript
import { Salesforce } from 'salesforce.do'

export default Salesforce({
  name: 'my-org',
  domain: 'crm.my-company.com',
})
```

## Features

### Accounts & Contacts

```typescript
// Create anyone
const acme = await salesforce`create account Acme Corp in Technology, $5M revenue`
const alice = await salesforce`Alice Chen VP Engineering at Acme, alice@acme.com`

// Find anyone
await salesforce`Alice Chen`                     // returns contact
await salesforce`contacts at Acme`               // returns list
await salesforce`VPs at accounts over $10M`      // AI infers what you need
```

### Leads

```typescript
// New leads, one line
await salesforce`new lead Bob Smith from StartupXYZ, website inquiry`

// AI scores automatically (no Einstein tax)
await salesforce`score Bob Smith`
// { score: 87, factors: ['Title match', 'Company size', 'Engagement'] }

// Convert when ready
await salesforce`convert Bob Smith to opportunity`
```

### Opportunities

```typescript
// Deals are one line
await salesforce`new deal Acme Corp $150k enterprise, close March`
await salesforce`move Acme deal to proposal stage`
await salesforce`close Acme deal won`

// Pipeline queries read like questions
await salesforce`deals closing this month`
await salesforce`pipeline by stage`
await salesforce`deals over $100k at risk`

// AI forecasting (built in)
await salesforce`forecast Q1`
```

### Activities

```typescript
// Log activities naturally
await salesforce`called Alice about technical requirements`
await salesforce`emailed Acme proposal`
await salesforce`meeting with Bob Tuesday 2pm`

// Query activity
await salesforce`Acme activity this week`
await salesforce`deals with no activity in 7 days`
```

### Cases

```typescript
// Support in one line
await salesforce`new case from Acme: login issues, high priority`
await salesforce`escalate Acme case to tier 2`
await salesforce`close Acme case resolved`

// AI classifies and routes automatically
// AI suggests knowledge articles
```

### Campaigns

```typescript
// Campaigns read like briefs
await salesforce`create Q1 launch campaign, email, $50k budget`
await salesforce`add website leads to Q1 campaign`
await salesforce`Q1 campaign ROI`
```

### Custom Objects

```typescript
// Define custom objects naturally
await salesforce`create Invoice object with amount, status, account lookup`

// Use them immediately
await salesforce`new invoice for Acme $5000 due next Friday`
await salesforce`Acme invoices this quarter`
await salesforce`overdue invoices`
```

## Promise Pipelining

Chain operations without waiting. One network round trip:

```typescript
import { salesforce, sally, priya, tom } from 'workers.do'

// Find leads, send proposals, get reviews - all pipelined
await salesforce`qualified leads over $50k`
  .map(lead => sally`send proposal to ${lead}`)
  .map(proposal => [priya, tom].map(r => r`review ${proposal}`))

// AI-driven pipeline management
await salesforce`stalled opportunities`
  .map(opp => priya`analyze risk factors for ${opp}`)
  .map(analysis => sally`create re-engagement plan for ${analysis}`)

// Bulk outreach
await salesforce`enterprise leads from Q1 campaign`
  .map(lead => sally`personalized follow-up for ${lead}`)
  .schedule()

// Close care gaps at scale
await salesforce`deals with no activity in 2 weeks`
  .map(deal => sally`check in on ${deal}`)
  .track()
```

## SOQL Compatible

Natural language or SOQL - your choice:

```typescript
// Natural language
await salesforce`deals over $100k closing this month`

// Or SOQL when you need precision
await salesforce.query(`
  SELECT Id, Name, Amount, CloseDate
  FROM Opportunity
  WHERE Amount > 100000
    AND CloseDate = THIS_MONTH
    AND IsClosed = false
`)
```

## AI-Native CRM

### AI SDR

Sally qualifies leads 24/7:

```typescript
import { sally } from 'agents.do'

// Sally is your AI SDR
await sally`qualify all new leads from yesterday`
await sally`send personalized outreach to hot leads`
await sally`schedule discovery calls for engaged prospects`

// She updates Salesforce directly
// - Lead status updated
// - Emails sent via connected inbox
// - Meetings scheduled via calendar
```

### AI Pipeline Manager

Priya keeps your pipeline healthy:

```typescript
import { priya } from 'agents.do'

// Pipeline hygiene
await priya`find deals with no activity in 2 weeks`
await priya`flag at-risk opportunities`
await priya`create tasks for stalled deals`

// AI forecasting (no Einstein tax)
await salesforce`forecast Q1 North America`
// {
//   committed: 2_450_000,
//   bestCase: 3_200_000,
//   atRisk: ['Acme - champion left company']
// }
```

### AI Case Resolution

Quinn handles tier-1 support:

```typescript
import { quinn } from 'agents.do'

// AI handles incoming cases automatically
// - Classifies the issue
// - Searches knowledge base
// - Responds or routes to human
await quinn`handle incoming support cases`
```

### Natural Language Everything

Skip SOQL entirely:

```typescript
// Just ask
await salesforce`deals over $100k closing this month`
await salesforce`VPs at our top 10 accounts`
await salesforce`opportunities at risk of slipping`

// AI-powered insights
await salesforce`what should I focus on today?`
// "You have 3 meetings totaling $450k.
//  Acme deal has gone quiet - consider a check-in.
//  Two new leads match your ICP."
```

## jsforce Compatible

Existing jsforce integrations work unchanged:

```typescript
import jsforce from 'jsforce'

const conn = new jsforce.Connection({
  loginUrl: 'https://your-org.salesforce.do',
})

// All jsforce APIs work
const accounts = await conn.query('SELECT Id, Name FROM Account')
await conn.sobject('Lead').create({ FirstName: 'New', LastName: 'Lead', Company: 'Test' })
```

### Migration from Salesforce

```bash
npx salesforce.do migrate --from=production
# Migrates everything: objects, fields, data, users, workflows
```

## Architecture

### Durable Object per Org

```
 OrgDO (per customer)
  |
  +-- AccountsDO (accounts, contacts)
  |     |-- SQLite: Account/Contact records
  |     +-- R2: Documents, attachments
  |
  +-- SalesDO (leads, opportunities, activities)
  |     |-- SQLite: Sales data
  |     +-- Search indexes
  |
  +-- ServiceDO (cases, knowledge)
  |     |-- SQLite: Support data
  |
  +-- MarketingDO (campaigns, members)
        |-- SQLite: Campaign data
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active records (< 2 years) | <10ms |
| **Warm** | R2 + SQLite Index | Historical data (2-7 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

### Multi-Tenancy

```
acme.salesforce.do          <- Acme Corp's org
bigcorp.salesforce.do       <- BigCorp's org
startup.salesforce.do       <- Startup's org
```

Each org is completely isolated. Separate database, separate storage, no data mixing.

## vs Salesforce

| Feature | Salesforce | salesforce.do |
|---------|------------|---------------|
| **Implementation** | $50k-500k+ | Deploy in minutes |
| **Annual Cost** | $165-330/user/month | ~$20/month |
| **AI Features** | +$50-150/user/month | Built in |
| **Data Location** | Salesforce servers | Your Cloudflare account |
| **Customization** | Apex/SOQL proprietary | TypeScript |
| **Lock-in** | Years of migration | MIT licensed |

## Roadmap

### Core CRM
- [x] Accounts & Contacts
- [x] Leads & Conversion
- [x] Opportunities & Pipeline
- [x] Activities & Tasks
- [x] Cases
- [x] Campaigns
- [x] Custom Objects
- [ ] Reports & Dashboards
- [ ] Approval Processes

### Compatibility
- [x] SOQL Parser
- [x] jsforce API
- [x] MCP Tools
- [ ] Apex Runtime
- [ ] Lightning Components

### AI
- [x] Natural Language Queries
- [x] Lead Scoring
- [x] Forecasting
- [x] Case Classification
- [ ] Predictive Analytics

## Contributing

salesforce.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/salesforce.do
cd salesforce.do
pnpm install
pnpm test
```

## License

MIT License - Use it however you want.

---

<p align="center">
  <strong>The $300B CRM monopoly ends here.</strong>
  <br />
  Your data. Your infrastructure. Your AI.
  <br /><br />
  <a href="https://salesforce.do">Website</a> |
  <a href="https://docs.salesforce.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/salesforce.do">GitHub</a>
</p>
