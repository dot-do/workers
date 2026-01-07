# zendesk.do

> Help Desk. AI-resolved. Open source.

Your own Zendesk. One click. Unlimited agents. AI that actually resolves tickets.

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

```bash
# Or deploy to an existing workers.do project
npx dotdo add zendesk
```

## Features

Everything you expect from a modern help desk:

### Tickets & Views

- Unified inbox across all channels
- Custom views with saved filters
- Ticket fields, tags, priorities
- Collision detection for concurrent edits
- Satisfaction surveys (CSAT)

### Triggers & Automations

- **Triggers**: Fire on ticket create/update
- **Automations**: Time-based actions (SLA breaches, follow-ups)
- **Macros**: One-click response templates
- **Conditional logic**: Complex business rules

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
// AI agent handles common tickets automatically
export const ticket = Ticket({
  triggers: {
    onCreate: async (ticket) => {
      const resolution = await ai.resolve(ticket, {
        confidence: 0.85,  // Only auto-resolve when confident
        knowledgeBase: true,
        ticketHistory: true,
      })

      if (resolution.autoResolved) {
        return ticket.close({
          response: resolution.message,
          tags: ['ai-resolved']
        })
      }

      // Low confidence? Suggest to human agent
      ticket.addInternalNote(resolution.suggestion)
    }
  }
})
```

### How It Works

1. **Customer submits ticket**
2. **AI analyzes** - intent, sentiment, similar tickets, KB articles
3. **High confidence?** Auto-resolve with response
4. **Lower confidence?** Route to human with suggestions
5. **Human resolves?** AI learns from the resolution

### AI Capabilities

- **Intent classification** - What does the customer need?
- **Sentiment detection** - Is this urgent? Is someone upset?
- **Similar ticket matching** - How was this solved before?
- **KB article suggestion** - Which help article answers this?
- **Response drafting** - Write human-like replies
- **Auto-tagging** - Categorize without manual work

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

The same workflow power as Zendesk, defined in code:

### Triggers

```typescript
// Trigger: Auto-assign VIP tickets
export const vipTrigger = Trigger({
  conditions: {
    all: [
      { field: 'requester.tags', contains: 'vip' },
      { field: 'status', equals: 'new' }
    ]
  },
  actions: [
    { field: 'priority', value: 'urgent' },
    { field: 'group', value: 'vip-support' },
    { field: 'tags', add: 'vip-escalation' }
  ]
})
```

### Automations

```typescript
// Automation: Follow up on pending tickets
export const followUp = Automation({
  conditions: {
    all: [
      { field: 'status', equals: 'pending' },
      { field: 'updated_at', before: '72 hours ago' }
    ]
  },
  actions: [
    { type: 'email', template: 'follow-up' },
    { field: 'tags', add: 'follow-up-sent' }
  ]
})
```

### Macros

```typescript
// Macro: Common refund response
export const refundMacro = Macro({
  title: 'Process Refund',
  actions: [
    { field: 'status', value: 'solved' },
    { field: 'tags', add: 'refund-processed' },
    {
      type: 'comment',
      value: 'Your refund has been processed and will appear in 3-5 business days.'
    }
  ]
})
```

## API Compatible

Drop-in compatibility with Zendesk's API. Your existing integrations work.

```typescript
// Standard Zendesk API endpoints
GET    /api/v2/tickets
POST   /api/v2/tickets
GET    /api/v2/tickets/{id}
PUT    /api/v2/tickets/{id}
DELETE /api/v2/tickets/{id}

GET    /api/v2/users
GET    /api/v2/organizations
GET    /api/v2/groups
GET    /api/v2/views
GET    /api/v2/triggers
GET    /api/v2/automations
GET    /api/v2/macros
```

Existing Zendesk integrations, webhooks, and scripts work with minimal changes.

```typescript
// Your existing code
const zendesk = new ZendeskClient({
  subdomain: 'yourcompany',  // Change to your zendesk.do URL
  // ... rest stays the same
})
```

## Architecture

Built on Cloudflare Durable Objects for global, real-time support:

```
zendesk/
  src/
    durable-objects/
      TicketDO.ts       # Individual ticket state
      OrganizationDO.ts # Customer organization
      ViewDO.ts         # Real-time view updates
      TriggerEngine.ts  # Business rule execution

    ai/
      resolver.ts       # AI ticket resolution
      classifier.ts     # Intent & sentiment
      suggester.ts      # KB & response suggestions

    api/
      v2/               # Zendesk-compatible API

    channels/
      email.ts          # Inbound/outbound email
      chat.ts           # Live chat
      form.ts           # Contact forms
```

### Why Durable Objects?

- **Real-time updates** - WebSocket connections for live ticket changes
- **Global distribution** - Tickets live close to your agents
- **Transactional** - Triggers execute atomically with ticket updates
- **Scalable** - Each ticket is its own actor, scales infinitely

### Storage Tiers

```typescript
// Hot: SQLite in Durable Object (< 30 days)
// Active tickets, recent history

// Warm: R2 object storage (30-365 days)
// Archived tickets, searchable

// Cold: R2 archive (> 365 days)
// Compliance retention, compressed
```

## Self-Hosted vs Managed

| | Self-Hosted | Managed (coming) |
|---|-------------|------------------|
| Price | Free + infrastructure | Usage-based |
| Deploy | Your Cloudflare account | One-click |
| Data | Your control | Encrypted, isolated |
| AI | Your LLM API key | Included |
| Support | Community | Priority |

## Getting Started

### 1. Deploy

```bash
npx create-dotdo zendesk
```

### 2. Configure Email

```typescript
// wrangler.toml
[vars]
SUPPORT_EMAIL = "support@yourcompany.com"

[[email]]
name = "inbound"
forward = "TicketDO"
```

### 3. Add Your First Agent

```bash
curl -X POST https://your-zendesk.do/api/v2/users \
  -d '{"user": {"name": "Support Agent", "email": "agent@yourcompany.com", "role": "agent"}}'
```

### 4. Enable AI Resolution

```typescript
// src/config.ts
export const config = {
  ai: {
    enabled: true,
    provider: 'llm.do',  // or 'openai', 'anthropic'
    autoResolve: {
      enabled: true,
      confidenceThreshold: 0.85
    }
  }
}
```

## Migrate from Zendesk

One-time import of your existing tickets, users, and configuration:

```bash
npx zendesk-do migrate \
  --subdomain=yourcompany \
  --email=admin@yourcompany.com \
  --token=your_api_token
```

Imports:
- Tickets & comments
- Users & organizations
- Groups & views
- Triggers & automations
- Macros
- Knowledge base articles

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

<div align="center">

**Stop paying per agent. Start resolving with AI.**

[Deploy Now](https://zendesk.do/deploy) | [Documentation](https://zendesk.do/docs) | [Discord](https://discord.gg/dotdo)

</div>
