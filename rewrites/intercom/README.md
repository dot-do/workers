# intercom.do

> Customer Messaging. AI-First. Yours to Own.

Intercom charges $74-153/seat/month. AI features cost extra. Your conversations live on their servers. Your customer data belongs to them. For a 10-person support team: **$740-1,530/month** before AI features.

**intercom.do** is the open-source alternative. AI built-in. Deploy in minutes. Own it forever.

## AI-Native API

```typescript
import { intercom } from 'intercom.do'           // Full SDK
import { intercom } from 'intercom.do/tiny'      // Minimal client
import { intercom } from 'intercom.do/inbox'     // Inbox-only operations
```

Natural language for customer support:

```typescript
import { intercom } from 'intercom.do'

// Talk to it like a support manager
const waiting = await intercom`conversations waiting for reply`
const unassigned = await intercom`unassigned conversations older than 2 hours`
const vips = await intercom`messages from enterprise customers today`

// Chain like sentences
await intercom`unassigned conversations`
  .map(conv => intercom`assign ${conv} to available agent`)

// AI responds, escalates when needed
await intercom`reply to user-123 about password reset`
  .escalate('billing dispute')  // routes to human if needed
```

## The Problem

Intercom dominates customer messaging with aggressive pricing:

| What Intercom Charges | The Reality |
|-----------------------|-------------|
| **Basic Seats** | $74/seat/month |
| **Advanced Seats** | $153/seat/month |
| **AI Resolutions** | $0.99 per resolution |
| **Custom Bots** | Enterprise pricing only |
| **Data Ownership** | Your data on their servers |
| **Vendor Lock-in** | Migration is painful |

### The Intercom Tax

- Per-seat pricing punishes growth
- AI features cost extra on top
- Customer data is hostage
- Rate limits on your own conversations

## The Solution

**intercom.do** reimagines customer messaging:

```
Intercom                            intercom.do
----------------------------------------------------------
$74-153/seat/month                  Deploy in minutes
$0.99/AI resolution                 AI included
Their servers                       Your Cloudflare account
Rate limited                        Unlimited
Vendor lock-in                      Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo intercom
```

Your own messenger. Your own inbox. Your data.

```typescript
import { Intercom } from 'intercom.do'

export default Intercom({
  name: 'acme-support',
  domain: 'support.acme.com',
})
```

## Features

### Conversations

```typescript
// Find conversations naturally
const open = await intercom`open conversations`
const waiting = await intercom`conversations waiting over 1 hour`
const urgent = await intercom`vip customers needing response`

// AI infers what you need
await intercom`conversations from alice@example.com`  // returns history
await intercom`unread messages today`                 // returns count and list
await intercom`escalated to billing team`             // returns filtered
```

### Team Inbox

```typescript
// Assignments are one line
await intercom`assign conversation-123 to Sarah`
await intercom`route new conversations to available agents`

// Bulk operations just work
await intercom`conversations waiting over 2 hours`
  .map(conv => intercom`assign ${conv} to next available`)
```

### Help Center

```typescript
// Create articles naturally
await intercom`article: Getting Started with password reset steps`

// AI-powered search
await intercom`search articles about billing`
await intercom`suggest article for user asking about refunds`

// Bulk operations
await intercom`outdated articles`
  .map(article => intercom`flag ${article} for review`)
```

### Bots & Workflows

```typescript
// Just describe what you want
await intercom`when new conversation, ask Sales or Support`
await intercom`route Sales to sales team, Support to AI agent`

// AI builds the workflow
await intercom`create bot: qualify leads then route to sales`
```

## AI Support Agents

AI handles L1 support. No per-resolution fees.

### How It Works

```
Customer Question --> AI Agent --> Can answer? --> Yes --> Respond instantly
                                         |
                                         No --> Escalate to human
```

### Knowledge Sources

```typescript
// Train AI naturally
await intercom`learn from help center`
await intercom`learn from last 90 days of conversations`
await intercom`learn from docs.yourcompany.com`

// Or batch it
await intercom`train on help center, recent conversations, and docs site`
```

### Intelligent Escalation

```typescript
// AI knows when to hand off
await intercom`escalate billing disputes to human`
await intercom`escalate when customer asks for manager`
await intercom`escalate negative sentiment to senior agents`

// Working hours just work
await intercom`during business hours route to team, after hours collect info`
```

### Conversation Handoff

```typescript
// AI summarizes for human agents
await intercom`summarize conversation-123 for handoff`
// Returns: "Customer asking about enterprise pricing. Mentioned 500 seats. Positive sentiment."

// Suggest responses
await intercom`suggest response for conversation-123`
```

## Architecture

Built on Cloudflare Durable Objects. Conversations happen at the edge.

### Global Performance

