# zapier.do

> Automation that speaks your language. Natural language triggers, actions, and workflows on Cloudflare.

Zapier charges $600/month for 50,000 tasks. Your startup scales, your automation bill scales faster. Every webhook, every sync, every notification - metered and monetized. You're paying a tax on your own success.

**zapier.do** is the open-source alternative. Unlimited automations. Edge-native. AI-first. Just tell it what you want.

## AI-Native API

```typescript
import { zapier } from 'zapier.do'           // Full SDK
import { zapier } from 'zapier.do/tiny'      // Minimal client
import { zapier } from 'zapier.do/triggers'  // Trigger-only operations
```

Natural language for automation workflows:

```typescript
import { zapier } from 'zapier.do'

// Talk to it like a colleague
zapier`when Stripe payment: add to HubSpot, notify #sales`
zapier`every morning at 9am: sync charges to Google Sheet`
zapier`when GitHub issue closes: post to #shipped`

// Chain like sentences
await zapier`new signup`
  .map(user => salesforce`create contact ${user}`)
  .map(contact => email`send welcome to ${contact}`)
```

## The Problem

Zapier dominates automation, but at what cost?

| What Zapier Charges | The Reality |
|---------------------|-------------|
| **Free Tier** | 100 tasks/month (gone in a day) |
| **Starter** | $29/month for 750 tasks |
| **Professional** | $99/month for 2,000 tasks |
| **Team** | $399/month for 50,000 tasks |
| **Company** | $799+/month for unlimited |
| **Per-Task Overages** | $0.01-0.05 per task beyond limit |

### The Task Tax

Every automation run is a "task." One Zap with 5 steps = 5 tasks. A 1000-customer webhook = 1000 tasks. Your cost scales with your success.

### The Lock-in Problem

- Proprietary WYSIWYG interface - no code, no version control
- Can't export your Zap logic
- Complex workflows become unmaintainable spaghetti
- No AI agents - humans click forever

### The Latency Problem

- Cold starts on every trigger
- Multi-step Zaps add latency
- No edge distribution
- Enterprise features behind paywalls

## The Solution

**zapier.do** reimagines automation for developers and AI:

```
Zapier                              zapier.do
-----------------------------------------------------------------
$600/month for 50k tasks            $0 - unlimited on Cloudflare
Proprietary WYSIWYG                 Code-first, version controlled
Cold starts every run               Edge-native, no cold starts
Human-only clicks                   AI-native from day one
No customization                    Full TypeScript control
Vendor lock-in                      Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo zapier
```

Unlimited automations. Running on your Cloudflare account. AI-native from day one.

## Features

### Promise Pipelining

Chain automations with `.map()` - one network round trip:

```typescript
const result = await zapier`new order received`
  .map(order => stripe`charge ${order.total}`)
  .map(charge => email`confirm ${charge.customer}`)
  .map(sent => slack`notify #orders ${sent}`)
// One network round trip!
```

Build complex workflows that execute efficiently:

```typescript
const onboarding = await zapier`user signed up`
  .map(user => [
    salesforce`create contact ${user}`,
    hubspot`add to sequence ${user.email}`,
    slack`notify #growth: new signup ${user.name}`
  ])
  .map(results => analytics`track onboarding_started ${results}`)
```

### Agent Integration

Let your AI agents set up automation for you:

```typescript
import { ralph, priya } from 'agents.do'

// Ralph can build automation systems
ralph`set up automation to sync new customers from Stripe to HubSpot`

// Priya can define business workflows
priya`create automation for our lead qualification pipeline`

// Agents use zapier.do under the hood
ralph`when deal closes in Pipedrive, trigger celebration in Slack and update forecast sheet`
```

### AI-Native (MCP Tools)

zapier.do is built for AI agents, not just humans. Full MCP integration - AI speaks natural language too:

```typescript
// AI agents create automations the same way
await zapier`when order created: charge Stripe, confirm email, notify #orders`

// AI can discover what's available
await zapier`list my automations`
await zapier`show triggers for Stripe`
await zapier`what apps are connected?`

// AI can manage automations naturally
await zapier`pause the order processing automation`
await zapier`enable all Slack notifications`
await zapier`delete the old lead routing zap`
```

Works with fsx.do and gitx.do for file and version control operations:

```typescript
zapier`when PR merges: write changelog to /docs/changelog.md, commit`
zapier`daily at midnight: export analytics to /reports/daily.jsonl`
zapier`when deploy succeeds: update /status/health.json, notify #ops`
```

### Triggers

Natural language triggers - just say when:

```typescript
// Webhooks - instant events
zapier`when order created: charge Stripe, email confirmation, notify #orders`
zapier`when lead submitted: add to HubSpot, start drip sequence`
zapier`when payment failed: notify #billing, email customer`

