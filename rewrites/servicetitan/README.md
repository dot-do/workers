# servicetitan.do

> Field Service Management. AI-powered. For every contractor.

ServiceTitan charges $300-500+/month. That prices out 90% of contractors.

Your neighborhood plumber deserves the same tools as a $10B franchise.

## AI-Native API

```typescript
import { servicetitan } from 'servicetitan.do'           // Full SDK
import { servicetitan } from 'servicetitan.do/tiny'      // Minimal client
import { servicetitan } from 'servicetitan.do/mobile'    // Tech mobile app
```

Natural language for field service:

```typescript
import { servicetitan } from 'servicetitan.do'

// Talk to it like you're on the phone with dispatch
const job = await servicetitan`AC repair 123 Main St, Johnson Residence, same-day`
await servicetitan`assign ${job} to Mike`
await servicetitan`optimize routes for today`

// Chain like a conversation
await servicetitan`jobs scheduled for tomorrow`
  .map(job => servicetitan`send ETA reminder to ${job.customer}`)

// The whole call-to-cash cycle
await servicetitan`water heater install 456 Oak Ave, urgent`
  .assign()           // AI picks best tech
  .estimate()         // good-better-best options
  .complete()         // tech marks done
  .invoice()          // auto-generate invoice
  .collect()          // tap to pay on-site
```

## The Problem

Field service management software has become a gatekeeper:

| What They Charge | The Reality |
|------------------|-------------|
| **ServiceTitan** | $300-500+/month minimum, enterprise sales process |
| **Housecall Pro** | $65-200/month, AI features locked behind premium tiers |
| **Jobber** | $49-199/month, dispatch optimization costs extra |
| **FieldEdge** | Enterprise pricing, 12-month contracts |

Meanwhile, your local HVAC tech runs their business from sticky notes and a whiteboard.

The result? Small contractors work harder, earn less, and lose jobs to companies with better software.

## The Solution

**servicetitan.do** is open-source field service management that deploys in one click.

```
ServiceTitan                        servicetitan.do
-----------------------------------------------------------------
$300-500+/month                     $0 (self-host)
Enterprise sales process            Deploy in 5 minutes
AI features cost extra              AI-first, included
12-month contracts                  No contracts
Proprietary data                    Your data, your servers
$500/hour customization             Open source, modify anything
```

Running on Cloudflare's edge. Costing pennies. Owned by you.

## One-Click Deploy

```bash
npx create-dotdo servicetitan
```

That's it. Your HVAC company now has its own scheduling, dispatch, and invoicing system.

```typescript
import { ServiceTitan } from 'servicetitan.do'

export default ServiceTitan({
  name: 'johnson-hvac',
  domain: 'dispatch.johnsonhvac.com',
  timezone: 'America/Chicago',
})
```

## Features

### Jobs & Work Orders

```typescript
// Create jobs like you're talking to dispatch
const job = await servicetitan`AC not cooling at Johnson Residence, 123 Main St`
const urgent = await servicetitan`emergency water leak at 456 Oak Ave`
const scheduled = await servicetitan`tune-up for Maria next Tuesday morning`

// AI infers what you need
await servicetitan`Johnson Residence`              // returns customer
await servicetitan`jobs at Johnson Residence`      // returns job history
await servicetitan`Johnson Residence equipment`    // returns installed units
```

### Intelligent Dispatch

```typescript
// Dispatch like you're talking to the board
await servicetitan`assign ${job} to best tech for HVAC`
await servicetitan`who's closest to 123 Main St?`
await servicetitan`Mike's schedule today`

// AI handles the complexity
await servicetitan`assign ${job}`
// -> Considers: skills, location, traffic, workload, customer history
// -> Returns: { tech: 'Mike', eta: '2:30 PM', confidence: 0.94 }

// Bulk dispatch just works
await servicetitan`jobs needing assignment`
  .each(job => servicetitan`assign ${job}`)
```

### Route Optimization

```typescript
// One line to optimize the day
await servicetitan`optimize routes for today`
await servicetitan`optimize routes to maximize revenue`
await servicetitan`optimize routes to minimize drive time`

