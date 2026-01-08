# coupa.do

> Procurement + Spend Management. AI-native. Control your spend.

Coupa built a $8B company (acquired by Thoma Bravo) managing enterprise procurement - purchase orders, invoices, supplier management. At $150-300 per user per month, with implementations running $500K-2M, the "Business Spend Management" platform has become its own budget line item.

**coupa.do** is the open-source alternative. One-click deploy your own procurement platform. AI that actually finds savings. No per-seat ransomware.

## AI-Native API

```typescript
import { coupa } from 'coupa.do'           // Full SDK
import { coupa } from 'coupa.do/tiny'      // Minimal client
import { coupa } from 'coupa.do/p2p'       // Procure-to-pay only
```

Natural language for procurement workflows:

```typescript
import { coupa } from 'coupa.do'

// Talk to it like a procurement manager
const pending = await coupa`POs pending approval over $10k`
const maverick = await coupa`off-contract spend by department this quarter`
const savings = await coupa`find me $500k in savings this year`

// Chain like sentences
await coupa`contracts expiring Q2`
  .map(contract => coupa`prepare renewal brief for ${contract}`)

// Procure-to-pay in one flow
await coupa`requisition 5 laptops for Engineering`
  .approve()      // routes based on amount and policy
  .order()        // generates PO to preferred vendor
  .receive()      // confirms delivery
  .pay()          // three-way match and payment
```

## The Problem

Procurement software that costs as much as the procurement team:

- **$150-300/user/month** - A 200-person procurement org? $360K-720K annually
- **$500K-2M implementation** - Before you process a single PO
- **Per-transaction fees** - Additional charges for supplier network, e-invoicing
- **AI as premium upsell** - Spend intelligence costs extra
- **Supplier network lock-in** - Your suppliers locked into their network
- **Consultant dependency** - Change a workflow? Call Deloitte

Companies implement procurement systems to control spend. Then spend a fortune on the procurement system.

## The Solution

**coupa.do** returns procurement to procurement:

```
Coupa                           coupa.do
-----------------------------------------------------------------
$150-300/user/month             $0 - run your own
$500K-2M implementation         Deploy in hours
Supplier network fees           Your suppliers, direct
AI as premium tier              AI-native from day one
Consultant dependency           Configure yourself
Proprietary workflows           Open, customizable
```

## One-Click Deploy

```bash
npx create-dotdo coupa
```

A full procurement platform. Running on infrastructure you control. Every user, every supplier, no per-seat pricing.

```typescript
import { Coupa } from 'coupa.do'

export default Coupa({
  name: 'acme-procurement',
  domain: 'procurement.acme.com',
})
```

## Features

### Requisitions

Request what you need:

```typescript
import { coupa } from 'coupa.do'

// Just ask for it
await coupa`5 MacBook Pro M3 Max for Q1 hires, deliver to HQ IT closet by Feb 15`

// AI figures out supplier, pricing, coding, routing
await coupa`office supplies for marketing, about $500`

// Bulk requests read like a shopping list
await coupa`
  Engineering needs:
  - 10 monitors for new hires
  - standing desks for the Austin office
  - ergonomic keyboards, same as last order
`
```

### Approvals

Approvals flow naturally:

```typescript
// Check what needs your attention
await coupa`my pending approvals`
await coupa`urgent approvals over $50k`

// Approve with context
await coupa`approve REQ-001, consolidate with Q2 order if possible`
await coupa`reject REQ-002, use preferred vendor instead`
await coupa`return REQ-003 to Sarah for more detail`

// Delegation when you're out
await coupa`delegate my approvals to Mike for two weeks`
```

### Purchase Orders

POs in plain English:

```typescript
// Create PO from approved requisition
await coupa`create PO for REQ-001 to Apple, Net 30, ship to SF office`

// Or generate directly
await coupa`PO to Dell for 20 laptops from the IT equipment contract`

// Check status
await coupa`open POs for Engineering this month`
await coupa`POs pending supplier acknowledgment`

// Receiving is one line
await coupa`received all items on PO-001`
await coupa`received 5 of 10 monitors on PO-002, rest backordered`
```

### Invoices

Three-way matching in natural language:

```typescript
// Process incoming invoices
await coupa`match invoice from Apple INV-2025-001234`

// Query invoice status
await coupa`invoices not matched to POs`
await coupa`invoices pending approval over $10k`
await coupa`overdue invoices by supplier`

// Handle exceptions naturally
await coupa`why won't INV-001 match?`
await coupa`approve INV-001 despite price variance, vendor raised prices`