| Metric | intercom.do | Traditional SaaS |
|--------|-------------|------------------|
| Message latency | <50ms worldwide | 100-300ms |
| Widget load time | <100ms (edge cached) | 500ms+ |
| WebSocket connection | Regional edge | Single region |
| Offline resilience | Queue & sync | Lost messages |

### Durable Object per Workspace

```
WorkspaceDO (config, users, roles, teams)
  |
  +-- ConversationDO (WebSocket hub, message history)
  |     |-- SQLite: Messages (hot)
  |     +-- R2: Attachments
  |
  +-- InboxDO (team view, assignments, routing)
  |     |-- SQLite: Assignment state
  |
  +-- ArticleDO (help center, FTS5 search)
  |     |-- SQLite: Articles with full-text search
  |
  +-- UserDO (customer profiles, attributes)
  |     |-- SQLite: Contact database
  |
  +-- AIAgentDO (AI agent, knowledge base, embeddings)
        |-- Vectorize: Knowledge embeddings
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active conversations, recent messages | <10ms |
| **Warm** | R2 + SQLite Index | Archived conversations (30+ days) | <100ms |
| **Cold** | R2 Archive | Long-term retention (1+ year) | <1s |

## vs Intercom

| Feature | Intercom | intercom.do |
|---------|----------|-------------|
| **Base Price** | $74-153/seat/month | Deploy in minutes |
| **AI Resolutions** | $0.99 each | Included |
| **Architecture** | Centralized SaaS | Edge-native, global |
| **Data Location** | Their servers | Your Cloudflare account |
| **Custom Bots** | Enterprise only | Included |
| **Rate Limits** | Aggressive | Unlimited |
| **Lock-in** | Painful migration | MIT licensed |

## Customer Communication

```typescript
// Messages read like you'd say them
await intercom`message alice@example.com about their subscription`
await intercom`send newsletter to pro customers`

// Bulk outreach
await intercom`customers who signed up this week`
  .map(user => intercom`welcome message to ${user}`)

// Notify your team
await intercom`new conversation from enterprise customer`
  .notify('slack', '#support-priority')
```

## Analytics

```typescript
// Query your metrics naturally
await intercom`response time this week`
await intercom`resolution rate by agent`
await intercom`busiest hours last month`

// Trend analysis
await intercom`conversation volume trend`
await intercom`customer satisfaction over time`
```

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo intercom
```

### Private Cloud

```bash
# Deploy to your infrastructure
docker run -p 8787:8787 dotdo/intercom
```

### On-Premises

```bash
./intercom-do-install.sh --on-premises
```

## Migration from Intercom

One-command migration:

```bash
npx intercom.do migrate --from-intercom
```

Migrates everything: conversations, contacts, articles, custom attributes, team members, saved replies, tags, segments.

## Cost Example

**10-person support team, 1,000 AI resolutions/month:**

| | Intercom | intercom.do |
|-|----------|-------------|
| Seats | $740-1,530 | $0 |
| AI resolutions | $990 | $0 |
| **Monthly total** | **$1,730-2,520** | **~$5** (Workers) |
| **Annual savings** | - | **$20,700-30,180** |

## Use Cases

### Customer Support

Unified inbox, AI-first response, seamless escalation. Support teams focus on complex issues while AI handles the rest.

### Sales Qualification

```typescript
await intercom`new visitor on pricing page`
  .map(visitor => intercom`qualify ${visitor} for sales`)
  .map(lead => intercom`route ${lead} to sales team`)
```

### Proactive Outreach

```typescript
// Engagement automation
await intercom`users who haven't logged in this week`
  .map(user => intercom`send re-engagement message to ${user}`)

await intercom`trial users expiring in 3 days`
  .map(user => intercom`send trial extension offer to ${user}`)
```

## Roadmap

### Core Messaging
- [x] Real-time conversations
- [x] Team inbox
- [x] AI responses
- [x] Help center
- [x] Bots & workflows
- [ ] Mobile SDK
- [ ] Email integration

### AI
- [x] L1 support automation
- [x] Knowledge base training
- [x] Intelligent escalation
- [ ] Sentiment analysis
- [ ] Predictive support

### Integrations
- [ ] Slack notifications
- [ ] CRM sync
- [ ] Zapier/n8n
- [ ] Custom webhooks

## Contributing

intercom.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/intercom.do
cd intercom.do
pnpm install
pnpm test
```

## License

MIT License - Customer messaging for everyone.

---

<p align="center">
  <strong>The per-seat pricing ends here.</strong>
  <br />
  AI-first. Edge-native. Customer-owned.
  <br /><br />
  <a href="https://intercom.do">Website</a> |
  <a href="https://docs.intercom.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/intercom.do">GitHub</a>
</p>
