# make.do

> Visual Automation. Edge-Native. AI-First. Zero Per-Op Costs.

Make.com charges $10k+/month for 10M operations. They trap your scenarios in proprietary formats. Every webhook costs you money. Traditional automation platforms were built for a world without AI.

**make.do** is the open-source alternative. Natural language automation. Promise pipelining. Deploys in seconds. AI that orchestrates instead of executes.

## AI-Native API

```typescript
import { make } from 'make.do'              // Full SDK
import { make } from 'make.do/tiny'         // Minimal client
import { make } from 'make.do/scenarios'    // Scenario builder only
```

Natural language for automation workflows:

```typescript
import { make } from 'make.do'

// Talk to it like a colleague
const leads = await make`when webhook /leads: validate, enrich, route to salesforce`
const inventory = await make`every hour check inventory`
const report = await make`summarize yesterday's sales`

// Chain like sentences
await make`fetch leads from /api/leads`
  .map(lead => make`enrich ${lead} from clearbit`)
  .map(enriched => make`route ${enriched} to salesforce if enterprise else hubspot`)

// Scenarios that think
await make`when email arrives`
  .classify()         // AI determines intent
  .draft()            // AI generates response
  .route()            // to agent or human
```

## The Problem

Make.com dominates automation alongside Zapier:

| What Make.com Charges | The Reality |
|-----------------------|-------------|
| **Per-Operation Fees** | 10M ops/month at $0.001 = $10,000 |
| **Enterprise Pricing** | $10k-50k/year for serious usage |
| **Vendor Lock-in** | Scenarios trapped in proprietary format |
| **Data Transit** | Every operation routes through their cloud |
| **AI as Add-on** | Extra fees for any intelligence |

### The Per-Op Tax

Every webhook, every transform, every API call - they charge you. At scale:

- 1M ops/month = $1,000
- 10M ops/month = $10,000
- 100M ops/month = $100,000

AI agents need to orchestrate millions. Make.com's pricing model doesn't survive contact with AI.

### The Lock-in Problem

Your automations exist only in Make.com:

- No code export
- No version control
- No local testing
- No custom modules without their approval
- No way out

### The AI Gap

Make.com added "AI blocks" as an afterthought:

- Extra per-token fees on top of provider costs
- Limited model selection
- No ambient intelligence
- AI as a step, not a foundation

## The Solution

**make.do** reimagines automation for AI:

```
Make.com                          make.do
-----------------------------------------------------------------
$10k/month for 10M ops            Zero per-op costs
Proprietary scenario format       Code you own
Their cloud                       Your Cloudflare account
AI as add-on                      AI-native foundation
Visual-only                       Natural language + visual
No version control                Git your scenarios
Vendor lock-in                    Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo make
```

Automation running on your infrastructure. Zero per-op costs.

```typescript
import { Make } from 'make.do'

export default Make({
  name: 'my-automations',
  domain: 'automation.mycompany.com',
})
```

## Features

### Webhooks

```typescript
// Incoming webhooks - just say it
await make`when webhook /leads: validate email, enrich, route to CRM`
await make`when /orders webhook: validate, save, send confirmation`
await make`when POST /payments: verify signature, process, notify`

// Outgoing webhooks
await make`POST to ${url} with ${payload}`
await make`POST to ${url}: on error retry 3 times with backoff`
```

### Schedules

```typescript
// Scheduled jobs read like calendar entries
await make`every hour: check inventory, alert if low`
await make`every monday at 9am: generate weekly report, send to #team`
await make`every day at midnight: archive old records`
await make`every 5 minutes: sync new orders to warehouse`
```

### Data Processing

```typescript
// File processing
await make`when file uploaded to /inbox:
  extract text with OCR,
  classify document type,
  route to appropriate folder`

// CSV/batch processing
await make`process uploaded CSV: parse, validate, insert to database`

// Aggregation
await make`collect hourly metrics, aggregate daily, send summary`
```

### Routing

```typescript
// Conditional routing as natural language
await make`when webhook /leads:
  validate email has @,
  enrich from clearbit,
  route to salesforce if enterprise else hubspot`

// Multi-path routing
await make`when order placed:
  if value > $1000 route to enterprise,
  if international route to global-fulfillment,
  else route to standard`

// AI-powered routing
await make`when support ticket:
  classify urgency,
  if critical page on-call else queue for morning`
```

### Error Handling

```typescript
// Natural language error handling
await make`POST to ${url}: on error retry 3 times with backoff`
await make`fetch from ${api}: on timeout alert slack`
await make`process payment: on failure refund and notify customer`

// Error routes
await make`when /orders webhook:
  validate, process, confirm,
  on any error: log, alert ops, queue for retry`
```

### Promise Pipelining

Chain operations without `Promise.all`. One network round trip:

```typescript
// Lead enrichment pipeline
const results = await make`fetch leads from /api/leads`
  .map(lead => make`enrich ${lead} from clearbit`)
  .map(enriched => make`score ${enriched} for sales readiness`)
  .map(scored => scored.score > 80
    ? make`create opportunity in salesforce for ${scored}`
    : make`add ${scored} to nurture campaign`)

// Parallel processing with aggregation
const reports = await make`list all departments`
  .map(dept => make`generate monthly report for ${dept}`)
  .map(report => make`send ${report} to department head`)