// Payment scheduling
await coupa`schedule INV-001 for early pay discount`
await coupa`hold payment on INV-002 until quality issue resolved`
```

### Supplier Management

Know your suppliers:

```typescript
// Find and query suppliers
await coupa`our top 10 suppliers by spend`
await coupa`suppliers in IT Equipment category`
await coupa`which suppliers have declining scores?`

// Onboard naturally
await coupa`add Apple as IT Equipment vendor, enterprise@apple.com`
await coupa`request W-9 and insurance certificate from Apple`

// Performance tracking
await coupa`Apple scorecard`
await coupa`suppliers with late delivery issues this quarter`
await coupa`suppliers with expiring certifications`
```

### Contracts

Contract management without the forms:

```typescript
// Query contracts
await coupa`contracts expiring in 90 days`
await coupa`our agreement with Apple`
await coupa`contracts with volume discounts we're not hitting`

// Contract intelligence
await coupa`which contracts have renewal leverage?`
await coupa`off-contract spend by category this quarter`
await coupa`are we getting the contracted price on PO-001?`

// Renewal prep
await coupa`prepare negotiation brief for Apple renewal`
```

### Catalogs

Shopping from approved sources:

```typescript
// Browse what's available
await coupa`show me approved laptops`
await coupa`office supplies catalog`
await coupa`what can I buy from Amazon Business?`

// Smart recommendations
await coupa`I need a laptop for a new developer`
// AI suggests: "MacBook Pro 16" M3 Max from Apple contract at $3,499
//              - 15% discount vs list
//              - 2-day delivery available
//              - 47 others ordered this quarter"
```

## Spend Analytics

Ask questions about your spend:

```typescript
// Understand where money goes
await coupa`spend by category this year`
await coupa`top 20 suppliers by spend`
await coupa`IT spend trend last 12 months`

// Find savings opportunities
await coupa`maverick spend by department this quarter`
await coupa`contracts we're underutilizing`
await coupa`duplicate purchases across departments`

// Executive dashboards
await coupa`spend summary for the board`
await coupa`year-over-year savings from procurement`
```

## AI-Native Procurement

### Procurement Intelligence

```typescript
// One question unlocks insights
await coupa`find me $500K in savings this year`
// AI analyzes spend patterns, contract leverage, pricing variance,
// maverick spend, and early pay discounts - returns actionable plan

// Continuous monitoring
await coupa`supplier risk alerts`
await coupa`contracts expiring without coverage`
await coupa`price increases above inflation`
```

### Invoice Automation

```typescript
// Drop in an invoice, AI handles the rest
await coupa`process invoice from Apple`
  .match()     // three-way match to PO and receipt
  .code()      // GL coding from patterns
  .approve()   // auto-approve if clean

// Exception handling
await coupa`invoices with matching exceptions`
  .map(inv => coupa`explain why ${inv} won't match`)
```

### Negotiation Support

```typescript
import { sally } from 'agents.do'

// Prep for renewals in one line
await sally`prepare Salesforce renewal brief, current spend $450K`
// Returns: market benchmarks, leverage points, target pricing, BATNA

// Bulk renewal prep
await coupa`contracts expiring Q2`
  .map(contract => sally`negotiation brief for ${contract}`)
```

### Supplier Risk Monitoring

```typescript
import { tom } from 'agents.do'

// Continuous risk assessment
await tom`assess risk across our top 50 suppliers`

// Alert on changes
await coupa`suppliers with credit downgrades`
await coupa`single-source categories`
await coupa`suppliers with expiring SOC 2 certs`
```

### Smart Recommendations

```typescript
import { priya } from 'agents.do'

// AI suggests based on context
await priya`recommend laptops for 10 new hires`
// Returns options ranked by value, performance, compliance
// with pricing, availability, and approval requirements
```

## Architecture

### Durable Object per Company

```
CompanyDO (config, users, approval rules)
  |
  +-- RequisitionsDO (purchase requests)
  |     |-- SQLite: Requisition data
  |     +-- R2: Attachments
  |
  +-- PurchaseOrdersDO (POs)
  |     |-- SQLite: PO data, status
  |     +-- R2: PO documents
  |
  +-- InvoicesDO (invoices, matching)
  |     |-- SQLite: Invoice data
  |     +-- R2: Invoice images/PDFs
  |
  +-- SuppliersDO (supplier master)
  |     |-- SQLite: Supplier data
  |     +-- R2: Supplier documents
  |
  +-- AnalyticsDO (spend analytics)
        |-- SQLite: Aggregated spend
        +-- R2: Data warehouse