// Re-optimize on the fly
await servicetitan`shuffle today's routes, emergency came in`
```

### Estimates & Pricebook

```typescript
// Generate estimates naturally
await servicetitan`estimate for ${job}: capacitor replacement or full AC swap`
await servicetitan`good-better-best for water heater install`

// AI builds from diagnosis
await servicetitan`compressor failing, unit is 15 years old`
  .estimate()   // generates repair vs replace options

// Present and close on-site
await servicetitan`customer approved the replacement option`
```

### Invoicing & Payments

```typescript
// Job complete? Invoice it
await servicetitan`invoice ${job}`

// Or let the workflow handle it
await servicetitan`complete ${job}: replaced capacitor, 2.5 hours`
  .invoice()    // auto-generates from parts + labor
  .collect()    // tap to pay on-site

// Check payment status
await servicetitan`unpaid invoices this week`
await servicetitan`Johnson Residence balance`
```

### Fleet Tracking

```typescript
// Real-time location
await servicetitan`where is Mike?`
await servicetitan`techs near downtown`
await servicetitan`Mike's route progress`

// Customers get Uber-style tracking
await servicetitan`send ETA to Johnson Residence`
// -> "Mike is 10 minutes away!"
```

### Inventory Management

```typescript
// Track parts naturally
await servicetitan`Mike used a 45/5 capacitor on ${job}`
await servicetitan`parts low on Mike's truck`
await servicetitan`warehouse inventory for capacitors`

// Auto-reorder just works
await servicetitan`reorder parts running low`
```

## AI-Powered Operations

This isn't "AI" as a marketing checkbox. It's intelligence that makes contractors money.

### Smart Assignment

```typescript
// AI considers everything, you just ask
await servicetitan`assign ${job}`

// Factors: skills, certs, location, traffic, workload,
// customer history ("Sarah was great last time"), profitability
```

### Duration Prediction

```typescript
// AI learns from your data
await servicetitan`how long for a water heater install at ${job.address}?`
// -> "3.5 hours - older home, basement access adds time"
```

### Automatic Scheduling

```typescript
// Customer self-books, AI slots them perfectly
await servicetitan`enable online booking for tune-ups and estimates`

// AI manages capacity, prevents overbooking
await servicetitan`can we fit an emergency today?`
```

### Revenue Insights

```typescript
// Ask about your business
await servicetitan`revenue this week`
await servicetitan`top performing tech this month`
await servicetitan`average ticket by job type`
await servicetitan`callbacks this quarter`
```

## Offline-First

Contractors work in basements. Rural areas. Job sites with zero signal.

**servicetitan.do** works offline. Period.

```typescript
// On the job site (no signal):
await servicetitan`complete ${job}: replaced capacitor, tested operation`
// -> Stored locally, queued for sync

// Back in the truck (online):
// -> Syncs automatically, dispatch board updates
```

Each technician's device maintains a local Durable Object replica. No "sync failed" errors. No lost work orders. No excuses.

## Real-Time

Everything updates instantly across all devices.

### Dispatch Board

```typescript
// Office sees everything live
await servicetitan`watch dispatch board`
// -> Real-time: job status, tech locations, new calls

// Techs see their queue update
await servicetitan`watch my jobs`
```

### Customer Updates

```typescript
// Customers get Uber-style tracking automatically
await servicetitan`notify ${job.customer} when tech is on the way`

// Or enable for all jobs
await servicetitan`enable customer notifications for all jobs`
// -> "Mike is 10 minutes away!"
```

### Team Communication

```typescript
// Message between office and field
await servicetitan`tell Mike: customer found the leak under the sink`
await servicetitan`message all techs: office closing early today`
```

## Architecture

Built on Cloudflare Durable Objects for instant global state:

```
                    ┌─────────────────────────────────┐
                    │         servicetitan.do         │
                    │         (Your Instance)         │
                    └─────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            v                       v                       v
    ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
    │   Job DO      │      │  Dispatch DO  │      │ Technician DO │
    │  (per job)    │      │  (per day)    │      │  (per tech)   │
    └───────────────┘      └───────────────┘      └───────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    v               v               v
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │  SQLite   │   │    R2     │   │   D1      │
            │  (hot)    │   │  (files)  │   │ (search)  │
            └───────────┘   └───────────┘   └───────────┘