// Fan-out and fan-in
const analyzed = await make`fetch transactions this week`
  .map(tx => [
    make`check ${tx} for fraud`,
    make`categorize ${tx}`,
    make`match ${tx} to invoice`
  ])
  .reduce((results) => make`consolidate ${results} into report`)
```

### AI Operations

```typescript
// AI is built in, not an add-on
await make`when email arrives: classify intent, draft response, route`

await make`every day at 9am:
  summarize yesterday's sales,
  identify trends,
  draft report for team`

await make`when document uploaded:
  extract key data,
  validate against schema,
  create structured record`

await make`when customer feedback received:
  analyze sentiment,
  categorize topic,
  route to product or support`
```

### Agent Integration

```typescript
import { ralph, priya, quinn } from 'agents.do'

// Let agents build your automations
ralph`build a scenario that syncs Stripe invoices to Airtable`
ralph`create a webhook that enriches leads and routes to salesforce`

// Agents in your automations
await make`when feature request:
  ${priya} analyze and prioritize,
  ${ralph} create implementation plan,
  ${quinn} write acceptance tests`
```

## Architecture

```
Scenario Request Flow:

make`when webhook...` --> ScenarioDO --> ModuleDO --> Integration
                              |              |
                          SQLite          Queues
                       (scenario state)  (reliable execution)
                              |
                        +-----+-----+
                        |     |     |
                     fsx.do gitx.do llm.do
```

### Durable Object per Scenario

```
ScenarioDO (orchestration, state machine)
  |
  +-- ModuleDO (step execution, isolation)
  |     |-- SQLite: execution logs
  |
  +-- RouterDO (data routing, fan-out)
  |
  +-- SchedulerDO (cron, webhooks)
        |-- SQLite: schedule state
```

## Integrations

### Pre-built Connectors

```typescript
// Just mention the service
await make`when Stripe payment: add to HubSpot, notify Slack`
await make`when GitHub issue: create Jira ticket`
await make`when Shopify order: update inventory in Airtable`

// AI infers the integration
await make`sync Stripe customers to Salesforce nightly`
await make`when new Typeform: enrich with Clearbit, add to Mailchimp`
```

### MCP Tools

```typescript
// Any MCP tool works automatically
await make`when webhook: read config from fsx.do, process, commit to gitx.do`
await make`every hour: query with llm.do, summarize, post to Slack`
```

### HTTP Requests

```typescript
// Just describe it
await make`GET ${url} then POST to ${webhook}`
await make`fetch ${api} with bearer ${token}, transform, send to ${dest}`
```

## vs Make.com

| Feature | Make.com | make.do |
|---------|----------|---------|
| **Pricing** | $10k+/month for 10M ops | Zero per-op costs |
| **Format** | Proprietary visual | Natural language + code |
| **Version Control** | None | Git your scenarios |
| **AI** | Add-on blocks | Native foundation |
| **Testing** | In-platform only | Local + CI/CD |
| **Lock-in** | Complete | Open source, MIT |
| **Deployment** | Their cloud | Your Cloudflare |
| **Custom Code** | Limited | Full TypeScript |

## Use Cases

### Lead Management

```typescript
// Full lead capture pipeline
await make`when webhook /leads:
  validate email,
  enrich from clearbit,
  score for sales readiness,
  route to salesforce if enterprise else hubspot,
  notify slack #sales-leads`

// Bulk enrichment
await make`all contacts missing company size`
  .map(contact => make`enrich ${contact} from clearbit`)
  .map(enriched => make`update ${enriched} in hubspot`)
```

### E-commerce

```typescript
// Order processing
await make`when Shopify order:
  validate inventory,
  process payment,
  create fulfillment,
  send confirmation email`

// Abandoned cart
await make`every hour:
  find carts abandoned 30+ minutes,
  send recovery email,
  track opens and clicks`
```

### DevOps

```typescript
// Deploy pipeline
await make`when GitHub push to main:
  run tests,
  if pass deploy to staging,
  notify #engineering,
  on failure page on-call`

// Monitoring
await make`every minute:
  check health of ${services},
  if any unhealthy alert PagerDuty`
```

### Data Sync

```typescript
// CRM to data warehouse
await make`every night:
  export Salesforce opportunities,
  transform to BigQuery schema,
  load to warehouse,
  refresh dashboards`

// Two-way sync
await make`when Salesforce contact updated: sync to HubSpot`
await make`when HubSpot contact updated: sync to Salesforce`
```

## Why Cloudflare?

1. **Global Edge** - Scenarios run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable module execution
5. **Single-Threaded DO** - No race conditions in data routing

## The Rewrites Ecosystem

make.do is part of the rewrites family:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **make.do** | Make.com | Visual automation for AI |

## Related Domains

- **workflows.do** - Workflow orchestration
- **triggers.do** - Event triggers and webhooks
- **inngest.do** - Durable background jobs
- **automation.do** - Business process automation

## License

MIT License - Automate everything.

---

<p align="center">
  <strong>Zero per-op costs. Natural language. Your infrastructure.</strong>
  <br />
  AI-native automation that speaks your language.
  <br /><br />
  <a href="https://make.do">Website</a> |
  <a href="https://docs.make.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/make.do">GitHub</a>
</p>
