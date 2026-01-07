# netsuite.do

> The Complete Cloud ERP. AI-Native. One Click to Deploy.

[![npm version](https://img.shields.io/npm/v/netsuite.do.svg)](https://www.npmjs.com/package/netsuite.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

Oracle NetSuite dominates mid-market ERP with $2.3B+ in annual revenue. They charge $99-999 per user per month, require 3-12 month implementations, and lock your entire business into proprietary SuiteScript and SuiteQL.

**netsuite.do** is the open-source alternative. Deploy your own ERP in one click. AI does your journal entries. SuiteTalk API compatible - your existing integrations just work.

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
import { netsuite } from 'netsuite.do'

// Post a journal entry
await netsuite.gl.journalEntry({
  date: '2025-01-15',
  memo: 'Monthly rent expense',
  lines: [
    { account: '6100', debit: 5000, department: 'Engineering' },
    { account: '2000', credit: 5000 }
  ],
  approvedBy: 'controller'
})

// Real-time trial balance
const trialBalance = await netsuite.gl.trialBalance({
  asOf: '2025-01-31',
  subsidiary: 'US Operations'
})

// Consolidated financials across entities
const consolidated = await netsuite.gl.consolidate({
  period: '2025-01',
  eliminateIntercompany: true
})
```

### Accounts Receivable

Customer invoicing, payments, and collections.

```typescript
// Create an invoice
const invoice = await netsuite.ar.invoice({
  customer: 'ACME-001',
  items: [
    { item: 'WIDGET-A', quantity: 100, rate: 49.99 },
    { item: 'SERVICE-SETUP', quantity: 1, rate: 500 }
  ],
  terms: 'Net 30',
  dueDate: '2025-02-15'
})

// Record payment
await netsuite.ar.payment({
  invoice: invoice.id,
  amount: 5499,
  method: 'ACH',
  reference: 'PMT-2025-001'
})

// Aging report
const aging = await netsuite.ar.aging({ asOf: '2025-01-31' })
// { current: 45000, days30: 12000, days60: 3000, days90: 500 }
```

### Accounts Payable

Vendor bills, payments, and cash management.

```typescript
// Enter a vendor bill
const bill = await netsuite.ap.bill({
  vendor: 'SUPPLIER-001',
  invoiceNumber: 'INV-12345',
  date: '2025-01-10',
  dueDate: '2025-02-10',
  lines: [
    { account: '5000', amount: 10000, memo: 'Raw materials' },
    { account: '6200', amount: 500, memo: 'Freight' }
  ]
})

// Schedule payment
await netsuite.ap.schedulePayment({
  bills: [bill.id],
  payDate: '2025-02-08',
  method: 'ACH'
})

// Cash flow forecast
const cashFlow = await netsuite.ap.cashForecast({
  from: '2025-01-01',
  to: '2025-03-31'
})
```

### Inventory Management

Multi-location inventory with lot tracking, serial numbers, and bin management.

```typescript
// Create an item
await netsuite.inventory.createItem({
  type: 'inventory',
  name: 'WIDGET-A',
  description: 'Industrial Widget, Type A',
  costing: 'average',
  accounts: {
    asset: '1300',
    cogs: '5000',
    income: '4000'
  }
})

// Receive inventory
await netsuite.inventory.receive({
  location: 'WAREHOUSE-01',
  items: [
    { item: 'WIDGET-A', quantity: 500, cost: 25.00, lot: 'LOT-2025-001' }
  ],
  purchaseOrder: 'PO-2025-001'
})

// Transfer between locations
await netsuite.inventory.transfer({
  from: 'WAREHOUSE-01',
  to: 'WAREHOUSE-02',
  items: [{ item: 'WIDGET-A', quantity: 100 }]
})

// Real-time availability
const availability = await netsuite.inventory.availability('WIDGET-A')
// { onHand: 500, available: 450, committed: 50, onOrder: 200 }
```

### Order Management

Sales orders, fulfillment, and revenue recognition.

```typescript
// Create sales order
const order = await netsuite.orders.create({
  customer: 'ACME-001',
  items: [
    { item: 'WIDGET-A', quantity: 50, rate: 49.99 },
    { item: 'WIDGET-B', quantity: 25, rate: 79.99 }
  ],
  shippingMethod: 'FedEx Ground',
  terms: 'Net 30'
})

// Fulfill from inventory
await netsuite.orders.fulfill({
  order: order.id,
  location: 'WAREHOUSE-01',
  shipDate: '2025-01-16',
  tracking: '1234567890'
})

// Generate invoice
await netsuite.orders.invoice(order.id)

// Revenue recognition schedule
await netsuite.revenue.schedule({
  order: order.id,
  method: 'straight-line',
  periods: 12
})
```

### Procurement

Purchase orders, vendor management, and receiving.

```typescript
// Create purchase order
const po = await netsuite.procurement.purchaseOrder({
  vendor: 'SUPPLIER-001',
  items: [
    { item: 'RAW-MATERIAL-A', quantity: 1000, rate: 10.00 },
    { item: 'RAW-MATERIAL-B', quantity: 500, rate: 15.00 }
  ],
  shipTo: 'WAREHOUSE-01',
  expectedDate: '2025-01-25'
})

// Receive against PO
await netsuite.procurement.receive({
  purchaseOrder: po.id,
  items: [
    { item: 'RAW-MATERIAL-A', quantity: 1000, lot: 'LOT-001' }
  ]
})

// Three-way match
const match = await netsuite.procurement.match({
  purchaseOrder: po.id,
  receipt: 'RCV-001',
  vendorBill: 'BILL-001'
})
```

### Multi-Subsidiary

Enterprise-grade multi-entity accounting with intercompany transactions.

```typescript
// Define subsidiary structure
await netsuite.subsidiaries.create({
  name: 'ACME UK Ltd',
  parent: 'ACME Corp',
  currency: 'GBP',
  fiscalCalendar: 'UK-FISCAL',
  chartOfAccounts: 'inherit'  // or 'custom'
})

// Intercompany transaction
await netsuite.intercompany.sale({
  from: 'ACME Corp',
  to: 'ACME UK Ltd',
  items: [{ item: 'WIDGET-A', quantity: 100, transferPrice: 30.00 }],
  eliminateOnConsolidation: true
})

// Consolidated P&L
const pnl = await netsuite.reports.incomeStatement({
  period: '2025-01',
  consolidated: true,
  eliminateIntercompany: true
})
```

---

## AI-Native ERP

This is what makes netsuite.do fundamentally different. AI isn't bolted on - it's the foundation.

### AI Journal Entries

Upload an invoice, get journal entries. No data entry.

```typescript
import { ada } from 'netsuite.do/agents'

// Email an invoice to your ERP
await ada`
  Process this invoice from AWS:
  - Vendor: Amazon Web Services
  - Amount: $12,847.32
  - Service: Cloud computing January 2025
  - Invoice #: INV-2025-001-AWS
`
// Ada:
// - Creates vendor bill: $12,847.32
// - Posts to: 6300 (Cloud Services Expense)
// - Assigns to: Engineering department (from historical patterns)
// - Schedules payment based on terms
```

### AI Bank Reconciliation

Connect your bank, wake up to reconciled accounts.

```typescript
// AI reconciles overnight
const reconciliation = await netsuite.banking.reconcile({
  account: '1000',  // Operating account
  statement: await fetchBankStatement()
})

// Results next morning:
// {
//   matched: 247,
//   created: 12,      // New transactions AI identified and categorized
//   flagged: 3,       // Needs human review
//   suggestions: [
//     { transaction: 'DEP-2025-001', match: 'INV-2024-892', confidence: 0.94 }
//   ]
// }
```

### AI Inventory Forecasting

Predict what you'll need before you need it.

```typescript
import { forecast } from 'netsuite.do/ai'

// AI analyzes historical patterns
const prediction = await forecast.inventory({
  item: 'WIDGET-A',
  horizon: '90 days',
  factors: ['seasonality', 'growth', 'events']
})

// {
//   currentStock: 450,
//   predictedDemand: [
//     { period: 'Feb 2025', quantity: 180, confidence: 0.92 },
//     { period: 'Mar 2025', quantity: 220, confidence: 0.87 },
//     { period: 'Apr 2025', quantity: 195, confidence: 0.81 }
//   ],
//   reorderPoint: 150,
//   reorderQuantity: 400,
//   suggestion: 'Order 400 units by Feb 15 to maintain service levels'
// }
```

### AI Financial Analysis

Ask questions, get answers with supporting data.

```typescript
import { cfo } from 'netsuite.do/agents'

await cfo`Why did gross margin drop 3% this quarter?`
// "Gross margin declined from 42% to 39% primarily due to:
//
// 1. **Raw material cost increase** (+$45,000)
//    - Steel prices up 12% vs prior quarter
//    - Supplier METAL-CO raised rates in December
//
// 2. **Product mix shift** (-$22,000 impact)
//    - WIDGET-B sales up 40% (lower margin product)
//    - WIDGET-A sales down 15% (higher margin product)
//
// 3. **Fulfillment costs** (+$8,000)
//    - Expedited shipping for late orders
//
// Recommendation: Renegotiate METAL-CO contract or source alternative.
// Run scenario analysis? [Yes/No]"
```

### AI Closes the Books

Month-end close that takes hours, not weeks.

```typescript
import { controller } from 'netsuite.do/agents'

await controller`Close January 2025 books`

// Controller agent:
// 1. Runs all recurring journal entries
// 2. Posts depreciation schedules
// 3. Accrues unbilled revenue
// 4. Reconciles all balance sheet accounts
// 5. Runs intercompany eliminations
// 6. Generates variance analysis vs budget
// 7. Prepares close checklist with exceptions
// 8. Notifies CFO when ready for review
```

---

## SuiteTalk API Compatible

Existing NetSuite integrations work without changes.

### REST Web Services

```bash
# Query customers
curl -X GET 'https://your-instance.netsuite.do/services/rest/record/v1/customer' \
  -H 'Authorization: Bearer $TOKEN'

# Create sales order
curl -X POST 'https://your-instance.netsuite.do/services/rest/record/v1/salesOrder' \
  -H 'Content-Type: application/json' \
  -d '{
    "entity": {"id": "123"},
    "item": {"items": [{"item": {"id": "456"}, "quantity": 10}]}
  }'
```

### SuiteQL

```typescript
// SuiteQL queries work exactly the same
const query = await netsuite.query(`
  SELECT
    customer.companyname,
    SUM(transaction.amount) as total_sales
  FROM transaction
  INNER JOIN customer ON transaction.entity = customer.id
  WHERE transaction.type = 'SalesOrd'
    AND transaction.trandate >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
  GROUP BY customer.companyname
  ORDER BY total_sales DESC
`)
```

### RESTlets

```typescript
// Define custom endpoints
export const MyRESTlet = netsuite.restlet({
  get: async (context) => {
    const customerId = context.parameters.customerId
    return await netsuite.record.load('customer', customerId)
  },
  post: async (context) => {
    const data = context.request.body
    return await netsuite.record.create('salesorder', data)
  }
})
```

### Saved Searches

```typescript
// Saved searches work
const results = await netsuite.search.load('customsearch_top_customers')

// Or create dynamically
const search = await netsuite.search.create({
  type: 'transaction',
  filters: [
    ['type', 'anyof', 'SalesOrd'],
    'AND',
    ['mainline', 'is', 'T'],
    'AND',
    ['trandate', 'within', 'thismonth']
  ],
  columns: ['tranid', 'entity', 'amount']
})
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
// Consolidation runs in real-time
const statement = await netsuite.gl.incomeStatement({
  period: '2025-01',
  subsidiary: 'all',
  consolidated: true
})

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
import { NetSuiteClient } from 'netsuite.do'

const ns = new NetSuiteClient({
  url: 'https://your-company.netsuite.do',
  token: process.env.NETSUITE_TOKEN
})

// 1. Set up chart of accounts
await ns.setup.chartOfAccounts('standard-us')

// 2. Create a customer
const customer = await ns.customers.create({
  companyName: 'Acme Corporation',
  email: 'ap@acme.com',
  terms: 'Net 30'
})

// 3. Create first invoice
const invoice = await ns.ar.invoice({
  customer: customer.id,
  items: [{ description: 'Consulting Services', amount: 5000 }]
})

// You're live!
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
// Dual-write adapter
const adapter = netsuite.migration.dualWrite({
  source: netsuiteProduction,
  target: netsuiteDoInstance,
  sync: 'real-time'
})

// All writes go to both systems
// Compare results, validate, then cut over
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

```bash
git clone https://github.com/dotdo/netsuite.do
cd netsuite.do
npm install
npm test
npm run dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT

---

<p align="center">
  <strong>Enterprise ERP, democratized.</strong><br/>
  Built on Cloudflare Workers. Designed for AI. Owned by you.
</p>
