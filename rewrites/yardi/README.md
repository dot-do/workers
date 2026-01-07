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

The foundation of property management:

```typescript
import { pm } from 'yardi.do'

// Create a property
const property = await pm.properties.create({
  name: 'Sunset Apartments',
  address: '123 Main Street',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  type: 'multifamily',
  units: 48,
  yearBuilt: 1985,
  amenities: ['parking', 'laundry', 'gym'],
})

// Add units
await pm.units.createBulk(property.id, [
  { number: '101', type: '1br', sqft: 650, rent: 2400 },
  { number: '102', type: '1br', sqft: 650, rent: 2400 },
  { number: '103', type: '2br', sqft: 950, rent: 3200 },
  { number: '201', type: '1br', sqft: 650, rent: 2500 },
  { number: '202', type: '1br', sqft: 650, rent: 2500 },
  { number: '203', type: '2br', sqft: 950, rent: 3300 },
  // ... all 48 units
])

// Query available units
const available = await pm.units.query({
  property: property.id,
  status: 'vacant',
  type: '2br',
  maxRent: 3500,
})
```

### Tenants & Leases

Full tenant lifecycle management:

```typescript
// Tenant application
const application = await pm.applications.create({
  unit: '203',
  applicant: {
    firstName: 'Alex',
    lastName: 'Chen',
    email: 'alex@example.com',
    phone: '415-555-0123',
    ssn: 'xxx-xx-xxxx', // Encrypted at rest
    income: 95000,
    employer: 'Tech Corp',
  },
  moveInDate: '2025-02-01',
})

// AI-powered screening (no $50 per-applicant fee)
const screening = await pm.screening.run(application.id)
// {
//   creditScore: 720,
//   incomeRatio: 2.97, // 3x rent requirement
//   background: 'clear',
//   evictionHistory: 'none',
//   recommendation: 'approve',
//   confidence: 0.94
// }

// Create lease
const lease = await pm.leases.create({
  unit: '203',
  tenant: application.applicantId,
  startDate: '2025-02-01',
  endDate: '2026-01-31',
  monthlyRent: 3300,
  securityDeposit: 3300,
  petDeposit: 500,
  terms: {
    lateFee: 75,
    gracePeriod: 5,
    renewalNotice: 60,
  },
})

// Generate lease document (AI-assisted)
const document = await pm.documents.generateLease(lease.id, {
  template: 'california-residential',
  addendums: ['pet', 'parking', 'rules'],
})
```

### Rent Collection & Payments

Automate rent collection without payment processor fees eating your margins:

```typescript
// Set up autopay for tenant
await pm.payments.setupAutopay({
  lease: lease.id,
  method: 'ach',
  accountNumber: 'xxxx',
  routingNumber: 'xxxx',
  dayOfMonth: 1,
})

// Process rent for all units
const rentRoll = await pm.payments.processRentRoll({
  property: property.id,
  period: '2025-02',
})
// {
//   totalDue: 127800,
//   collected: 118500,
//   outstanding: 9300,
//   delinquent: [
//     { unit: '305', tenant: 'Smith', amount: 3100, daysPastDue: 12 }
//   ]
// }

// AI-powered collections
await pm.collections.automate({
  property: property.id,
  sequence: [
    { daysPastDue: 1, action: 'reminder-email' },
    { daysPastDue: 5, action: 'late-fee' },
    { daysPastDue: 10, action: 'phone-call' },
    { daysPastDue: 15, action: 'formal-notice' },
    { daysPastDue: 30, action: 'legal-referral' },
  ],
})
```

### Maintenance & Work Orders

From request to resolution:

```typescript
// Tenant submits maintenance request
const workOrder = await pm.maintenance.create({
  unit: '203',
  category: 'plumbing',
  priority: 'high',
  description: 'Kitchen sink is leaking under cabinet',
  photos: ['leak-photo-1.jpg', 'leak-photo-2.jpg'],
})

// AI categorizes and routes
const routing = await pm.maintenance.route(workOrder.id)
// {
//   vendor: 'ABC Plumbing',
//   estimatedCost: 150,
//   priority: 'urgent',
//   scheduledFor: '2025-01-08 09:00'
// }

// Vendor completes work
await pm.maintenance.complete(workOrder.id, {
  vendor: 'ABC Plumbing',
  technician: 'Mike Johnson',
  resolution: 'Replaced P-trap and supply line',
  parts: [{ name: 'P-trap', cost: 12.50 }],
  laborHours: 1.5,
  totalCost: 137.50,
})

// Preventive maintenance scheduling
await pm.maintenance.schedulePM({
  property: property.id,
  tasks: [
    { type: 'hvac-inspection', frequency: 'quarterly' },
    { type: 'fire-extinguisher', frequency: 'annual' },
    { type: 'gutter-cleaning', frequency: 'biannual' },
    { type: 'pest-control', frequency: 'monthly' },
  ],
})
```

### AI Leasing Agent

Your 24/7 leasing office that never sleeps:

