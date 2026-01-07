# business.do

## Your Business, One API Call Away

You're building something incredible. But right now, your business data is a mess.

It's scattered across Stripe, Notion, spreadsheets, Slack threads, your database, and a dozen browser tabs you're afraid to close. Every time someone asks "how's the business doing?" you spend 20 minutes copy-pasting between apps.

**There's a better way.**

---

## The Problem

### Your data is everywhere. Your clarity is nowhere.

Every founder lives this nightmare:

- **10+ tools, zero unified view** - Revenue in Stripe. Team in Notion. Metrics in a spreadsheet. Pipeline in your head.
- **Context switching kills your flow** - Jump between 5 apps just to answer a simple question
- **Investor updates take hours** - Manually gathering data that should be instant
- **Integration hell never ends** - Every new tool means another API, another sync, another thing that breaks
- **Nobody knows the real numbers** - Different tools show different truths

You should be building your product. Instead, you're playing data detective.

---

## The Solution

### One object. One API. One truth.

```typescript
import { Business } from 'business.do'

// Get your entire business state in one call
const dashboard = await business.getDashboard('my-startup')

// Returns everything, unified:
// {
//   business: { name, stage, status },
//   team: [{ name, role, title }],
//   metrics: { mrr: 45000, arr: 540000, customers: 127 },
//   subscription: { plan: 'growth', status: 'active' },
//   recentActivity: [...last 10 events]
// }
```

No more tab-hopping. No more "let me check..." No more data chaos.

---

## 3 Simple Steps

### Step 1: Install

```bash
npm install business.do
```

### Step 2: Create your business

```typescript
import { Business } from 'business.do'

const startup = await business.create({
  name: 'Acme Inc',
  slug: 'acme',
  stage: 'growth',
  industry: 'SaaS',
})
```

### Step 3: Track everything in one place

```typescript
// Add team members
await business.addTeamMember({
  businessId: startup.id,
  email: 'alice@acme.com',
  role: 'owner',
  title: 'CEO',
})

// Record metrics
await business.recordMetrics({
  businessId: startup.id,
  period: '2024-01',
  mrr: 45000,
  customers: 127,
  churnRate: 1.8,
})

// Manage subscriptions
await business.setSubscription(startup.id, {
  plan: 'growth',
  status: 'active',
  stripeSubscriptionId: 'sub_xxx',
})

// Every action is automatically logged
const activity = await business.getActivityLog(startup.id)
```

**That's it.** Your entire business, unified.

---

## Before & After

| Before business.do | After business.do |
|:-------------------|:------------------|
| Data in 10+ disconnected tools | **Single source of truth** |
| Hours compiling investor updates | **One call: `getDashboard()`** |
| "Let me check..." for every question | **Instant answers** |
| Custom integrations that break | **Built-in platform sync** |
| Metrics scattered in spreadsheets | **First-class revenue tracking** |
| Manual reconciliation between systems | **Automatic audit trail** |
| Team access is a mess | **Role-based permissions** |
| No one knows the real numbers | **One truth, everywhere** |

---

## Full API Reference

### Business Management

```typescript
// Create, update, archive
await business.create({ name, slug, industry, stage })
await business.update(id, { stage: 'growth' })
await business.archive(id)
await business.restore(id)

// Query
await business.get(id)
await business.getBySlug('acme')
await business.list()
```

### Team Management

```typescript
await business.addTeamMember({ businessId, email, role, title })
await business.updateTeamMember(memberId, { role: 'admin' })
await business.removeTeamMember(memberId)
await business.getTeam(businessId)
```

### Metrics & Revenue

```typescript
await business.recordMetrics({ businessId, period, mrr, customers, churnRate })
await business.getMetrics(businessId, '2024-01')
await business.getMetricsHistory(businessId, '2023-01', '2024-01')
await business.getCurrentRevenue(businessId)
```

### Subscriptions

```typescript
await business.setSubscription(businessId, { plan, stripeSubscriptionId })
await business.getSubscription(businessId)
await business.hasActiveSubscription(businessId)
await business.cancelSubscription(businessId)
```

### Settings

```typescript
await business.setSetting(businessId, 'timezone', 'UTC', 'general')
await business.getSetting(businessId, 'timezone')
await business.getSettings(businessId, 'integrations')
```

### Dashboard & Activity

```typescript
await business.getDashboard(businessId)  // Everything, one call
await business.getActivityLog(businessId, limit, offset)  // Full audit trail
```

---

## Built on dotdo

business.do extends the [dotdo](../do) base class, giving you:

- **Durable Objects** - Strong consistency, global routing, survives restarts
- **SQLite storage** - Full SQL, ACID transactions, zero latency
- **Multi-transport** - REST, Workers RPC, WebSocket, MCP from one definition
- **AI-native** - Natural language via the `do()` method

```typescript
// REST
POST /businesses { "name": "Acme" }
GET  /businesses/acme/dashboard

// Workers RPC
const dashboard = await env.BUSINESS.getDashboard('acme')

// AI Agent
await env.BUSINESS.do("Add alice@acme.com as CTO")
```

---

## Part of workers.do

business.do integrates seamlessly with the workers.do platform:

| Service | What it does |
|---------|--------------|
| **[llm.do](https://llm.do)** | AI gateway with metered billing |
| **[payments.do](https://payments.do)** | Stripe Connect integration |
| **[id.org.ai](https://id.org.ai)** | Auth for AI and humans |

---

## Start Now

```bash
npm install business.do
```

**Stop juggling data across 10 tools.**

**Start running your business from one API.**

[Read the Docs](https://business.do) | [View Source](https://github.com/workers-do/workers/tree/main/objects/business)
