# yardi.do

<p align="center">
  <strong>Property Management. AI-Native. For Every Landlord.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/yardi.do"><img src="https://img.shields.io/npm/v/yardi.do.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/yardi.do"><img src="https://img.shields.io/npm/dm/yardi.do.svg" alt="npm downloads" /></a>
  <a href="https://github.com/drivly/yardi.do/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/yardi.do.svg" alt="license" /></a>
</p>

```typescript
import { yardi } from 'yardi.do'

await yardi`lease the 2br to John`
await yardi`collect rent`
await yardi`fix the leak in 4B`
```

That's it. Screening, payments, maintenance - automatic.

---

Yardi Systems dominates property management software. They charge $1-3 per unit per month. For a 500-unit property, that's $6,000-18,000/year. For a portfolio of 10,000 units, you're looking at $120,000-360,000 annually. Implementation takes 6-12 months. You're locked in forever.

**yardi.do** is the open-source alternative. Deploy your own property management platform in one click. Voyager-compatible APIs. RentCafe-style tenant portals. AI-native leasing. Your properties, your data, your rules.

## The Problem

Property management software has become a tax on housing:

| What Yardi Charges | The Real Cost |
|-------------------|---------------|
| **Voyager License** | $1-3/unit/month |
| **RentCafe Marketing** | +$0.50-1.50/unit/month |
| **Online Payments** | +$0.25-0.75/unit/month |
| **Maintenance Portal** | +$0.25-0.50/unit/month |
| **Screening Services** | $25-50/application |
| **Implementation** | $10,000-100,000+ |
| **Annual Support** | 18-22% of license fees |

**A 1,000-unit portfolio with full Yardi stack: $36,000-72,000/year.**

And that's just the software. Add consultants, training, data migration, and the army of employees needed to operate the system.

### The Monopoly Problem

Yardi owns 50%+ of the property management software market. Their competitors (RealPage, AppFolio, Entrata) charge similar prices. The result:

- **Landlords pass costs to tenants** - Software fees become part of rent
- **Small landlords are priced out** - A 10-unit building can't afford $500/month for software
- **Affordable housing suffers most** - HUD compliance adds complexity and cost
- **Innovation stagnates** - When you're a monopoly, why improve?

### The Data Prison

Your property data is trapped:

- **Proprietary formats** - Can't export to anything useful
- **API access costs extra** - Want to integrate? Pay more.
- **Vendor lock-in by design** - Switching means rebuilding everything
- **Your tenants are their leads** - Yardi sells renter data to competitors

## The Solution

**yardi.do** reimagines property management for the AI era:

```
Traditional Yardi              yardi.do
-----------------------------------------------------------------
$1-3/unit/month               $0 - run your own
18-month implementation       60-second deployment
Voyager complexity            Clean TypeScript API
RentCafe premium              AI-native tenant portal
Proprietary data              Your SQLite, your R2
Mainframe mentality           Edge-native, global
Annual contracts              MIT licensed forever
```

---

## AI-Native API

Property management as conversation.

### Walking the Property

```typescript
import { yardi } from 'yardi.do'

// Morning walkthrough
await yardi`what's vacant?`
await yardi`who's late?`
await yardi`anything urgent?`

// You see a problem
await yardi`handle the leak in 4B`

// Prospect shows up
await yardi`lease the 2br to John`

// End of day
await yardi`what did we get done today?`
```

Every command a property manager would actually say. No IDs. No parameters. Just intent.

### Intent Drives Workflow

What you say becomes what happens:

| You Say | What Happens |
|---------|--------------|
| `lease 4B to Maria` | Credit check, background, income verify, lease gen, move-in packet, key handoff |
| `collect rent` | Process ACH, apply late fees, send reminders, update ledgers, notify owners |
| `fix the AC in 2A` | Categorize, find vendor, dispatch, track, notify tenant, invoice, close |
| `renew the good ones` | Identify expiring, check payment history, calculate market, send offers |
| `close the month` | Reconcile, post accruals, generate statements, calculate distributions, send |

The complexity is hidden. You just talk.

### Lexi: Your AI Leasing Agent

Your 24/7 leasing office:

```typescript
import { lexi } from 'yardi.do'