// Schedules - say the time
zapier`every morning at 9am: sync Stripe to Google Sheet`
zapier`every Friday at 5pm: send weekly metrics to #team`
zapier`first Monday of month: generate MRR report`

// Polling - periodic checks
zapier`check every 5 minutes: new items from API, post to Slack if any`
```

### Filters and Routing

Natural language conditions - if you can say it, it works:

```typescript
// Conditional routing with natural language
zapier`when lead created: if score > 50, route to #sales-enterprise`
zapier`when lead created: if company size = startup, route to #sales-startup`

// Multi-path routing
zapier`when deal updated:
  if stage = won, celebrate in #wins and update forecast
  if stage = lost, log reason and notify manager`

// Value-based filtering
zapier`when order received: if total > $100, process premium else standard`
zapier`when signup: if enterprise plan, assign to account team`
```

### Order Processing

```typescript
// The dictation test: a no-code builder could say this naturally
zapier`when order > $100: charge Stripe, send confirmation, notify #orders`

// Multi-step with context
zapier`when new order:
  charge customer
  send receipt email
  update inventory
  if total > $500, notify #big-orders`
```

### Lead Qualification

```typescript
// Route leads by score and size
zapier`when lead created: if score > 50, route enterprise to #sales-enterprise`
zapier`when lead created: if score <= 50, add to nurture sequence`

// Company-based routing
zapier`when lead:
  if Fortune 500, assign to enterprise team
  if startup, assign to SMB team
  else assign to general queue`
```

### Data Sync

```typescript
// Cross-app sync in plain English
zapier`when Stripe payment: add customer to HubSpot, log in Google Sheet`
zapier`when HubSpot deal closes: update Salesforce opportunity, notify Slack`
zapier`every hour: sync new Notion tasks to Linear`
```

## Architecture

```
                    +----------------------+
                    |     zapier.do        |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |     TriggerDO    | |     ActionDO     | |    ZapDO         |
    | (event sources)  | | (API execution)  | | (orchestration)  |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +-------+-------+-------+-------+
                      |               |
            +------------------+ +------------------+
            |      fsx.do      | |     gitx.do      |
            |  (file storage)  | | (version control)|
            +------------------+ +------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent execution. Each Zap run gets its own isolated context with step memoization. Zero cold starts. Global edge distribution.

## Built-in Connectors

| Category | Apps |
|----------|------|
| **CRM** | Salesforce, HubSpot, Pipedrive |
| **Email** | SendGrid, Mailchimp, Gmail |
| **Chat** | Slack, Discord, Teams |
| **Storage** | fsx.do, S3, Google Drive, Dropbox |
| **Code** | gitx.do, GitHub, GitLab |
| **Database** | Supabase, Airtable, Notion |
| **Payments** | Stripe, PayPal |
| **HTTP** | Any REST API |

## Installation

```bash
npm install zapier.do
```

## Why Cloudflare?

1. **Global Edge** - Automations run close to your users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable step execution
5. **Free Tier** - Most startups pay $0

## The Rewrites Ecosystem

zapier.do is part of the rewrites family - popular services reimplemented on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **zapier.do** | Zapier | Automation for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |

## vs Zapier

| Feature | Zapier | zapier.do |
|---------|--------|-----------|
| **Pricing** | $29-799/month, per-task | $0 - unlimited |
| **Free Tier** | 100 tasks/month | Unlimited |
| **Interface** | Drag-and-drop only | Natural language + code |
| **Version Control** | None | Git-native |
| **Cold Starts** | Yes, every trigger | None (Durable Objects) |
| **AI Integration** | None | AI-native from day one |
| **Customization** | Limited templates | Full TypeScript control |
| **Data Location** | Zapier's servers | Your Cloudflare account |
| **Export** | Not supported | Open source, MIT licensed |
| **Edge Distribution** | US-only | Global (300+ locations) |

## Related Domains

- **workflows.do** - Workflow orchestration
- **triggers.do** - Event triggers and webhooks
- **inngest.do** - Event-driven durable execution
- **agents.do** - AI agents that use zapier.do

## License

MIT License - Automate without limits.

---

<p align="center">
  <strong>The $600/month bill ends here.</strong>
  <br />
  Edge-native. AI-first. Code-first.
  <br /><br />
  <a href="https://zapier.do">Website</a> |
  <a href="https://docs.zapier.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/zapier.do">GitHub</a>
</p>
