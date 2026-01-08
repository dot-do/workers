# netsuite.do

> The Complete Cloud ERP. AI-Native. One Click to Deploy.

[![npm version](https://img.shields.io/npm/v/netsuite.do.svg)](https://www.npmjs.com/package/netsuite.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

Oracle NetSuite dominates mid-market ERP with $2.3B+ in annual revenue. They charge $99-999 per user per month, require 3-12 month implementations, and lock your entire business into proprietary SuiteScript and SuiteQL.

**netsuite.do** is the open-source alternative. Deploy your own ERP in one click. AI does your journal entries. SuiteTalk API compatible - your existing integrations just work.

## AI-Native API

```typescript
import { netsuite } from 'netsuite.do'           // Full SDK
import { netsuite } from 'netsuite.do/tiny'      // Minimal client
import { netsuite } from 'netsuite.do/gl'        // GL-only operations
```

Natural language for financial workflows:

```typescript
import { netsuite } from 'netsuite.do'

// Talk to it like you'd talk to your controller
const invoice = await netsuite`invoice ACME for 100 widgets @ $49.99, Net 30`
const aging = await netsuite`AR aging over 60 days`
const forecast = await netsuite`cash flow forecast Q1`

// Chain like sentences
await netsuite`overdue invoices over $10k`
  .notify(`Payment reminder: your invoice is past due`)

// Close books as natural flow
await netsuite`close January 2025 books`
  .map(period => netsuite`generate financials for ${period}`)
  .map(statements => netsuite`post to investor portal ${statements}`)
```

### AI Agents for Finance

```typescript
import { cfo, controller, ar } from 'agents.do'

// CFO agent handles strategic questions
await cfo`Why did gross margin drop 3% this quarter?`

// Controller agent handles month-end close
await controller`Close January 2025 books`

// AR agent handles collections
await ar`past due customers over $5k? Draft collection emails.`
```

One import. Natural language. Your AI finance department.

## The Problem

NetSuite was revolutionary in 1998. But the model is broken:

| What NetSuite Charges | Reality |
|-----------------------|---------|
| $99+/user/month (they hide pricing) | A 50-user company pays $60,000-150,000/year |
| Implementation fees | Another $50,000-500,000 for consultants |
| Module licensing | ERP, CRM, PSA, WMS each sold separately |
| SuiteAnalytics | Extra fees for your own data |
| Oracle ownership | Price increases after acquisition |

**The hidden tax**: SuiteScript developers cost $150-250/hour. Customization projects run $50k-$500k. The "cloud ERP" needs an army of consultants.

Meanwhile, AI can:
- **Read invoices and create journal entries automatically**
- **Reconcile bank statements while you sleep**
- **Predict inventory needs from sales patterns**
- **Generate financial forecasts with narrative explanations**

But NetSuite charges extra for "AI" features that barely scratch the surface.

## The Solution

**netsuite.do** reimagines ERP for the AI era:

```bash
npx create-dotdo netsuite
```

That's it. Your own NetSuite running on Cloudflare's edge.

| NetSuite | netsuite.do |
|----------|-------------|
| $99-999/user/month | **Free** (open source) |
| 3-12 month implementation | **Minutes** |
| Oracle data centers | **Your Cloudflare account** |
| SuiteScript proprietary | **TypeScript** |
| AI as premium add-on | **AI at the core** |
| Vendor lock-in | **SuiteTalk API compatible** |

---

## Features

### General Ledger

The heart of any ERP. Double-entry accounting with real-time subsidiary consolidation.

```typescript
// Just say it
await netsuite`record $5000 rent expense to account 6100, approved by controller`

// Trial balance like you'd ask your accountant
const trialBalance = await netsuite`trial balance for US Operations as of January 31`

// Consolidation in plain English
const consolidated = await netsuite`consolidate January 2025 with intercompany eliminations`
```

### Accounts Receivable

Customer invoicing, payments, and collections.

```typescript
// Invoice like you'd tell your bookkeeper
const invoice = await netsuite`invoice ACME-001 for 100 WIDGET-A @ $49.99 plus setup fee $500, Net 30`

// Record payment naturally
await netsuite`received $5499 ACH payment for invoice ${invoice.id}`

// Ask for aging like you'd ask your controller
const aging = await netsuite`AR aging report`
// { current: 45000, days30: 12000, days60: 3000, days90: 500 }

// Collections in one line
await netsuite`overdue invoices over $10k`
  .map(invoice => netsuite`send collection notice for ${invoice}`)
```

### Accounts Payable

Vendor bills, payments, and cash management.

```typescript
// Enter a bill like you'd hand it to AP
const bill = await netsuite`bill from SUPPLIER-001 invoice INV-12345: $10k raw materials, $500 freight, due Feb 10`

// Schedule payment naturally
await netsuite`pay ${bill.id} via ACH on Feb 8`

// Cash flow like you'd ask the CFO
const cashFlow = await netsuite`cash flow forecast Q1 2025`

// Pay all due bills in one sweep
await netsuite`bills due this week`
  .map(bill => netsuite`schedule payment for ${bill}`)
```

### Inventory Management

Multi-location inventory with lot tracking, serial numbers, and bin management.

```typescript
// Create items naturally
await netsuite`create inventory item WIDGET-A, average cost, asset 1300 cogs 5000 income 4000`

// Receive inventory like you'd tell the warehouse
await netsuite`receive 500 WIDGET-A @ $25 lot LOT-2025-001 at WAREHOUSE-01 for PO-2025-001`

// Transfer like a warehouse manager
await netsuite`transfer 100 WIDGET-A from WAREHOUSE-01 to WAREHOUSE-02`

// Check availability naturally
const availability = await netsuite`WIDGET-A availability`
// { onHand: 500, available: 450, committed: 50, onOrder: 200 }

// Reorder alerts in plain English
await netsuite`items below reorder point`
  .map(item => netsuite`create PO for ${item} to replenish`)
```

### Order Management

Sales orders, fulfillment, and revenue recognition.

```typescript
// Create orders like you'd tell sales ops
const order = await netsuite`sales order ACME-001: 50 WIDGET-A @ $49.99, 25 WIDGET-B @ $79.99, ship FedEx Ground, Net 30`

// Fulfill with a sentence
await netsuite`fulfill ${order.id} from WAREHOUSE-01 tracking 1234567890`

// Invoice and recognize revenue
await netsuite`invoice ${order.id}`
await netsuite`recognize revenue for ${order.id} straight-line over 12 months`

// End-to-end order flow
await netsuite`orders ready to ship`
  .map(order => netsuite`fulfill ${order}`)
  .map(fulfilled => netsuite`invoice ${fulfilled}`)
```

### Procurement

Purchase orders, vendor management, and receiving.

```typescript
// Create PO like you'd dictate it
const po = await netsuite`PO to SUPPLIER-001: 1000 RAW-MATERIAL-A @ $10, 500 RAW-MATERIAL-B @ $15, ship to WAREHOUSE-01 by Jan 25`

// Receive like you'd tell receiving
await netsuite`receive 1000 RAW-MATERIAL-A lot LOT-001 against ${po.id}`

// Three-way match in plain English
await netsuite`match PO ${po.id} with receipt RCV-001 and bill BILL-001`

// Procure-to-pay pipeline
await netsuite`approved requisitions this week`
  .map(req => netsuite`create PO for ${req}`)
  .map(po => netsuite`send to vendor ${po}`)
```

### Multi-Subsidiary

Enterprise-grade multi-entity accounting with intercompany transactions.

```typescript
// Define subsidiary naturally
await netsuite`create subsidiary ACME UK Ltd under ACME Corp, GBP, UK fiscal calendar`

// Intercompany transactions in plain English
await netsuite`intercompany sale: ACME Corp sells 100 WIDGET-A @ $30 to ACME UK Ltd`

// Consolidated financials like you'd ask the CFO
const pnl = await netsuite`consolidated P&L for January 2025 with intercompany eliminations`

// Global close in one pipeline
await netsuite`subsidiaries`
  .map(sub => netsuite`close January for ${sub}`)
  .map(closed => netsuite`consolidate ${closed}`)
```

---

## AI-Native ERP

This is what makes netsuite.do fundamentally different. AI isn't bolted on - it's the foundation.

### AI Journal Entries

Upload an invoice, get journal entries. No data entry.

```typescript
// Just forward the invoice
await netsuite`process AWS invoice INV-2025-001-AWS for $12,847.32 cloud computing January`
// AI:
// - Creates vendor bill: $12,847.32
// - Posts to: 6300 (Cloud Services Expense)
// - Assigns to: Engineering (from historical patterns)
// - Schedules payment based on terms
```

### AI Bank Reconciliation

Connect your bank, wake up to reconciled accounts.

```typescript
// One line reconciliation
const reconciliation = await netsuite`reconcile operating account with today's bank statement`
// {
//   matched: 247,
//   created: 12,      // New transactions AI identified and categorized
//   flagged: 3,       // Needs human review
// }

// Handle exceptions naturally
await netsuite`unmatched bank transactions`
  .map(txn => netsuite`categorize ${txn}`)
```

### AI Inventory Forecasting

Predict what you'll need before you need it.

```typescript
// Ask like you'd ask your supply chain manager
const prediction = await netsuite`forecast WIDGET-A demand for next 90 days`
// {
//   currentStock: 450,
//   predictedDemand: [
//     { period: 'Feb 2025', quantity: 180, confidence: 0.92 },
//     { period: 'Mar 2025', quantity: 220, confidence: 0.87 },
//     { period: 'Apr 2025', quantity: 195, confidence: 0.81 }
//   ],
//   suggestion: 'Order 400 units by Feb 15 to maintain service levels'
// }

// Auto-replenish pipeline
await netsuite`items needing reorder`
  .map(item => netsuite`optimal reorder for ${item}`)
  .map(order => netsuite`create PO ${order}`)
```

### AI Financial Analysis

Ask questions, get answers with supporting data.

```typescript
import { cfo } from 'agents.do'

await cfo`Why did gross margin drop 3% this quarter?`
// "Gross margin declined from 42% to 39% primarily due to:
//
// 1. **Raw material cost increase** (+$45,000)
//    - Steel prices up 12% vs prior quarter
//    - Supplier METAL-CO raised rates in December
//
// 2. **Product mix shift** (-$22,000 impact)
//    - WIDGET-B sales up 40% (lower margin product)
//
// Recommendation: Renegotiate METAL-CO contract or source alternative."
```

### AI Closes the Books

Month-end close that takes hours, not weeks.

```typescript
import { controller } from 'agents.do'

// Close books with promise pipelining
await netsuite`close January 2025 books`
  .map(period => netsuite`generate financials for ${period}`)
  .map(statements => [cfo, controller].map(r => r`approve ${statements}`))

// Controller agent handles everything:
// 1. Runs recurring journal entries
// 2. Posts depreciation schedules
// 3. Accrues unbilled revenue
// 4. Reconciles balance sheet accounts
// 5. Runs intercompany eliminations
// 6. Prepares close checklist with exceptions
```

---

## SuiteTalk API Compatible

Existing NetSuite integrations work without changes. REST APIs, SuiteQL, RESTlets, Saved Searches - all supported.

```typescript
// SuiteQL for power users who want SQL
const topCustomers = await netsuite`
  SELECT customer.companyname, SUM(transaction.amount) as total
  FROM transaction
  JOIN customer ON transaction.entity = customer.id
  WHERE transaction.type = 'SalesOrd'
  GROUP BY customer.companyname
  ORDER BY total DESC
`

// Or just ask naturally
const same = await netsuite`top customers by sales this year`
```

### REST Web Services

```bash
# Existing integrations just work
curl -X GET 'https://your-instance.netsuite.do/services/rest/record/v1/customer' \
  -H 'Authorization: Bearer $TOKEN'
```

### Saved Searches

```typescript
// Run saved searches naturally
const results = await netsuite`run saved search top_customers`

// Or create on the fly
await netsuite`sales orders this month over $10k`
```

---

## Architecture

netsuite.do is built on Cloudflare's global edge network:

```
                        Cloudflare Edge
                              |
              +---------------+---------------+
              |               |               |
        +-----------+   +-----------+   +-----------+
        | Auth      |   | API       |   | Webhooks  |
        | (WorkOS)  |   | Gateway   |   | Handler   |
        +-----------+   +-----------+   +-----------+
              |               |               |
              +---------------+---------------+
                              |
                    +-----------------+
                    | Organization DO |
                    | (Tenant Root)   |
                    +-----------------+
                           |
         +-----------------+-----------------+
         |                 |                 |
    +----------+     +----------+     +----------+
    | GL DO    |     | AR DO    |     | AP DO    |
    | Ledger   |     | Invoices |     | Bills    |
    +----------+     +----------+     +----------+
         |                 |                 |
    +----------+     +----------+     +----------+
    | Inv DO   |     | Order DO |     | Procure  |
    | Stock    |     | Sales    |     | Purchase |
    +----------+     +----------+     +----------+
                           |
              +------------+------------+
              |            |            |
          SQLite      Vectorize        R2
          (Hot)     (AI Search)    (Documents)
```

### Durable Object Per Domain

Each accounting domain runs in its own Durable Object:

| Durable Object | Purpose |
|----------------|---------|
| `OrganizationDO` | Tenant settings, subsidiaries, periods |
| `GeneralLedgerDO` | Chart of accounts, journal entries |
| `AccountsReceivableDO` | Customers, invoices, payments |
| `AccountsPayableDO` | Vendors, bills, disbursements |
| `InventoryDO` | Items, locations, stock levels |
| `OrderManagementDO` | Sales orders, fulfillment |
| `ProcurementDO` | Purchase orders, receiving |
| `FixedAssetsDO` | Assets, depreciation |
| `PayrollDO` | Employees, payroll runs |

### Tiered Storage

```typescript
// Hot tier - SQLite in Durable Object
// Current period transactions, frequently accessed
{
  tier: 'hot',
  storage: 'SQLite',
  retention: '2 years',
  access: '<10ms'
}

// Warm tier - R2 with query layer
// Historical data, periodic access
{
  tier: 'warm',
  storage: 'R2 + Parquet',
  retention: '7 years',
  access: '<100ms'
}

// Cold tier - R2 Archive
// Compliance retention, rare access
{
  tier: 'cold',
  storage: 'R2 Archive',
  retention: 'indefinite',
  access: 'async retrieval'
}
```

### Real-Time Consolidation

Unlike traditional ERPs that batch consolidation overnight:

```typescript
// Real-time consolidated financials
const statement = await netsuite`income statement January all subsidiaries consolidated`

// Behind the scenes:
// 1. Each subsidiary DO has its own trial balance
// 2. Parent DO aggregates child balances
// 3. Elimination entries applied automatically
// 4. Currency translation at period-end rates
// 5. Result: Real-time consolidated financials
```

---

## vs NetSuite

| Feature | Oracle NetSuite | netsuite.do |
|---------|-----------------|-------------|
| Pricing | $99-999/user/month (hidden) | **Free** (open source) |
| Implementation | 3-12 months, $50k-500k | **One click** |
| AI Features | Premium add-ons | **Native** |
| Customization | SuiteScript (proprietary) | **TypeScript** |
| Query Language | SuiteQL (proprietary) | **SuiteQL compatible** |
| Data Location | Oracle data centers | **Your infrastructure** |
| Multi-Subsidiary | Extra licensing | **Included** |
| Bank Feeds | Per-connection fees | **Included** |
| Revenue Recognition | Advanced module ($$$) | **Included** |
| Consultant Dependency | High | **None** |

### Cost Comparison

**50-user mid-market company:**

| | Oracle NetSuite | netsuite.do |
|-|-----------------|-------------|
| Year 1 licensing | $120,000 | $0 |
| Implementation | $150,000 | $0 |
| Annual support | $25,000 | $0 |
| SuiteAnalytics | $15,000 | $0 |
| **Year 1 Total** | **$310,000** | **$5** (Workers) |
| **5-Year TCO** | **$950,000+** | **$300** |

---

## Quick Start

### Deploy to Cloudflare

```bash
npx create-dotdo netsuite

# Follow prompts:
# - Company name
# - Base currency
# - Fiscal year start
# - Initial chart of accounts (standard or import)
```

### Or Clone and Customize

```bash
git clone https://github.com/dotdo/netsuite.do
cd netsuite.do
npm install

# Configure
cp wrangler.example.toml wrangler.toml
# Edit settings

npm run deploy
```

### First Steps

```typescript
import { netsuite } from 'netsuite.do'

// 1. Set up chart of accounts
await netsuite`setup standard US chart of accounts`

// 2. Create a customer
const customer = await netsuite`create customer Acme Corporation ap@acme.com Net 30`

// 3. Create first invoice
const invoice = await netsuite`invoice ${customer.id} for $5000 Consulting Services`

// You're live!

// Start managing cash
await netsuite`cash position today`
await netsuite`bills due this week`
await netsuite`overdue receivables`
```

---

## Migration from NetSuite

### Export from NetSuite

```bash
# Use SuiteCloud Development Framework
npm install -g @oracle/suitecloud-cli
suitecloud file:import --all

# Or use our migration tool
npx netsuite.do export --source production
```

### Import to netsuite.do

```bash
npx netsuite.do migrate \
  --source ./netsuite-export \
  --url https://your-company.netsuite.do

# Migrates:
# - Chart of accounts
# - Customer/vendor master data
# - Open transactions
# - Historical journal entries
# - Custom records and fields
# - Saved searches
# - SuiteScripts (converted to TypeScript)
```

### Parallel Run

Run both systems in parallel during transition:

```typescript
// Enable dual-write mode
await netsuite`enable parallel run with production NetSuite`

// All writes go to both systems
// Compare results, validate, then cut over

await netsuite`compare January transactions with Oracle NetSuite`
await netsuite`show discrepancies`
await netsuite`cut over to netsuite.do`
```

---

## Roadmap

### Now
- [x] General Ledger with multi-subsidiary
- [x] Accounts Receivable
- [x] Accounts Payable
- [x] Basic Inventory
- [x] Sales Orders
- [x] SuiteTalk REST API compatibility
- [x] SuiteQL query engine

### Next
- [ ] Advanced Inventory (lot tracking, serial numbers)
- [ ] Revenue Recognition (ASC 606)
- [ ] Fixed Assets and Depreciation
- [ ] Bank Feed Integration
- [ ] AI Journal Entry Automation
- [ ] AI Bank Reconciliation

### Later
- [ ] Manufacturing (Work Orders, BOM)
- [ ] Project Accounting
- [ ] Multi-Currency with Revaluation
- [ ] Payroll Integration
- [ ] Advanced Financial Reporting
- [ ] SuiteScript Runtime Compatibility

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Quick Start](./docs/quickstart.mdx) | Deploy in 5 minutes |
| [Chart of Accounts](./docs/chart-of-accounts.mdx) | Setting up your GL |
| [Multi-Subsidiary](./docs/multi-subsidiary.mdx) | Enterprise structure |
| [AI Features](./docs/ai.mdx) | AI journal entries, forecasting |
| [SuiteTalk API](./docs/suitetalk.mdx) | REST API reference |
| [SuiteQL](./docs/suiteql.mdx) | Query language guide |
| [Migration](./docs/migration.mdx) | Moving from NetSuite |
| [Architecture](./docs/architecture.mdx) | Technical deep-dive |

---

## Contributing

netsuite.do is open source under the MIT license.

We especially welcome contributions from:
- Controllers and CFOs
- ERP implementation consultants
- Accountants and bookkeepers
- NetSuite developers escaping SuiteScript
- TypeScript enthusiasts

```bash
git clone https://github.com/dotdo/netsuite.do
cd netsuite.do
pnpm install
pnpm test
```

---

## License

MIT

---

<p align="center">
  <strong>The $2.3B ERP monopoly ends here.</strong>
  <br />
  AI-native. SuiteTalk-compatible. Owned by you.
  <br /><br />
  <a href="https://netsuite.do">Website</a> |
  <a href="https://docs.netsuite.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/netsuite.do">GitHub</a>
</p>
