# n8n.do

> Workflow Automation. Edge-Native. Natural Language. AI-First.

n8n self-hosted means Kubernetes clusters, Redis sessions, PostgreSQL databases, and 3am pages when things break. n8n Cloud costs $200+/month at scale. Zapier charges $600+/month for real usage. Make.com nickel-and-dimes every operation.

**n8n.do** is workflow automation that deploys in seconds. Natural language workflows. No infrastructure. No YAML. No visual editor required.

## AI-Native API

```typescript
import { n8n } from 'n8n.do'             // Full SDK
import { n8n } from 'n8n.do/tiny'        // Minimal client
import { n8n } from 'n8n.do/mcp'         // MCP tools
```

Natural language for automation:

```typescript
import { n8n } from 'n8n.do'

// Talk to it like you're thinking out loud
n8n`when webhook /orders, validate stock, charge stripe, send confirmation`
n8n`every day at 9am, sync salesforce opportunities to slack #deals`
n8n`on new github issue, classify with AI, assign to appropriate team`

// Store credentials naturally
n8n`store slack token xoxb-xxx as "my-slack"`
n8n`store stripe key sk_live_xxx as "production-stripe"`

// Use them by name
n8n`when webhook /notify, send slack #general message from request using my-slack`
```

## The Problem

| What You Pay For | The Reality |
|------------------|-------------|
| **n8n Self-Hosted** | Kubernetes, Redis, PostgreSQL, YOUR ops burden |
| **n8n Cloud** | $20/month starter, $200+ at scale |
| **Zapier** | $600+/month for real automation needs |
| **Make.com** | Per-operation billing adds up fast |
| **Custom Code** | Months to build, forever to maintain |

### The Infrastructure Tax

Every workflow platform demands infrastructure:
- Container orchestration (Kubernetes, Docker Compose)
- Persistent storage (PostgreSQL, Redis)
- Queue systems for async execution
- Credential vaults
- Monitoring and alerting

You end up running a platform instead of building products.

### The YAML/GUI Trap

Visual editors are great for demos. Then reality hits:
- Version control nightmares
- No code review for workflow changes
- Copy-paste across environments
- Impossible to test properly
- Lock-in to proprietary formats

## The Solution

**n8n.do** reimagines workflow automation:

```
Self-Hosted n8n                    n8n.do
-----------------------------------------------------------------
Kubernetes cluster                 Deploy in seconds
PostgreSQL + Redis                 Zero infrastructure
YAML/GUI workflows                 Natural language
Container orchestration            Edge-native everywhere
Your ops burden                    We handle everything
$200+/month at scale               Pay for what you use
```

## Promise Pipelining

Chain workflows without `Promise.all`. One network round trip:

```typescript
// ETL in three lines
const synced = await n8n`fetch all postgres tables`
  .map(table => n8n`transform ${table} to analytics schema`)
  .map(transformed => n8n`load ${transformed} to bigquery`)

// Lead qualification pipeline
const qualified = await n8n`fetch new signups`
  .map(user => n8n`enrich ${user} with clearbit`)
  .map(enriched => enriched.score > 80 ? n8n`route to sales` : n8n`add to nurture`)

// Invoice reminder workflow
const reminded = await n8n`get all overdue invoices from stripe`
  .map(invoice => n8n`send reminder email for ${invoice}`)
  .map(sent => n8n`log ${sent} to analytics`)
  .map(logged => n8n`update CRM for ${logged}`)
```

The system handles parallelization, retries, and state. You write sentences.

## Agent Integration

Let Ralph build your workflows:

```typescript
import { ralph, priya } from 'agents.do'

// Natural language to running workflow
ralph`when a github PR is merged, update linear ticket and notify slack`

// Design then implement
await priya`design automation strategy for customer onboarding`
  .map(workflow => ralph`implement ${workflow}`)
```

## One-Click Deploy

```bash
npx create-dotdo n8n
```

Workflow automation. Running on your Cloudflare account. Zero infrastructure.

```typescript
import { N8n } from 'n8n.do'

export default N8n({
  name: 'my-workflows',
  domain: 'workflows.mycompany.com',
})
```

## Features

### Triggers

```typescript
// Webhook triggers
n8n`when webhook /orders is called, process the order`
n8n`when webhook /contact-form, validate email, add to mailchimp`

// Scheduled triggers
n8n`every day at 9am, generate daily report`
n8n`every monday at 8am, send weekly summary to slack`
n8n`every 5 minutes, check for new leads`

// Event triggers
n8n`on stripe payment_succeeded, update customer status`
n8n`on github push to main, deploy to production`
n8n`on new zendesk ticket, classify with AI, route appropriately`
```

### Data Sync

```typescript
// One-line ETL
n8n`sync shopify orders to google sheets hourly`
n8n`sync hubspot contacts to airtable daily`
n8n`sync stripe invoices to quickbooks on payment`

// With transformation
await n8n`fetch postgres customers`
  .map(customer => n8n`transform ${customer} to analytics schema`)
  .map(record => n8n`insert ${record} into bigquery`)
```

### Conditional Routing

```typescript
// If-else as natural language
n8n`on new lead, if company size > 100 route to enterprise, else route to SMB`
n8n`when email received, if urgent flag to slack, else add to queue`

