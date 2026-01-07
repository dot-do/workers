# yardi.do

<p align="center">
  <strong>Property Management. AI-Native. For Every Landlord.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/yardi.do"><img src="https://img.shields.io/npm/v/yardi.do.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/yardi.do"><img src="https://img.shields.io/npm/dm/yardi.do.svg" alt="npm downloads" /></a>
  <a href="https://github.com/drivly/yardi.do/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/yardi.do.svg" alt="license" /></a>
</p>

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

Property management through natural language:

```typescript
import { yardi, lexi } from 'yardi.do'

// Natural language property management
const vacant = await yardi`vacant 2br units under $3500`
const expiring = await yardi`leases expiring within 60 days`
const delinquent = await yardi`tenants 15+ days late on rent`

// Promise pipelining for leasing
const leased = await yardi`available units matching ${criteria}`
  .map(units => lexi`show to prospect ${prospect}`)
  .map(shown => lexi`answer questions about ${unit}`)
  .map(interested => yardi`create application for ${prospect}`)
  .map(app => yardi`screen and approve`)

// Rent collection automation
const collected = await yardi`process rent for ${propertyId}`
  .map(roll => yardi`generate owner statement`)
  .map(stmt => yardi`email to owners`)

// Event-driven automation
yardi.on('lease.expiring', async (lease) => {
  const market = await yardi`market rent for ${lease.unit}`
  await yardi`send renewal offer at ${market.suggested}`
})

yardi.on('payment.late', async (payment) => {
  await yardi`send reminder to ${payment.tenant}`
  if (payment.daysLate > 5) {
    await yardi`apply late fee to ${payment.lease}`
  }
})

yardi.on('maintenance.urgent', async (request) => {
  const vendor = await yardi`best vendor for ${request.category}`
  await yardi`dispatch ${vendor} to ${request.unit}`
})
```

### Lexi: Your AI Leasing Agent

Lexi handles the entire prospect journey:

```typescript
import { lexi } from 'yardi.do'

// Lexi responds to inquiries 24/7
lexi.on('inquiry', async (prospect) => {
  await lexi`
    Welcome ${prospect.name} and answer their questions.
    Show available units matching their needs.
    Schedule a tour if interested.
  `
})

// Virtual tours with Lexi
const tour = await lexi`
  Guide ${prospect} through unit ${unit}.
  Highlight the ${unit.features}.
  Close on application if ready.
`

// Lexi handles renewals
const renewed = await yardi`leases expiring in 60 days`
  .map(lease => lexi`send renewal offer to ${lease.tenant}`)
  .map(offer => lexi`follow up if no response in 7 days`)
  .map(accepted => yardi`generate renewal lease`)
```

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

### Properties & Units

Natural language property queries:

```typescript
import { yardi } from 'yardi.do'

// Query properties naturally
const properties = await yardi`my properties in San Francisco`
const vacant = await yardi`vacant units at Sunset Apartments`
const affordable = await yardi`2br units under $3000 with parking`

// Complex queries with pipelining
const marketAnalysis = await yardi`all my 1br units`
  .map(unit => yardi`market rent for ${unit}`)
  .map(analysis => yardi`units below market by 10%+`)

// Bulk operations
const rentRoll = await yardi`current rent roll for ${property}`
const occupancy = await yardi`occupancy rate by property`
const revenue = await yardi`monthly revenue trend for 2025`
```

### Tenants & Leases

Full tenant lifecycle with natural language:

```typescript
import { yardi, lexi } from 'yardi.do'

// Leasing pipeline: inquiry to move-in
const moved = await lexi`new inquiry from ${prospect} for 2br`
  .map(qualified => lexi`schedule tour for ${prospect}`)
  .map(toured => yardi`create application for ${prospect}`)
  .map(app => yardi`screen ${app}`)
  .map(approved => yardi`generate lease for unit ${unit}`)
  .map(signed => yardi`process move-in for ${tenant}`)

// Query tenants naturally
const expiring = await yardi`leases expiring this quarter`
const delinquent = await yardi`tenants with balance over $500`
const renewals = await yardi`tenants eligible for renewal`

// Automated renewal workflow
yardi.on('lease.expiring', async (lease) => {
  const market = await yardi`market rent for ${lease.unit}`
  const history = await yardi`payment history for ${lease.tenant}`

  if (history.onTimeRate > 0.95) {
    await yardi`offer renewal at ${market.current}` // No increase for good tenants
  } else {
    await yardi`offer renewal at ${market.suggested}`
  }
})

// Move-out processing
const moveout = await yardi`process move-out for ${tenant}`
  .map(inspection => yardi`assess damages`)
  .map(damages => yardi`calculate deposit return`)
  .map(refund => yardi`send deposit to ${tenant}`)
```

### Rent Collection & Payments

Automated rent collection with event-driven workflows:

```typescript
import { yardi } from 'yardi.do'

// Process rent with natural language
const collected = await yardi`process rent for ${property}`
const outstanding = await yardi`tenants with unpaid rent`
const delinquent = await yardi`accounts 15+ days past due`

// Full rent cycle with pipelining
const monthEnd = await yardi`process February rent`
  .map(collected => yardi`apply late fees after grace period`)
  .map(finalized => yardi`generate owner statements`)
  .map(statements => yardi`process owner distributions`)
  .map(distributed => yardi`email statements to owners`)

// Event-driven collections
yardi.on('payment.late', async (payment) => {
  await yardi`send friendly reminder to ${payment.tenant}`
})

yardi.on('payment.delinquent', async (payment) => {
  if (payment.daysLate > 5) {
    await yardi`apply late fee to ${payment.lease}`
    await yardi`send formal notice to ${payment.tenant}`
  }
  if (payment.daysLate > 15) {
    await yardi`escalate ${payment} to collections`
  }
})

yardi.on('payment.received', async (payment) => {
  await yardi`send receipt to ${payment.tenant}`
  await yardi`update ledger for ${payment.unit}`
})
```

### Maintenance & Work Orders

Event-driven maintenance from request to resolution:

```typescript
import { yardi } from 'yardi.do'

// Query maintenance naturally
const open = await yardi`open work orders at ${property}`
const urgent = await yardi`urgent maintenance requests`
const overdue = await yardi`work orders open more than 48 hours`

// Event-driven maintenance workflow
yardi.on('maintenance.request', async (request) => {
  // AI categorizes and routes automatically
  const vendor = await yardi`best vendor for ${request.category}`
  await yardi`dispatch ${vendor} to ${request.unit}`
  await yardi`notify tenant ${request.tenant} of scheduled visit`
})

yardi.on('maintenance.urgent', async (request) => {
  // Immediate dispatch for emergencies
  const available = await yardi`available vendors for ${request.category}`
  await yardi`emergency dispatch to ${request.unit}`
  await yardi`alert property manager about ${request}`
})

yardi.on('maintenance.completed', async (workOrder) => {
  await yardi`send completion survey to ${workOrder.tenant}`
  await yardi`update property maintenance log`
  await yardi`process vendor invoice for ${workOrder}`
})

// Preventive maintenance automation
yardi.on('schedule.monthly', async () => {
  await yardi`schedule pest control for all properties`
  await yardi`check HVAC filters due for replacement`
  await yardi`generate preventive maintenance report`
})
```

### AI Leasing Agent

Lexi is your 24/7 leasing office that never sleeps:

```typescript
import { yardi, lexi } from 'yardi.do'

// The complete leasing pipeline
const leased = await lexi`handle inquiry from ${prospect}`
  .map(qualified => lexi`schedule tour for ${prospect}`)
  .map(toured => lexi`answer questions about ${unit}`)
  .map(interested => yardi`create application for ${prospect}`)
  .map(app => yardi`screen and approve ${app}`)
  .map(approved => yardi`generate lease for ${unit}`)

// Lexi handles everything autonomously
lexi.on('inquiry', async (prospect) => {
  await lexi`
    Welcome ${prospect.name}.
    Answer questions about available ${prospect.preference} units.
    Schedule a tour if interested.
    Follow up in 24 hours if no response.
  `
})

lexi.on('tour.scheduled', async (tour) => {
  await lexi`
    Prepare for ${tour.prospect}'s visit.
    Review their preferences and budget.
    Highlight matching amenities.
    Be ready to close on application.
  `
})

lexi.on('application.approved', async (app) => {
  await lexi`
    Congratulate ${app.applicant} on approval.
    Explain next steps and move-in process.
    Schedule lease signing.
    Send welcome packet.
  `
})
```

### Tenant Portal

AI-powered self-service for tenants:

```typescript
import { yardi, lexi } from 'yardi.do'

// Natural language tenant support
yardi.on('portal.message', async (message) => {
  await lexi`
    Help ${message.tenant} with: "${message.text}"
    Check their lease, payment history, and open requests.
    Resolve if possible, escalate if needed.
  `
})

// Event-driven portal features
yardi.on('portal.payment', async (payment) => {
  await yardi`process payment from ${payment.tenant}`
  await yardi`send receipt to ${payment.tenant}`
})

yardi.on('portal.maintenance', async (request) => {
  await yardi`create work order for ${request.unit}`
  await lexi`confirm receipt with ${request.tenant}`
})

yardi.on('portal.renewal', async (request) => {
  const terms = await yardi`renewal terms for ${request.lease}`
  await lexi`present renewal offer to ${request.tenant}`
})

// Proactive tenant communication
yardi.on('package.delivered', async (pkg) => {
  await yardi`notify ${pkg.tenant} about package`
})

yardi.on('amenity.available', async (booking) => {
  await yardi`confirm ${booking.amenity} booking for ${booking.tenant}`
})
```

### Affordable Housing & Compliance

HUD, LIHTC, Section 8 - AI handles the complexity:

```typescript
import { yardi } from 'yardi.do'

// Natural language compliance queries
const eligible = await yardi`tenants due for income recertification`
const section8 = await yardi`units with Section 8 vouchers`
const lihtc = await yardi`LIHTC compliance status for ${property}`

// Automated certification workflow
const certified = await yardi`recertify ${tenant}`
  .map(docs => yardi`extract income from documents`)
  .map(income => yardi`calculate eligibility at 60% AMI`)
  .map(eligible => yardi`generate certification`)
  .map(cert => yardi`submit to HUD`)

// Event-driven compliance
yardi.on('certification.due', async (tenant) => {
  await yardi`send recertification notice to ${tenant}`
  await yardi`schedule appointment for document collection`
})

yardi.on('income.changed', async (tenant) => {
  const eligible = await yardi`check continued eligibility for ${tenant}`
  if (!eligible) {
    await yardi`notify ${tenant} of status change`
    await yardi`calculate phase-out rent schedule`
  }
})

yardi.on('hud.reporting', async (period) => {
  await yardi`generate Form 50059 for all Section 8 units`
  await yardi`submit HAP requests for ${period}`
  await yardi`reconcile voucher payments`
})

// Rent reasonableness with AI
const reasonable = await yardi`is $2800 reasonable for ${unit}?`
// { reasonable: true, comparables: 12, marketRange: [2650, 3100] }
```

### Financial Reporting

Natural language financials with pipelining:

```typescript
import { yardi } from 'yardi.do'

// Query financials naturally
const noi = await yardi`NOI for ${property} this quarter`
const aging = await yardi`accounts receivable aging report`
const cashflow = await yardi`cash flow forecast for next 6 months`

// Month-end close with pipelining
const closed = await yardi`close January books for ${property}`
  .map(closed => yardi`generate owner statements`)
  .map(stmts => yardi`calculate distributions`)
  .map(dist => yardi`process ACH to owners`)
  .map(paid => yardi`email statements to owners`)

// Event-driven financial automation
yardi.on('period.close', async (period) => {
  await yardi`reconcile bank accounts`
  await yardi`post accruals and deferrals`
  await yardi`generate financial package`
})

yardi.on('distribution.ready', async (property) => {
  const noi = await yardi`net operating income for ${property}`
  const reserves = await yardi`required reserves for ${property}`
  await yardi`distribute ${noi - reserves} to owners`
})

yardi.on('tax.season', async (year) => {
  await yardi`generate Schedule E for all properties`
  await yardi`calculate depreciation schedules`
  await yardi`prepare 1099s for vendors`
})
```

---

## API Compatibility

### Voyager-Compatible with AI Superpowers

Existing Yardi integrations work, plus natural language:

```typescript
import { yardi, lexi } from 'yardi.do'

// Traditional API still works
const properties = await yardi.properties.list()
const tenants = await yardi.tenants.search({ lastName: 'Chen' })

// But natural language is better
const properties = await yardi`my SF properties`
const tenants = await yardi`tenants named Chen`
const leases = await yardi`active leases over $3000/month`

// AI-powered bulk operations
await yardi`apply 3% rent increase to all renewals`
await yardi`schedule HVAC inspections for all units`
await yardi`generate year-end reports for all properties`
```

### Marketing with Lexi

AI-native listing syndication:

```typescript
import { yardi, lexi } from 'yardi.do'

// Syndication with natural language
await yardi`list ${unit} on Zillow, Apartments.com, and Facebook`

// AI-optimized listings
const listing = await lexi`
  Write compelling listing for ${unit}.
  Highlight ${unit.features}.
  Target young professionals.
`

// Event-driven lead handling
yardi.on('lead.new', async (lead) => {
  await lexi`qualify ${lead} and schedule tour if ready`
})

yardi.on('lead.stale', async (lead) => {
  await lexi`re-engage ${lead} with new availability`
})
```

### Migration from Yardi

One-command migration:

```bash
npx yardi.do migrate --from=voyager
```

```typescript
// Or migrate programmatically
const migrated = await yardi`migrate from Voyager`
  .map(properties => yardi`verify property data`)
  .map(verified => yardi`migrate tenant records`)
  .map(tenants => yardi`migrate financial history`)
  .map(financials => yardi`validate all data`)
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

### Individual Landlords

You own a duplex. You don't need Yardi. But you do need:

- Online rent collection
- Maintenance tracking
- Lease document generation
- Expense tracking for taxes

```bash
npx create-dotdo yardi --template=small-landlord
```

**Cost: Free.** Just your Cloudflare account.

### Property Management Companies

You manage 500 units across 20 properties. Yardi wants $6,000-15,000/year.

```bash
npx create-dotdo yardi --template=property-manager
```

**Cost: ~$50/month.** Cloudflare usage-based pricing.

### Affordable Housing Operators

You run LIHTC and Section 8 properties. Compliance is everything.

```bash
npx create-dotdo yardi --template=affordable-housing
```

**Cost: ~$100/month.** With full HUD compliance reporting.

### Real Estate Investment Trusts

You have 50,000 units. You're paying Yardi $1M+/year.

```bash
npx create-dotdo yardi --template=enterprise
```

**Cost: ~$2,000/month.** That's 98% savings.

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

Your property management software shouldn't cost more than your maintenance budget.

---

<p align="center">
  <strong>The property management monopoly ends here.</strong>
  <br />
  Your properties. Your tenants. Your data. Your platform.
  <br /><br />
  <a href="https://yardi.do">Website</a> |
  <a href="https://docs.yardi.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/yardi.do">GitHub</a>
</p>