```

### Durable Objects

| Object | Scope | State |
|--------|-------|-------|
| `JobDO` | Per job | Status, notes, photos, parts, timeline |
| `DispatchDO` | Per day | Board state, assignments, routes |
| `TechnicianDO` | Per tech | Location, schedule, inventory |
| `CustomerDO` | Per customer | History, preferences, equipment |
| `PricebookDO` | Per company | Parts, labor rates, packages |

### Why Durable Objects?

- **Instant consistency**: No eventual consistency headaches
- **Automatic scaling**: One job = one object, scales to millions
- **Global edge**: State lives close to your users
- **Built-in persistence**: SQLite inside every DO
- **WebSocket native**: Real-time updates without infrastructure

## Get Started

### For Contractors

```bash
# Deploy your own instance
npx create-dotdo servicetitan

# Or use the hosted version
# Visit servicetitan.do/signup
```

### For Developers

```bash
# Clone and run locally
git clone https://github.com/dotdo/servicetitan.do
cd servicetitan.do
npm install
npm run dev

# Run tests
npm test

# Deploy to your Cloudflare account
npm run deploy
```

## Integrations

```typescript
// Connect to everything naturally
await servicetitan`connect Stripe for payments`
await servicetitan`connect QuickBooks for accounting`
await servicetitan`connect Twilio for customer SMS`

// Then just use them
await servicetitan`sync today's invoices to QuickBooks`
await servicetitan`text Johnson Residence their appointment reminder`
```

## Pricing

**Self-hosted**: Free forever. MIT license. Your data, your servers.

**Managed (servicetitan.do)**:
- Starter: $0/month (up to 50 jobs/month)
- Pro: $49/month (unlimited jobs, AI features)
- Team: $99/month (multi-tech, advanced dispatch)

No per-user fees. No contracts. No enterprise sales calls.

## vs ServiceTitan

| Feature | ServiceTitan | servicetitan.do |
|---------|--------------|-----------------|
| Starting Price | $300+/mo | $0 (self-host) |
| AI Dispatch | Premium add-on | Included |
| Offline Mode | Limited | Full offline |
| Implementation | 3-6 months | 5 minutes |
| Data Ownership | Theirs | Yours |
| Open Source | No | Yes |
| Contracts | 12+ months | None |

## Contributing

We welcome contributions from contractors and developers alike:

```bash
# Find available issues
bd ready

# Claim work
bd update xxx --status=in_progress

# Submit PR
gh pr create
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Roadmap

### Core
- [x] Jobs & Work Orders
- [x] Intelligent Dispatch
- [x] Route Optimization
- [x] Estimates & Invoicing
- [x] Payments (Stripe)
- [x] Fleet Tracking
- [x] Inventory Management
- [ ] Memberships & Service Agreements
- [ ] Marketing Automation

### AI
- [x] Smart Tech Assignment
- [x] Route Optimization
- [x] Duration Prediction
- [ ] Demand Forecasting
- [ ] Automated Follow-ups
- [ ] Voice Dispatch

### Integrations
- [x] Stripe Payments
- [ ] QuickBooks
- [ ] Twilio SMS
- [ ] Google Calendar
- [ ] Zapier

### Mobile
- [ ] Tech Mobile App (React Native)
- [ ] Customer Booking App
- [ ] Offline-First Sync

## License

MIT License. Use it, modify it, sell it, whatever.

Your business software shouldn't hold your business hostage.

---

<p align="center">
  <strong>Your neighborhood plumber deserves enterprise tools.</strong>
  <br />
  AI-first. Offline-ready. Contractor-owned.
  <br /><br />
  <a href="https://servicetitan.do">Website</a> |
  <a href="https://docs.servicetitan.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/servicetitan.do">GitHub</a>
</p>
