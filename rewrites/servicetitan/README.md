# servicetitan.do

> Field Service Management. AI-powered. For every contractor.

ServiceTitan charges $300-500+/month. That prices out 90% of contractors.

Your neighborhood plumber deserves the same tools as a $10B franchise.

## The Problem

Field service management software has become a gatekeeper:

- **ServiceTitan**: $300-500+/month minimum, enterprise sales process
- **Housecall Pro**: $65-200/month, AI features locked behind premium tiers
- **Jobber**: $49-199/month, dispatch optimization costs extra
- **FieldEdge**: Enterprise pricing, 12-month contracts

Meanwhile, your local HVAC tech runs their business from sticky notes and a whiteboard.

The result? Small contractors work harder, earn less, and lose jobs to companies with better software.

## The Solution

**servicetitan.do** is open-source field service management that deploys in one click.

Every plumber, electrician, and HVAC technician gets:
- Intelligent scheduling and dispatch
- Real-time GPS tracking
- Professional estimates and invoices
- Inventory management
- Customer history and communication
- AI that actually helps (not upsells)

Running on Cloudflare's edge. Costing pennies. Owned by you.

## One-Click Deploy

```bash
npx create-dotdo servicetitan
```

That's it. Your HVAC company now has its own scheduling, dispatch, and invoicing system.

Or deploy instantly to Cloudflare:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dotdo/servicetitan.do)

## Features

### Jobs & Work Orders

```typescript
import { fsm } from 'servicetitan.do'

// Create a job from a customer call
const job = await fsm.jobs.create({
  customer: 'Johnson Residence',
  address: '123 Main St',
  type: 'hvac-repair',
  urgency: 'same-day',
  description: 'AC not cooling, thermostat reads 85F'
})

// AI suggests the best technician
const assignment = await fsm.dispatch.recommend(job)
// -> { technician: 'Mike', eta: '2:30 PM', confidence: 0.94 }
```

### Intelligent Dispatch Board

Real-time dispatch with WebSocket updates:

```typescript
// Subscribe to dispatch board changes
fsm.dispatch.subscribe(board => {
  // Live updates as jobs move, techs report status
  console.log(board.unassigned)  // Jobs needing techs
  console.log(board.enroute)     // Techs heading to jobs
  console.log(board.onsite)      // Active jobs
})
```

### Pricebook & Estimates

```typescript
// Generate professional estimates with your pricebook
const estimate = await fsm.estimates.create({
  job: job.id,
  options: [
    { name: 'Repair', items: ['capacitor-replacement', 'refrigerant-recharge'] },
    { name: 'Replace', items: ['ac-unit-3ton', 'installation-labor'] }
  ]
})

// AI-generated good-better-best options
const aiEstimate = await fsm.estimates.generate({
  job: job.id,
  diagnosis: 'Compressor failing, unit is 15 years old'
})
```

### Invoicing & Payments

```typescript
// Convert completed job to invoice
const invoice = await fsm.invoices.create({
  job: job.id,
  items: estimate.selectedOption.items,
  labor: { hours: 2.5, rate: 125 }
})

// Accept payment on-site
await fsm.payments.charge({
  invoice: invoice.id,
  method: 'card-present',  // Tap to pay
  amount: invoice.total
})
```

### GPS Fleet Tracking

```typescript
// Real-time technician locations
fsm.fleet.track(technicianId, location => {
  // Updates every 30 seconds (configurable)
  map.updateMarker(technicianId, location)
})

// Route optimization for the day
const routes = await fsm.routes.optimize({
  technicians: ['mike', 'sarah', 'dave'],
  jobs: todaysJobs,
  constraints: {
    maxDriveTime: 45,  // minutes between jobs
    lunchWindow: ['12:00', '13:00']
  }
})
```

### Inventory Management

```typescript
// Track parts on trucks and in warehouse
await fsm.inventory.use({
  technician: 'mike',
  part: 'capacitor-45/5',
  job: job.id
})

// Auto-reorder when low
fsm.inventory.setThreshold('capacitor-45/5', {
  warehouse: 20,
  truck: 3,
  supplier: 'grainger',
  autoOrder: true
})
```

## AI-Powered Dispatch

This isn't "AI" as a marketing checkbox. It's intelligence that makes contractors money.

### Smart Assignment