await lexi`show John the 2br units`
await lexi`fill our vacancies`
await lexi`follow up with yesterday's tours`
```

Lexi qualifies, schedules, answers questions, and closes. You approve.

---

## One-Click Deploy

```bash
npx create-dotdo yardi
```

That's it. Your own property management platform. Running on Cloudflare's global edge.

```typescript
import { PropertyManager } from 'yardi.do'

export default PropertyManager({
  name: 'my-properties',
  domain: 'properties.my-company.com',
})
```

Or deploy manually:

```bash
git clone https://github.com/dotdo/yardi.do
cd yardi.do
npm install
npm run deploy
```

Your own Yardi. In 60 seconds. Forever.

---

## Features

### The Property Manager's Voice

Say it like you'd say it:

```typescript
import { yardi } from 'yardi.do'

// Questions
await yardi`what's vacant?`
await yardi`who hasn't paid?`
await yardi`anything need my attention?`

// Commands
await yardi`lease 4B to the Chens`
await yardi`collect rent`
await yardi`fix the AC in 2A`
await yardi`renew the good ones`
await yardi`close the month`

// Context-aware
await yardi`move them in Saturday`        // Knows who "them" is
await yardi`raise it $50`                 // Knows what "it" is
await yardi`send him a reminder`          // Knows who "him" is
```

### Tenants & Leases

```typescript
await yardi`lease 4B to Maria`              // Full workflow automatic
await yardi`move out the Johnsons`          // Inspection, deposit, turnover
await yardi`renew Sarah at $50 above`       // She's been difficult
await yardi`renew the good ones as-is`      // Reward loyalty
await yardi`who's moving out next month?`
```

### Rent

```typescript
await yardi`collect rent`                   // That's it
await yardi`who owes?`
await yardi`send final notice to 7`
await yardi`pay the owners`
```

### Maintenance

```typescript
await yardi`fix 4B's leak`                  // Dispatch, track, bill
await yardi`what's overdue?`
await yardi`schedule inspections`
```

### Compliance

HUD, LIHTC, Section 8 - the hard stuff:

```typescript
await yardi`recertify the Garcias`          // Income, eligibility, forms
await yardi`who needs recertification?`
await yardi`submit to HUD`
await yardi`are we compliant?`
```

### Financials

```typescript
await yardi`how's Sunset doing?`            // NOI, occupancy, trends
await yardi`close January`                  // Full month-end
await yardi`pay the owners`
await yardi`get ready for taxes`            // Schedule E, 1099s, depreciation
```

---

## API Compatibility

### Voyager Compatible

Existing integrations work. But you won't need them:

```typescript
// The old way still works
const properties = await yardi.properties.list()
const tenants = await yardi.tenants.search({ lastName: 'Chen' })

// The new way is better
await yardi`find the Chens`
await yardi`raise rent 3% on renewals`
await yardi`list the vacant units`
```

### Migration

```bash
npx yardi.do migrate --from=voyager
```

Or just:

```typescript
await yardi`bring over my Voyager data`
```

---

## Architecture

### Durable Object per Property

Each property runs in a dedicated Durable Object:

```
                    +---------------------------------------------+
                    |              yardi.do Worker                 |
                    +---------------------------------------------+
                                         |
            +----------------------------+----------------------------+
            |                            |                            |
            v                            v                            v
    +---------------+           +---------------+           +---------------+
    | PropertyDO    |           | PropertyDO    |           | PropertyDO    |
    | Sunset Apts   |           | Oak Manor     |           | Pine Heights  |
    +---------------+           +---------------+           +---------------+
            |                            |                            |
            v                            v                            v
    +---------------+           +---------------+           +---------------+
    | - Units       |           | - Units       |           | - Units       |
    | - Tenants     |           | - Tenants     |           | - Tenants     |
    | - Leases      |           | - Leases      |           | - Leases      |
    | - Payments    |           | - Payments    |           | - Payments    |
    | - WorkOrders  |           | - WorkOrders  |           | - WorkOrders  |
    +---------------+           +---------------+           +---------------+
            |                            |                            |
    +-------+-------+            +-------+-------+            +-------+
    |               |            |               |            |
    v               v            v               v            v