```

### Integrations

Connect to your systems naturally:

```typescript
// ERP sync just works
await coupa`sync vendors and GL accounts from NetSuite`
await coupa`push approved POs to SAP`

// Supplier portal included
await coupa`enable supplier portal for our vendors`
// Suppliers can view POs, submit invoices, check payment status
```

## vs Coupa

| Feature | Coupa | coupa.do |
|---------|-------|----------|
| **Per-User Cost** | $150-300/month | $0 - run your own |
| **Implementation** | $500K-2M | Deploy in hours |
| **Supplier Network** | Locked to their network | Your suppliers, direct |
| **AI/Analytics** | Premium upsell | AI-native from day one |
| **Customization** | Consultant required | Configure yourself |
| **Data Location** | Their cloud | Your Cloudflare account |
| **Workflow Changes** | Change request process | Code it yourself |
| **API Access** | Limited, extra cost | Full access, open |
| **Lock-in** | Years of migration | MIT licensed |

## Why Open Source for Procurement?

**1. Procurement Is Universal**

Every company buys things. The process is well-understood:
- Request -> Approve -> Order -> Receive -> Pay
- No competitive advantage in the software itself
- Value is in the process and data

**2. Data Is Strategic**

Your spend data reveals:
- Business strategy
- Supplier relationships
- Cost structure
- Negotiating positions

This shouldn't live on a third-party platform.

**3. Integration Hell**

Procurement touches everything:
- ERP for financials
- HR for approvals
- IT for assets
- Legal for contracts

Open source = integrate without permission.

**4. AI Needs Access**

To find savings, optimize payments, assess risk - AI needs full access to:
- Spend data
- Contracts
- Supplier information
- Historical patterns

Closed platforms gatekeep this data.

**5. Per-Seat Pricing Is Extractive**

Procurement should have MORE users, not fewer:
- Requestors across the company
- Approvers at all levels
- Receivers in warehouses
- AP clerks processing invoices

Per-seat pricing creates friction against adoption.

## Deployment

### Cloudflare Workers

```bash
npx create-dotdo coupa
# Global deployment
# Fast for every user
```

### Self-Hosted

```bash
# Docker
docker run -p 8787:8787 dotdo/coupa

# Kubernetes
kubectl apply -f coupa-do-deployment.yaml
```

### Hybrid

```typescript
// Edge for fast user experience, origin for heavy analytics
await coupa`run requisitions and approvals at the edge`
await coupa`run analytics on origin for heavy queries`
```

## Roadmap

### Procurement
- [x] Requisitions
- [x] Approvals
- [x] Purchase Orders
- [x] Receiving
- [x] Three-Way Match
- [ ] Blanket Orders
- [ ] RFx (RFQ/RFP/RFI)

### Suppliers
- [x] Supplier Master
- [x] Supplier Portal
- [x] Supplier Qualification
- [x] Performance Scorecards
- [ ] Supplier Diversity
- [ ] Risk Monitoring

### Invoices
- [x] Invoice Processing
- [x] Three-Way Match
- [x] Exception Handling
- [x] Payment Scheduling
- [ ] Virtual Cards
- [ ] Dynamic Discounting

### Analytics
- [x] Spend Analytics
- [x] Contract Utilization
- [x] Maverick Spend
- [ ] Predictive Analytics
- [ ] Benchmarking

### AI
- [x] Invoice OCR
- [x] Spend Analysis
- [x] Savings Identification
- [ ] Autonomous Procurement
- [ ] Negotiation Assistance

## Contributing

coupa.do is open source under the MIT license.

We welcome contributions from:
- Procurement professionals
- Supply chain experts
- Finance/AP specialists
- ERP integration developers

```bash
git clone https://github.com/dotdo/coupa.do
cd coupa.do
npm install
npm test
```

## License

MIT License - Procure freely.

---

<p align="center">
  <strong>The $8B acquisition ends here.</strong>
  <br />
  AI-native. Every user. No per-seat pricing.
  <br /><br />
  <a href="https://coupa.do">Website</a> |
  <a href="https://docs.coupa.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/coupa.do">GitHub</a>
</p>