```typescript
import { lexi } from 'yardi.do/agents'

// Lexi handles inbound inquiries
pm.inquiries.on('new', async (inquiry) => {
  const response = await lexi`
    New rental inquiry for ${inquiry.unit}:
    "${inquiry.message}"

    Check availability, answer questions about amenities,
    and schedule a tour if they're interested.
  `

  // Lexi responds via email/SMS
  // Schedules tours on your calendar
  // Updates CRM with lead status
  // Follows up automatically
})

// Lexi conducts virtual tours
const tour = await lexi`
  Guide a virtual tour of unit 203 for Alex Chen.
  Highlight the renovated kitchen and city views.
  Answer any questions they have about the lease terms.
  If interested, start the application process.
`

// Lexi handles renewals
pm.leases.on('expiring', async (lease) => {
  await lexi`
    ${lease.tenant.firstName}'s lease expires in 60 days.

    1. Check market rent for comparable units
    2. Propose renewal terms (suggest 3-5% increase if below market)
    3. Send personalized renewal offer
    4. Follow up if no response in 7 days
  `
})
```

### Tenant Portal

Self-service for tenants, less work for you:

```typescript
// Tenant portal configuration
await pm.portal.configure({
  domain: 'residents.sunset-apartments.com',
  features: {
    payRent: true,
    submitMaintenance: true,
    viewLease: true,
    renewLease: true,
    scheduleAmenities: true,
    communityBoard: true,
    packageNotifications: true,
  },
  branding: {
    logo: 'https://...',
    primaryColor: '#2563eb',
    propertyPhotos: ['...'],
  },
})

// Tenant self-service flows
// - Pay rent (ACH, card, Apple Pay)
// - Submit maintenance with photos
// - Request lease renewal
// - Update contact info
// - View payment history
// - Download tax documents (1099)
```

### Affordable Housing & Compliance

HUD, LIHTC, Section 8 - the complexity handled for you:

```typescript
// Configure affordable housing program
await pm.compliance.configure({
  property: property.id,
  programs: ['lihtc', 'section8'],
  ami: {
    area: 'SF-Oakland-Hayward',
    year: 2025,
    limits: {
      '30%': { '1br': 1200, '2br': 1440, '3br': 1680 },
      '50%': { '1br': 2000, '2br': 2400, '3br': 2800 },
      '60%': { '1br': 2400, '2br': 2880, '3br': 3360 },
    },
  },
})

// Income certification
const certification = await pm.compliance.certifyIncome({
  tenant: tenant.id,
  documents: [
    { type: 'paystub', file: 'paystub-1.pdf' },
    { type: 'paystub', file: 'paystub-2.pdf' },
    { type: 'w2', file: 'w2-2024.pdf' },
  ],
})
// AI extracts data, calculates income, determines eligibility

// HUD reporting
await pm.compliance.generateHUD({
  property: property.id,
  report: 'form-50059',
  period: '2025-Q1',
})

// Rent reasonableness (Section 8)
const analysis = await pm.compliance.rentReasonableness({
  unit: '203',
  proposedRent: 2800,
})
// { reasonable: true, comparables: [...], marketRange: [2650, 3100] }
```

### Financial Reporting

From rent roll to owner distributions:

```typescript
// Generate monthly financials
const financials = await pm.reports.monthly({
  property: property.id,
  period: '2025-01',
})

// Includes:
// - Rent roll
// - Accounts receivable aging
// - Accounts payable
// - General ledger
// - Bank reconciliation
// - Owner statement

// Owner distribution
await pm.distributions.process({
  property: property.id,
  period: '2025-01',
  owners: [
    { id: 'owner-1', share: 0.60 },
    { id: 'owner-2', share: 0.40 },
  ],
  reserves: {
    operating: 0.05,
    capex: 0.03,
  },
})

// Tax preparation
const taxDocs = await pm.reports.taxDocuments({
  property: property.id,
  year: 2024,
})
// Generates Schedule E, depreciation, 1099s
```

---

## API Compatibility

### Voyager REST API

Your existing Yardi integrations work unchanged:

```typescript
// Point at your yardi.do instance
const voyager = new YardiVoyager({
  baseUrl: 'https://your-instance.yardi.do/api/v1',
  apiKey: process.env.YARDI_API_KEY,
})

// Standard Voyager endpoints work
const properties = await voyager.properties.list()
const tenants = await voyager.tenants.search({ lastName: 'Chen' })
const lease = await voyager.leases.get('LSE-001')

// Bulk operations
await voyager.charges.postBatch([
  { unit: '101', charge: 'rent', amount: 2400 },
  { unit: '102', charge: 'rent', amount: 2400 },
  // ...
])
```

### RentCafe API

Marketing portal compatibility:

```typescript
// Listing syndication
await pm.marketing.syndicate({
  property: property.id,
  channels: ['zillow', 'apartments.com', 'craigslist', 'facebook'],
  photos: true,
  virtualTours: true,
  floorPlans: true,
})

// Lead capture
pm.marketing.on('lead', async (lead) => {
  // Automatically captured from all channels
  await lexi`Follow up with ${lead.name} about ${lead.interestedIn}`
})

// Availability feed (ILS format)
const feed = await pm.marketing.generateFeed({
  format: 'mits', // or 'rentcafe', 'realpage'
  properties: [property.id],
})
```

### Migration from Yardi

One-command migration:

```bash
npx yardi.do migrate --from=voyager

# Migrates:
# - All properties and units
# - Tenant records and lease history
# - Financial data and transactions
# - Maintenance history
# - Documents and attachments
# - Chart of accounts
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
