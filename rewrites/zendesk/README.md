# zendesk.do

> Help Desk. AI-resolved. Open source.

Your own Zendesk. One click. Unlimited agents. AI that actually resolves tickets.

## AI-Native API

```typescript
import { zendesk } from 'zendesk.do'           // Full SDK
import { zendesk } from 'zendesk.do/tiny'      // Minimal client
import { zendesk } from 'zendesk.do/triggers'  // Automation-only
```

Natural language for support operations:

```typescript
import { zendesk } from 'zendesk.do'

// Talk to it like a support manager
const urgent = await zendesk`urgent tickets from enterprise customers`
const stale = await zendesk`pending tickets not updated in 72 hours`
const angry = await zendesk`tickets with negative sentiment`

// Chain like sentences
await zendesk`pending tickets not updated in 72 hours`
  .email('follow-up')
  .tag('follow-up-sent')

// Tickets resolve themselves
await zendesk`auto-resolve tickets with 85% confidence`
await zendesk`when ticket from vip is new: priority urgent, route to vip-support`
```

## The Problem

Zendesk changed the game with modern help desk software. Then they locked it behind per-agent pricing:

| Zendesk Plan | Price | AI Features |
|--------------|-------|-------------|
| Suite Team | $55/agent/month | None |
| Suite Growth | $89/agent/month | Basic |
| Suite Professional | $115/agent/month | "Advanced AI" |

**Do the math.** 10 agents on Professional = **$13,800/year**. Just for software.

And AI? It's the premium add-on. The thing that could actually help you scale support - paywalled behind enterprise pricing.

Small teams get priced out. Startups bootstrap without proper support. Growing companies ration agent seats.

## The Solution

**zendesk.do** is the open-source Zendesk you deploy yourself.

- **Unlimited agents.** No per-seat licensing.
- **AI resolution built-in.** Not a premium add-on. The core feature.
- **Your infrastructure.** Your data. Your rules.
- **Same power.** Triggers, automations, macros, SLAs, views, knowledge base.

AI isn't the upsell. AI is how modern support works.

## One-Click Deploy

```bash
npx create-dotdo zendesk
```

Your help desk. Running on Cloudflare. Ready for tickets.

```typescript
import { Zendesk } from 'zendesk.do'

export default Zendesk({
  name: 'acme-support',
  domain: 'support.acme.com',
  ai: {
    autoResolve: true,
    confidence: 0.85,
  },
})
```

## Features

Everything you expect from a modern help desk:

### Tickets & Views

```typescript
// Find tickets naturally
const vip = await zendesk`tickets from enterprise customers`
const urgent = await zendesk`urgent unassigned tickets`
const mine = await zendesk`my open tickets`

// AI infers what you need
await zendesk`ticket 12345`                    // returns ticket
await zendesk`comments on ticket 12345`        // returns conversation
await zendesk`similar tickets to 12345`        // returns related issues
```

### Triggers & Rules

```typescript
// Rules read like policies
zendesk`when ticket from vip is new: priority urgent, route to vip-support`
zendesk`when ticket mentions refund: tag refund-request, assign to billing`
zendesk`when ticket sentiment negative and priority low: escalate`

// SLAs in plain English
zendesk`enterprise tickets: first response 1 hour, resolution 4 hours`
zendesk`standard tickets: first response 4 hours, resolution 24 hours`
```

### Automations

```typescript
// Time-based actions
zendesk`pending tickets not updated in 72 hours`.email('follow-up').tag('follow-up-sent')
zendesk`solved tickets after 48 hours`.close()
zendesk`tickets breaching SLA`.notify('on-call').escalate()
```

### Service Level Agreements

- Multiple SLA policies per condition
- First response, next response, resolution targets
- Escalation workflows when breached
- Real-time SLA status on every ticket

### Knowledge Base

- Self-service help center
- Article suggestions as customers type
- AI-generated articles from resolved tickets
- Multi-language support

### Multi-Channel Support

| Channel | Status |
|---------|--------|
| Email | Built-in |
| Contact Forms | Built-in |
| Live Chat | Built-in |
| API | Built-in |
| Slack | Plugin |
| Discord | Plugin |