+--------+     +--------+   +--------+     +--------+   +--------+
| SQLite |     |   R2   |   | SQLite |     |   R2   |   | SQLite |
| (hot)  |     | (docs) |   | (hot)  |     | (docs) |   | (hot)  |
+--------+     +--------+   +--------+     +--------+   +--------+
```

### Durable Objects

| Object | Scope | State |
|--------|-------|-------|
| `PropertyDO` | Per property | Units, common areas, amenities |
| `TenantDO` | Per tenant | Profile, lease history, payment history |
| `LeaseDO` | Per lease | Terms, documents, renewal status |
| `MaintenanceDO` | Per property | Work orders, vendor relationships |
| `FinancialDO` | Per property | GL, transactions, reporting |
| `PortalDO` | Per property | Tenant portal, resident services |

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite in DO | Active leases, current tenants | <10ms |
| **Warm** | R2 | Documents, photos, historical data | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

### Multi-Tenancy

```
sunset.yardi.do           <- Sunset Apartments
oakmanor.yardi.do         <- Oak Manor
portfolio.yardi.do        <- Multi-property portfolio view
```

Each property is completely isolated:
- Separate Durable Object
- Separate SQLite database
- Separate document storage
- No data mixing, ever

---

## Use Cases

### You Own a Duplex

```typescript
await yardi`collect rent`
await yardi`handle the furnace issue`
await yardi`get ready for taxes`
```

**Cost: Free.**

### You Manage 500 Units

```typescript
await yardi`what needs my attention today?`
await yardi`close out the month`
await yardi`renew everyone coming up`
```

**Cost: ~$50/month.** (Yardi wants $15,000/year)

### You Run Affordable Housing

```typescript
await yardi`recertify everyone due this month`
await yardi`submit to HUD`
await yardi`are we compliant?`
```

**Cost: ~$100/month.** With full HUD compliance.

### You Have 50,000 Units

```typescript
await yardi`portfolio performance this quarter`
await yardi`underperforming properties`
await yardi`optimize rents across the portfolio`
```

**Cost: ~$2,000/month.** (You're paying Yardi $1M+/year)

---

## Comparison

| Feature | Yardi Voyager | yardi.do |
|---------|---------------|----------|
| **Starting Price** | $1-3/unit/month | $0 (self-host) |
| **Implementation** | 6-12 months | 60 seconds |
| **AI Leasing** | Premium add-on | Included |
| **Tenant Portal** | Extra cost | Included |
| **Online Payments** | Extra cost | Included |
| **Affordable Housing** | Extra cost | Included |
| **Data Ownership** | Theirs | Yours |
| **API Access** | Extra cost | Unlimited |
| **Open Source** | No | MIT License |
| **Contracts** | Multi-year | None |

---

## Pricing

### Self-Hosted

**Free forever.** MIT license. Your data, your servers.

### Managed (yardi.do cloud)

| Plan | Units | Price | Includes |
|------|-------|-------|----------|
| **Starter** | Up to 10 | $0/month | Everything |
| **Landlord** | Up to 100 | $29/month | Everything |
| **Manager** | Up to 1,000 | $199/month | Everything + support |
| **Enterprise** | Unlimited | $0.10/unit/month | Everything + SLA |

No per-unit fees that scale linearly. No surprise charges. No nickel-and-diming.

---

## Roadmap

### Completed

- [x] Properties and units management
- [x] Tenant records and profiles
- [x] Lease creation and management
- [x] Rent collection (ACH, card)
- [x] Maintenance work orders
- [x] Basic financial reporting
- [x] Tenant portal
- [x] AI leasing agent

### In Progress

- [ ] Voyager API compatibility layer
- [ ] RentCafe marketing integration
- [ ] HUD compliance reporting
- [ ] Section 8 HAP processing
- [ ] LIHTC certification workflows

### Planned

- [ ] Utility billing (RUBS)
- [ ] Parking management
- [ ] Package lockers integration
- [ ] Smart lock integration
- [ ] Insurance tracking
- [ ] Eviction workflow automation
- [ ] Market rent analysis
- [ ] CapEx planning

---

## Contributing

yardi.do is open source under the MIT license. Contributions welcome.

```bash
git clone https://github.com/dotdo/yardi.do
cd yardi.do
pnpm install
pnpm test
pnpm dev
```

Key contribution areas:
- Voyager API compatibility
- Affordable housing compliance
- Payment processor integrations
- AI/MCP leasing tools
- Documentation

---

## License

MIT License - Use it however you want.

---

<p align="center">
  <strong>Talk to your properties.</strong>
  <br /><br />
  <a href="https://yardi.do">Website</a> |
  <a href="https://docs.yardi.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/yardi.do">GitHub</a>
</p>
