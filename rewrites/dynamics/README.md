# dynamics.do

> Microsoft Dynamics 365. Reimagined for AI. Open source.

[![npm version](https://img.shields.io/npm/v/dynamics.do.svg)](https://www.npmjs.com/package/dynamics.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

Microsoft Dynamics 365 is the only enterprise platform that unifies CRM and ERP. Sales, Service, Finance, Supply Chain, HR - all on one data platform. But it costs $65-200+ per user per month, requires months of implementation, and locks you into Microsoft's ecosystem.

**dynamics.do** is the open-source alternative. One Dataverse. Every module. AI-native from day one. Deploy in minutes.

## AI-Native API

```typescript
import { dynamics } from 'dynamics.do'           // Full SDK
import { dynamics } from 'dynamics.do/tiny'      // Minimal client
import { dynamics } from 'dynamics.do/sales'     // Sales-only operations
```

Natural language for business workflows:

```typescript
import { dynamics } from 'dynamics.do'

// Talk to it like a colleague
const pipeline = await dynamics`deals over 100k closing this quarter`
const atRisk = await dynamics`opportunities with no activity in 30 days`
const forecast = await dynamics`pipeline forecast for Q1`

// Chain like sentences
await dynamics`deals at risk this month`
  .notify(`Schedule a check-in with the customer`)

// Quote to cash in one breath
await dynamics`close Acme Corp deal`
  .map(deal => dynamics`create order from ${deal}`)
  .map(order => dynamics`generate invoice for ${order}`)
  .map(invoice => [cfo, controller].map(r => r`approve ${invoice}`))
```

## The Problem

Microsoft Dynamics 365 dominates enterprise CRM + ERP:

| What Microsoft Charges | The Reality |
|------------------------|-------------|
| **Sales** | $65-200/user/month |
| **Customer Service** | $50-95/user/month |
| **Finance** | $180/user/month |
| **Supply Chain** | $180/user/month |
| **Human Resources** | $120/user/month |
| **Full Suite** | $500+/user/month |

For a 200-user company: **$1.2M/year minimum**.

### The Microsoft Tax

Since the AI pivot:

- Copilot licenses stacked on top of everything
- Power Platform add-ons for basic workflows
- Implementation partners charging $500/hour
- Months-long deployments
- Data locked in Microsoft's ecosystem

### The Interoperability Illusion

Dynamics talks OData. But:

- Proprietary entity relationships underneath
- Custom APIs for critical workflows
- FetchXML for anything complex
- Power Platform for basic automation
- Your data, their rules

## The Solution

**dynamics.do** reimagines CRM + ERP for the AI era:

```
Microsoft Dynamics 365              dynamics.do
-----------------------------------------------------------------
$1.2M/year (200 users)              Deploy in minutes
$500/hour consultants               Code it yourself
Months to customize                 Instant deploy
Copilot as add-on                   AI is the foundation
Microsoft data centers              Your Cloudflare account
OData/FetchXML complexity           Natural language
Vendor lock-in                      Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo dynamics
```

A complete CRM + ERP. Running on infrastructure you control. Natural language from day one.

```typescript
import { Dynamics } from 'dynamics.do'

export default Dynamics({
  name: 'acme-corp',
  domain: 'erp.acme.com',
  modules: ['sales', 'service', 'finance', 'supply-chain', 'hr'],
})
```

## Features

### Sales (CRM)

```typescript
// Find anyone
const acme = await dynamics`Acme Corp`
const enterprise = await dynamics`accounts over 1M revenue`
const stale = await dynamics`opportunities no activity in 30 days`

// AI infers what you need
await dynamics`Acme Corp`                    // returns account
await dynamics`contacts at Acme Corp`        // returns contacts
await dynamics`Acme Corp pipeline`           // returns opportunities
```

### Lead Management

```typescript
// Leads are one line
await dynamics`new lead John Smith from Acme Corp via web`

// Qualify naturally
await dynamics`qualify John Smith as opportunity`
  .map(opp => dynamics`estimate ${opp} at 150k closing March`)

// Bulk qualification just works
await dynamics`leads from last week with budget confirmed`
  .qualify()
```

### Opportunities

```typescript
// Pipeline at a glance
await dynamics`deals over 100k closing this quarter`
await dynamics`opportunities at risk`
await dynamics`stalled deals no activity 30 days`

// Update naturally
await dynamics`move Acme deal to proposal stage`
await dynamics`Acme deal now 150k closing end of March`
```

### Customer Service

```typescript
// Cases are one line
await dynamics`new case for Acme Corp product not working high priority`

// Track naturally
await dynamics`open cases for Acme`
await dynamics`escalated cases this week`
await dynamics`cases breaching SLA`

// Route and resolve
await dynamics`route case 12345 to tier 2 support`
await dynamics`resolve case 12345 provided config update`
```

### Finance

```typescript
// Just say it
await dynamics`journal entry 5000 from engineering to accounts payable`
await dynamics`invoice Acme Corp 10 consulting hours at 500`
await dynamics`record payment from Acme Corp 5000`

// Payables just work
await dynamics`vendor invoice from Contoso 10000 for raw materials`
await dynamics`payment proposal for all vendors due this month via ACH`

// Month-end in one breath
await dynamics`run month-end close for January`
  .map(close => dynamics`generate variance analysis vs budget`)
  .map(analysis => [cfo, controller].map(r => r`review ${analysis}`))
```

### Supply Chain

```typescript
// Inventory at a glance
await dynamics`stock levels for Widget-001 all warehouses`
await dynamics`items below reorder point`
await dynamics`inventory value by warehouse`

// Procurement naturally
await dynamics`purchase order to Contoso for 1000 raw materials at 5 each`
await dynamics`receive 1000 raw materials against PO-001`

// Order fulfillment
await dynamics`sales order for Acme 50 widgets`
  .map(order => dynamics`ship ${order} from warehouse 1`)
  .map(shipment => dynamics`invoice ${shipment}`)
```

### Project Operations

```typescript
// Projects are one line
await dynamics`new project Website Redesign for Acme 75k budget`

// Tasks naturally
await dynamics`add discovery phase 40 hours to Website Redesign`
await dynamics`log 8 hours on discovery requirements gathering today`

// Billing just works
await dynamics`invoice Website Redesign through February including expenses`
```

### Human Resources

```typescript
// Hiring is one line
await dynamics`hire Alice Johnson as Software Engineer in Engineering starting Feb 15 at 120k`

// Benefits naturally
await dynamics`enroll Alice in medical HMO dental and 401k family coverage`

// Time off just works
await dynamics`Alice requesting vacation March 10 through 14`
await dynamics`pending leave requests for Engineering`

// Reviews naturally
await dynamics`performance review for Alice 2024 rating 4 exceeded goals`
```

## OData v4 Compatible

```typescript
// Same natural syntax, OData underneath
await dynamics`Acme Corp contacts`           // returns Contact resources
await dynamics`invoices past due`            // returns Invoice resources
await dynamics`everything for Acme 2024`     // returns full data bundle

// Bulk export for analytics
await dynamics`export all accounts since January`
```

### OData Resources Supported

| Category | Resources |
|----------|-----------|
| **Sales** | Account, Contact, Lead, Opportunity, Quote, SalesOrder, Product, PriceLevel |
| **Service** | Incident, Queue, KnowledgeArticle, Entitlement |
| **Finance** | JournalEntry, CustomerInvoice, VendorInvoice, Payment, FixedAsset |
| **Supply Chain** | Warehouse, InventoryAdjustment, PurchaseOrder, ProductReceipt |
| **HR** | Employee, Position, LeaveRequest, PerformanceReview |

### Power Platform Compatibility

Power Apps, Power Automate, Power BI - all work. Connect via OData feed and go.

## AI-Native Business Operations

### AI Agents for Every Module

```typescript
import { sally, ada, ralph } from 'agents.do'

// Sales agent handles pipeline
await sally`
  Review the pipeline for Q1.
  Identify deals at risk of slipping.
  Create follow-up tasks for the sales team.
`

// Finance agent handles month-end
await ada`
  Run month-end close for January.
  Generate variance analysis vs budget.
  Flag any unusual transactions.
`

// Operations agent handles supply chain
await ralph`
  Check inventory levels against demand forecast.
  Create purchase orders for items below safety stock.
  Optimize warehouse replenishment.
`
```

### Intelligent Automation

```typescript
// AI suggests, you approve
await dynamics`what should we follow up on this week?`
  .review()   // shows recommendations
  .approve()  // you confirm

// Proactive alerts just work
// - Deals going dark
// - Inventory running low
// - Invoices going overdue
// - SLAs about to breach
```

### MCP Server

Every entity, every action - exposed as AI tools:

```json
{
  "mcpServers": {
    "dynamics": {
      "command": "npx",
      "args": ["dynamics.do-mcp"]
    }
  }
}
```

## Architecture

### Durable Object per Business Unit

```
BusinessUnitDO (config, users, roles)
  |
  +-- SalesDO (accounts, contacts, leads, opportunities)
  |     |-- SQLite: CRM records
  |     +-- R2: Documents, attachments
  |
  +-- ServiceDO (cases, queues, knowledge)
  |     |-- SQLite: Support data
  |     +-- R2: Case attachments
  |
  +-- FinanceDO (GL, AP, AR, fixed assets)
  |     |-- SQLite: Financial data
  |     +-- R2: Invoices, statements
  |
  +-- SupplyChainDO (inventory, procurement, shipping)
  |     |-- SQLite: Operations data
  |
  +-- HRDO (employees, positions, reviews)
        |-- SQLite: HR data
        +-- R2: Employee documents
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active records, recent transactions | <10ms |
| **Warm** | R2 + SQLite Index | Historical data (2-7 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

### Cross-Module Integration

The magic of unified CRM+ERP - transactions flow automatically:

```typescript
// Quote to cash in one breath
await dynamics`close Acme Corp deal`
  .map(deal => dynamics`create order from ${deal}`)      // SalesDO
  .map(order => dynamics`reserve inventory for ${order}`) // SupplyChainDO
  .map(order => dynamics`generate invoice for ${order}`)  // FinanceDO
  .map(invoice => [cfo, controller].map(r => r`approve ${invoice}`))
```

## vs Microsoft Dynamics 365

| Feature | Microsoft Dynamics 365 | dynamics.do |
|---------|----------------------|-----------|
| **Implementation** | $10M+ (enterprise) | Deploy in minutes |
| **Annual Cost** | $1.2M+ (200 users) | ~$100/month |
| **Architecture** | Azure monolith | Edge-native, global |
| **API** | OData + FetchXML | Natural language |
| **AI** | Copilot (add-on) | AI-first design |
| **Data Location** | Microsoft data centers | Your Cloudflare account |
| **Customization** | $500/hour consultants | Code it yourself |
| **Interoperability** | Power Platform lock-in | Open by default |
| **Updates** | Quarterly releases | Continuous deployment |
| **Lock-in** | Decades of migration | MIT licensed |

## Use Cases

### Sales Operations

```typescript
// Weekly pipeline review
await dynamics`pipeline review this week`
  .each(deal => deal.update().follow_up())

// Quarterly forecast
await dynamics`forecast Q1 by region`
```

### Financial Close

```typescript
// Month-end close
await dynamics`close January`
  .map(period => dynamics`reconcile bank accounts`)
  .map(period => dynamics`generate financial statements`)
  .map(statements => [cfo, auditor].map(r => r`review ${statements}`))
```

### Procurement Automation

```typescript
// Reorder workflow
await dynamics`items below reorder point`
  .map(item => dynamics`create purchase order for ${item}`)
  .map(po => dynamics`send ${po} to vendor`)
```

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo dynamics
```

### Private Cloud

```bash
docker run -p 8787:8787 dotdo/dynamics
```

### On-Premises

```bash
./dynamics-do-install.sh --on-premises --modules=all
```

## Why Open Source for CRM + ERP?

### 1. True Interoperability

Microsoft talks interoperability while maintaining Power Platform lock-in. Open source means:
- OData native, not OData-bolted-on
- No vendor lock-in incentives
- Community-driven standards adoption
- Real data portability

### 2. Innovation Velocity

Enterprise software moves slowly because vendors profit from the status quo. Open source enables:
- Business users to influence development directly
- Analysts to build on operational data
- Startups to integrate without vendor approval
- Enterprises to customize for their needs

### 3. Cost Liberation

$1M+ implementations are business dollars diverted from growth. Open source means:
- Minutes to deploy, not months
- No implementation consultants
- No per-user licensing
- No vendor lock-in

### 4. AI Enablement

Closed CRM/ERP controls what AI you can use. Open source means:
- Integrate any LLM
- Build custom business intelligence
- Natural language everything
- Train models on your data (with governance)

## Roadmap

### Core CRM
- [x] Accounts & Contacts
- [x] Leads & Opportunities
- [x] Quotes & Orders
- [x] Activities
- [ ] Campaigns
- [ ] Goals & Forecasting

### Customer Service
- [x] Cases
- [x] Queues
- [x] Knowledge Base
- [ ] Entitlements & SLAs
- [ ] Omnichannel Routing

### Finance
- [x] General Ledger
- [x] Accounts Receivable
- [x] Accounts Payable
- [ ] Fixed Assets
- [ ] Cash Management
- [ ] Budgeting

### Supply Chain
- [x] Inventory Management
- [x] Procurement
- [x] Sales Orders
- [ ] Warehouse Management
- [ ] Transportation
- [ ] Master Planning

### HR
- [x] Employee Records
- [x] Leave Management
- [ ] Benefits
- [ ] Performance
- [ ] Recruiting
- [ ] Onboarding

## Contributing

dynamics.do is open source under the MIT license.

We especially welcome contributions from:
- Business analysts
- Finance professionals
- Supply chain experts
- HR specialists
- CRM/ERP consultants

```bash
git clone https://github.com/dotdo/dynamics.do
cd dynamics.do
pnpm install
pnpm test
```

## License

MIT License - For business operations everywhere.

---

<p align="center">
  <strong>The $1.2M/year CRM + ERP, liberated.</strong>
  <br />
  Natural language. AI-first. Open source.
  <br /><br />
  <a href="https://dynamics.do">Website</a> |
  <a href="https://docs.dynamics.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/dynamics.do">GitHub</a>
</p>