## AI Ticket Resolution

Here's what makes zendesk.do different: **AI isn't bolted on. It's the foundation.**

### L1 Auto-Resolution

```typescript
// One line: AI handles L1 automatically
await zendesk`auto-resolve tickets with 85% confidence`

// Or be specific
await zendesk`auto-resolve password reset tickets`
await zendesk`auto-resolve how-to questions from knowledge base`

// Low confidence? Route with context
await zendesk`tickets AI cannot resolve`.assign('tier-2').note('AI suggestions attached')
```

### How It Works

1. **Customer submits ticket**
2. **AI analyzes** - intent, sentiment, similar tickets, KB articles
3. **High confidence?** Auto-resolve with response
4. **Lower confidence?** Route to human with suggestions
5. **Human resolves?** AI learns from the resolution

### AI Capabilities

```typescript
// Intent classification
await zendesk`billing questions today`
await zendesk`feature requests this week`

// Sentiment detection
await zendesk`frustrated customers`
await zendesk`tickets with negative sentiment`

// Similar ticket matching
await zendesk`tickets like 12345`
await zendesk`how was this solved before?`

// Response drafting
await zendesk`draft response for ticket 12345`
  .review()   // human approves
  .send()

// Auto-tagging happens automatically
```

### The Numbers

Typical AI resolution rates with zendesk.do:

| Ticket Type | AI Resolution Rate |
|-------------|-------------------|
| Password reset | 95%+ |
| Account questions | 80%+ |
| How-to questions | 75%+ |
| Bug reports | 40%+ (triage & route) |
| Feature requests | 30%+ (categorize & acknowledge) |

Your human agents focus on complex issues. AI handles the rest.

## Full Workflow Engine

The same workflow power as Zendesk, in natural language:

### Triggers

```typescript
// Trigger rules read like policies you'd speak aloud
zendesk`when ticket from vip is new: priority urgent, route to vip-support`
zendesk`when ticket mentions billing: assign to billing-team`
zendesk`when ticket has attachment: tag has-attachment`
zendesk`when requester is enterprise: SLA enterprise, priority high`
```

### Automations

```typescript
// Time-based automations
zendesk`pending tickets not updated in 72 hours`.email('follow-up').tag('follow-up-sent')
zendesk`solved tickets after 7 days`.close()
zendesk`unassigned urgent tickets after 15 minutes`.notify('on-call')
zendesk`SLA breach in 30 minutes`.warn('assigned-agent')
```

### Macros

```typescript
// Common responses
await zendesk`refund for ticket 12345`
  .respond('Your refund has been processed and will appear in 3-5 business days.')
  .tag('refund-processed')
  .solve()

// Or define reusable macros
zendesk`macro 'refund': respond with refund confirmation, tag refund-processed, solve`
zendesk`macro 'needs-info': respond asking for details, set pending, tag awaiting-customer`
```

## API Compatible

Drop-in compatibility with Zendesk's API. Your existing integrations work.

```typescript
// Same natural syntax for API operations
await zendesk`create ticket: billing issue from john@acme.com`
await zendesk`update ticket 12345: priority urgent`
await zendesk`add comment to 12345: We're looking into this`

// Or use traditional REST
GET    /api/v2/tickets
POST   /api/v2/tickets
GET    /api/v2/tickets/{id}
PUT    /api/v2/tickets/{id}
```

Existing Zendesk integrations, webhooks, and scripts work with minimal changes.

## Architecture

Built on Cloudflare Durable Objects for global, real-time support:

```
HelpDeskDO (config, agents, groups, SLAs)
  |
  +-- TicketsDO (ticket state, conversations)
  |     |-- SQLite: Active tickets (encrypted)
  |     +-- R2: Attachments (encrypted)
  |
  +-- ViewsDO (real-time ticket views)
  |     |-- SQLite: View definitions
  |     +-- WebSocket: Live updates
  |
  +-- TriggersDO (business rules engine)
  |     |-- SQLite: Rule definitions
  |     +-- Atomic execution
  |
  +-- KnowledgeDO (help center, articles)
        |-- SQLite: Article content
        +-- Vector: Semantic search