// Scoring and routing
await n8n`fetch new signups`
  .map(user => n8n`score ${user} for sales qualification`)
  .map(scored => scored.score > 80
    ? n8n`route ${scored} to sales team`
    : n8n`add ${scored} to nurture campaign`)
```

### Notifications

```typescript
// Multi-channel notifications
await n8n`get all users affected by outage`
  .map(user => [
    n8n`send email to ${user}`,
    n8n`send sms to ${user}`,
    n8n`update status page for ${user}`
  ])

// Conditional notifications
n8n`on order shipped, email customer with tracking link`
n8n`on payment failed, notify billing team in slack`
```

### Credentials

```typescript
// Store credentials naturally
n8n`store slack token xoxb-xxx as "my-slack"`
n8n`store stripe key sk_live_xxx as "production-stripe"`
n8n`store github token ghp_xxx as "my-github"`

// Reference by name
n8n`send slack #general "Deploy complete" using my-slack`
n8n`create stripe charge $99 using production-stripe`

// List and manage
await n8n`list credentials`
await n8n`delete credential my-old-slack`
```

### Error Handling

```typescript
// Retry built in
n8n`when api fails, retry 3 times with exponential backoff`

// Fallback workflows
n8n`on error in order-processing, notify ops and queue for manual review`

// Dead letter queues
n8n`failed webhooks go to dead-letter for investigation`
```

### Execution History

```typescript
// Query execution history naturally
await n8n`last 10 executions of sync-contacts`
await n8n`failed executions this week`
await n8n`running workflows right now`

// Retry failed executions
await n8n`retry failed execution abc123`
```

## Architecture

```
                    +----------------------+
                    |      n8n.do          |
                    | (Cloudflare Worker)  |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |   WorkflowDO     | |   ExecutionDO    | |  CredentialDO    |
    |  (definitions)   | |   (runs/state)   | |  (secrets)       |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |  Cloudflare Queues |
                    |  (node execution)  |
                    +-------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each workflow gets its own WorkflowDO for definition storage. ExecutionDO tracks run state with step memoization. CredentialDO securely stores and retrieves encrypted credentials.

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active workflows, recent executions | <10ms |
| **Warm** | R2 + SQLite Index | Historical executions (30-90 days) | <100ms |
| **Cold** | R2 Archive | Compliance retention (1+ years) | <1s |

## vs Self-Hosted n8n

| Feature | Self-Hosted n8n | n8n.do |
|---------|-----------------|--------|
| **Infrastructure** | Kubernetes + PostgreSQL + Redis | Zero |
| **Cold starts** | Node.js container startup | None (DO stays warm) |
| **Execution limits** | Memory-bound | Unlimited duration |
| **Scaling** | Manual worker pools | Automatic |
| **Credentials** | Your encryption, your vault | Built-in, per-tenant encrypted |
| **Global latency** | Single region | Edge everywhere |
| **Maintenance** | Your ops burden | We handle it |
| **Cost at scale** | $200+/month + DevOps time | Pay for what you use |

## Integrations

### Pre-built Connectors

| Category | Integrations |
|----------|--------------|
| **CRM** | Salesforce, HubSpot, Pipedrive, Zoho |
| **Productivity** | Slack, Discord, Teams, Gmail, Calendar |
| **Data** | PostgreSQL, MySQL, MongoDB, Airtable, Google Sheets |
| **Payments** | Stripe, PayPal, Square |
| **Marketing** | Mailchimp, SendGrid, Intercom |
| **Dev Tools** | GitHub, GitLab, Jira, Linear, Notion |
| **AI** | OpenAI, Anthropic, Cohere (via llm.do) |

### Custom Integrations

```typescript
// Any HTTP API works
n8n`call api.example.com/data with auth header`

// Webhook receivers
n8n`when webhook /custom receives POST, parse body and route`
```

## MCP Tools

AI agents can build and execute workflows:

```typescript
import { n8nTools } from 'n8n.do/mcp'

// Available tools for AI agents
// - workflow_create: Create new workflows from description
// - workflow_execute: Run existing workflows
// - workflow_list: List available workflows
// - execution_status: Check execution status
// - credentials_list: List available credentials
```

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo n8n
npx wrangler deploy
```

### Self-Managed

```bash
# Run n8n.do on your own Cloudflare account
git clone https://github.com/dotdo/n8n.do
cd n8n.do
pnpm install
pnpm deploy
```

## The Rewrites Ecosystem

n8n.do is part of the rewrites family - popular infrastructure reimplemented on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Durable workflows for AI |
| **n8n.do** | n8n | Visual automation for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |
| [nats.do](https://nats.do) | NATS | Messaging for AI |

## Contributing

n8n.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/n8n.do
cd n8n.do
pnpm install
pnpm test
```

## License

MIT

---

<p align="center">
  <strong>Workflow automation without the infrastructure.</strong>
  <br />
  Natural language. Edge-native. AI-first.
  <br /><br />
  <a href="https://n8n.do">Website</a> |
  <a href="https://docs.n8n.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/n8n.do">GitHub</a>
</p>