```typescript
// AI considers everything:
// - Technician skills and certifications
// - Current location and traffic
// - Job complexity and history
// - Customer preferences ("Sarah was great last time")
// - Profitability (senior tech for premium jobs)

const assignment = await fsm.dispatch.recommend(job)
```

### Route Optimization

```typescript
// Minimize drive time, maximize billable hours
await fsm.routes.optimize({
  objective: 'maximize-revenue',  // or 'minimize-fuel', 'balance-workload'
  constraints: {
    technicianHours: 8,
    priorityJobs: ['emergency', 'callback']
  }
})
```

### Job Duration Prediction

```typescript
// AI learns from your historical data
const prediction = await fsm.jobs.predictDuration({
  type: 'water-heater-install',
  equipment: 'rheem-50gal-gas',
  location: job.address
})
// -> { estimate: 3.5, confidence: 0.87, factors: ['older home', 'basement access'] }
```

### Automatic Scheduling

```typescript
// Customer self-books, AI slots them perfectly
fsm.scheduling.enableSelfBook({
  types: ['tune-up', 'estimate', 'maintenance'],
  availability: 'auto',  // AI manages the calendar
  confirmationChannel: 'sms'
})
```

## Offline-First

Contractors work in basements. Rural areas. Job sites with zero signal.

**servicetitan.do** works offline. Period.

```typescript
// Durable Objects maintain local state
// Changes sync automatically when connected

// On the job site (offline):
await fsm.jobs.update(job.id, {
  status: 'completed',
  notes: 'Replaced capacitor, tested operation',
  parts: ['capacitor-45/5']
})
// -> Stored locally, queued for sync

// Back in the truck (online):
// -> Syncs automatically, dispatch board updates
```

### How It Works

Each technician's device maintains a local Durable Object replica:

```
Phone/Tablet
  |
  v
[Local DO] <-- Works offline
  |
  v (when connected)
[Edge DO] --> [Central DO]
```

No "sync failed" errors. No lost work orders. No excuses.

## Real-Time

Everything updates instantly across all devices:

### WebSocket Dispatch Board

```typescript
// Office sees real-time status
fsm.dispatch.subscribe(update => {
  switch (update.type) {
    case 'tech-location':
      map.moveMarker(update.techId, update.coords)
      break
    case 'job-status':
      board.updateJob(update.jobId, update.status)
      break
    case 'new-job':
      board.addJob(update.job)
      playAlert('new-call')
      break
  }
})
```

### Customer Updates

```typescript
// Customers get Uber-style tracking
fsm.notifications.enable(job.id, {
  channels: ['sms', 'email'],
  events: ['tech-assigned', 'on-the-way', 'arriving-soon', 'completed']
})

// "Mike is 10 minutes away!"
```

### Team Communication

```typescript
// Instant messaging between office and field
fsm.chat.send({
  to: 'mike',
  message: 'Customer called - they found the leak under the sink',
  job: job.id
})
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

### Configuration

```typescript
// wrangler.toml
name = "my-hvac-company"
compatibility_date = "2024-01-01"

[vars]
COMPANY_NAME = "Johnson HVAC"
TIMEZONE = "America/Chicago"

[[durable_objects.bindings]]
name = "JOBS"
class_name = "JobDO"

[[durable_objects.bindings]]
name = "DISPATCH"
class_name = "DispatchDO"

[[durable_objects.bindings]]
name = "TECHNICIANS"
class_name = "TechnicianDO"
```

## Integrations

### Payments

```typescript
// Stripe Connect (payments.do)
fsm.payments.configure({
  provider: 'stripe',
  accountId: 'acct_xxx'
})
```

### Communication

```typescript
// Twilio for SMS
fsm.notifications.configure({
  sms: { provider: 'twilio', accountSid: 'xxx' }
})
```

### Accounting

```typescript
// QuickBooks sync
fsm.accounting.connect({
  provider: 'quickbooks',
  realmId: 'xxx'
})
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

- [x] Core job management
- [x] Dispatch board with WebSocket
- [x] Basic scheduling
- [ ] AI route optimization
- [ ] Pricebook builder
- [ ] QuickBooks integration
- [ ] Mobile apps (React Native)
- [ ] Membership/service agreement management
- [ ] Marketing automation

## License

MIT License. Use it, modify it, sell it, whatever.

Your business software shouldn't hold your business hostage.

---

<div align="center">

**Built with [workers.do](https://workers.do)**

*Workers work for you.*

</div>