```

### Why Durable Objects?

- **Real-time updates** - WebSocket connections for live ticket changes
- **Global distribution** - Tickets live close to your agents
- **Transactional** - Triggers execute atomically with ticket updates
- **Scalable** - Each ticket is its own actor, scales infinitely

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active tickets, recent history | <10ms |
| **Warm** | R2 + Index | Archived tickets (30-365 days) | <100ms |
| **Cold** | R2 Archive | Compliance retention (365+ days) | <1s |

## vs Zendesk

| Feature | Zendesk Suite Professional | zendesk.do |
|---------|---------------------------|------------|
| **Price** | $115/agent/month | $0 + infrastructure |
| **AI Resolution** | Premium add-on | Built-in |
| **Agents** | Per-seat licensing | Unlimited |
| **Deploy** | SaaS only | Your Cloudflare account |
| **Customization** | Configuration UI | Code-first |
| **Data** | Zendesk's servers | Your control |
| **Lock-in** | Years of migration | MIT licensed |

## Getting Started

### 1. Deploy

```bash
npx create-dotdo zendesk
```

### 2. Configure

```typescript
// Just talk to it
zendesk`support email is support@acme.com`
zendesk`business hours 9am to 6pm Pacific weekdays`
zendesk`auto-resolve with 85% confidence`
```

### 3. Add Agents

```typescript
await zendesk`add agent Sarah Chen sarah@acme.com`
await zendesk`add agent Mike Park mike@acme.com to billing-team`
await zendesk`Sarah is admin`
```

### 4. Define Rules

```typescript
// Routing
zendesk`when ticket mentions billing: assign to billing-team`
zendesk`when ticket from enterprise: priority high, SLA enterprise`

// SLAs
zendesk`enterprise: respond in 1 hour, resolve in 4 hours`
zendesk`standard: respond in 4 hours, resolve in 24 hours`

// Automations
zendesk`pending tickets after 72 hours: follow up and tag follow-up-sent`
```

## Migrate from Zendesk

```typescript
// One line migration
await zendesk`migrate from yourcompany.zendesk.com`

// Or step by step
await zendesk`import tickets from yourcompany.zendesk.com`
await zendesk`import users from yourcompany.zendesk.com`
await zendesk`import triggers from yourcompany.zendesk.com`
await zendesk`import knowledge base from yourcompany.zendesk.com`
```

Imports tickets, users, organizations, groups, views, triggers, automations, macros, and knowledge base articles.

## Use Cases

### Customer Support Teams

```typescript
// Daily operations
await zendesk`my open tickets`
await zendesk`urgent tickets needing response`
await zendesk`customers waiting more than 4 hours`

// Team management
await zendesk`team performance this week`
await zendesk`who has capacity?`
await zendesk`redistribute Sarah's tickets to team`
```

### E-commerce Support

```typescript
// Order issues
await zendesk`tickets about order 12345`
await zendesk`refund requests today`
await zendesk`shipping complaints this week`

// Proactive support
await zendesk`customers with delayed orders`.notify('shipping update')
```

### SaaS Support

```typescript
// Technical issues
await zendesk`bug reports this week`
await zendesk`tickets mentioning API errors`
await zendesk`enterprise customers with outage reports`

// Success metrics
await zendesk`CSAT scores by agent this month`
await zendesk`resolution time trend`
await zendesk`top 10 ticket categories`
```

## Contributing

zendesk.do is open source under MIT license.

```bash
git clone https://github.com/dotdo/zendesk.do
cd zendesk.do
pnpm install
pnpm dev
```

## License

MIT - Use it however you want. Build a business on it. Fork it. Improve it.

---

<p align="center">
  <strong>Stop paying per agent. Start resolving with AI.</strong>
  <br />
  Unlimited agents. AI-first. Your data.
  <br /><br />
  <a href="https://zendesk.do">Website</a> |
  <a href="https://docs.zendesk.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/zendesk.do">GitHub</a>
</p>
