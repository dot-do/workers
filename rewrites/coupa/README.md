# coupa.do

> Procurement + Spend Management. AI-native. Control your spend.

Coupa built a $8B company (acquired by Thoma Bravo) managing enterprise procurement - purchase orders, invoices, supplier management. At $150-300 per user per month, with implementations running $500K-2M, the "Business Spend Management" platform has become its own budget line item.

**coupa.do** is the open-source alternative. One-click deploy your own procurement platform. AI that actually finds savings. No per-seat ransomware.

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

Your own procurement platform. Every user. Every supplier. No per-seat pricing.

## Features

### Requisitions

Request what you need:

```typescript
import { procure } from 'coupa.do'

// Create requisition
const req = await procure.requisitions.create({
  requestor: 'user-001',
  department: 'Engineering',
  type: 'goods',
  justification: 'New laptops for Q1 hires',
  lines: [
    {
      description: 'MacBook Pro 16" M3 Max',
      category: 'IT Equipment',
      quantity: 5,
      unitPrice: 3499,
      currency: 'USD',
      supplier: 'Apple',
      deliverTo: 'HQ - IT Closet',
      needBy: '2025-02-15',
    },
    {
      description: 'Apple Care+',
      category: 'IT Equipment',
      quantity: 5,
      unitPrice: 399,
      currency: 'USD',
      supplier: 'Apple',
    },
  ],
  attachments: ['equipment-justification.pdf'],
  coding: {
    costCenter: 'CC-001',
    glAccount: '6410',
    project: 'Q1-HIRING',
  },
})

// Submit for approval
await req.submit()
```

### Approvals

Flexible, rule-based workflows:

```typescript
// Define approval rules
await procure.approvals.configure({
  rules: [
    {
      name: 'Manager Approval',
      condition: 'amount > 0',
      approvers: ['requestor.manager'],
      required: true,
    },
    {
      name: 'Director Approval',
      condition: 'amount > 5000',
      approvers: ['department.director'],
      required: true,
    },
    {
      name: 'VP Approval',
      condition: 'amount > 25000',
      approvers: ['department.vp'],
      required: true,
    },
    {
      name: 'Finance Review',
      condition: 'amount > 50000 OR category IN ("Capital", "Professional Services")',
      approvers: ['finance-team'],
      required: true,
    },
    {
      name: 'Executive Approval',
      condition: 'amount > 100000',
      approvers: ['cfo'],
      required: true,
    },
  ],

  delegation: {
    enabled: true,
    maxDays: 30,
    notifyDelegator: true,
  },

  escalation: {
    afterDays: 3,
    escalateTo: 'approver.manager',
    notifyRequestor: true,
  },
})

// Approve/reject with comments
await procure.approvals.decide({
  request: 'REQ-001',
  decision: 'approve', // or 'reject', 'return'
  comments: 'Approved. Please consolidate with Q2 order if possible.',
  approver: 'user-002',
})
```

### Purchase Orders

Professional PO management:

```typescript
// Create PO from approved requisition
const po = await procure.purchaseOrders.create({
  requisition: 'REQ-001',
  supplier: 'SUP-APPLE',
  terms: {
    paymentTerms: 'Net 30',
    incoterms: 'DDP',
    currency: 'USD',
  },
  shippingAddress: {
    attention: 'IT Department',
    line1: '100 Main Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
  },
  instructions: 'Deliver to loading dock. Call (555) 123-4567 on arrival.',
})

// Send to supplier
await po.send({
  method: 'email', // or 'supplier-portal', 'edi', 'cxml'
  contacts: ['orders@apple.com'],
})

// Acknowledge receipt (by supplier)
await po.acknowledge({
  confirmedBy: 'apple-rep',
  estimatedDelivery: '2025-02-10',
  notes: 'All items in stock, shipping next week',
})

// Receive goods
await procure.receiving.create({
  purchaseOrder: po.id,
  receivedBy: 'user-003',
  lines: [
    { line: 1, quantityReceived: 5, condition: 'good' },
    { line: 2, quantityReceived: 5, condition: 'good' },
  ],
  packing: 'SN12345678',
})
```

### Invoices

Three-way matching and payment:

```typescript
// Receive invoice
const invoice = await procure.invoices.create({
  supplier: 'SUP-APPLE',
  invoiceNumber: 'INV-2025-001234',
  invoiceDate: '2025-02-10',
  dueDate: '2025-03-12',
  lines: [
    {
      purchaseOrderLine: 'PO-001-1',
      description: 'MacBook Pro 16" M3 Max',
      quantity: 5,
      unitPrice: 3499,
      total: 17495,
    },
    {
      purchaseOrderLine: 'PO-001-2',
      description: 'Apple Care+',
      quantity: 5,
      unitPrice: 399,
      total: 1995,
    },
  ],
  tax: 1558.32,
  total: 21048.32,
  attachments: ['invoice-scan.pdf'],
})

// Three-way match (PO, Receipt, Invoice)
const match = await invoice.match()
// {
//   status: 'matched',
//   poMatch: true,
//   receiptMatch: true,
//   priceMatch: true,
//   quantityMatch: true,
//   exceptions: []
// }

// Auto-approve if matched
if (match.status === 'matched') {
  await invoice.approve({ auto: true })
}

// Payment scheduling
await procure.payments.schedule({
  invoice: invoice.id,
  paymentDate: '2025-03-10', // 2 days early for 2% discount
  paymentMethod: 'ACH',
  earlyPayDiscount: {
    percentage: 2,
    savings: 420.97,
  },
})
```

### Supplier Management

Your supplier network:

```typescript
// Onboard supplier
const supplier = await procure.suppliers.create({
  name: 'Apple Inc.',
  type: 'vendor',
  categories: ['IT Equipment', 'Software'],
  contacts: [
    {
      name: 'Enterprise Sales',
      email: 'enterprise@apple.com',
      phone: '1-800-800-2775',
      type: 'sales',
    },
    {
      name: 'Accounts Receivable',
      email: 'ar@apple.com',
      type: 'billing',
    },
  ],
  addresses: [
    {
      type: 'remit',
      line1: 'One Apple Park Way',
      city: 'Cupertino',
      state: 'CA',
      postalCode: '95014',
    },
  ],
  payment: {
    terms: 'Net 30',
    method: 'ACH',
    bankAccount: {
      // Encrypted
      bankName: 'Bank of America',
      accountNumber: '****1234',
      routingNumber: '****5678',
    },
  },
  tax: {
    id: '94-2404110',
    w9OnFile: true,
    type: '1099-NEC',
  },
})

// Supplier qualification
await procure.suppliers.qualify({
  supplier: supplier.id,
  questionnaire: 'standard-vendor',
  responses: {
    yearsInBusiness: 48,
    annualRevenue: 394000000000,
    publicCompany: true,
    diversityCertifications: [],
    insuranceCoverage: true,
    socCompliance: true,
  },
  documents: ['w9.pdf', 'insurance-certificate.pdf'],
})

// Supplier performance
const performance = await procure.suppliers.scorecard('SUP-APPLE')
// {
//   overall: 4.5,
//   metrics: {
//     onTimeDelivery: 0.96,
//     qualityScore: 0.99,
//     responsiveness: 4.2,
//     priceCompetitiveness: 3.8,
//     invoiceAccuracy: 0.98,
//   },
//   trend: 'stable',
//   spendTTM: 250000,
// }
```

### Contracts

Procurement contract management:

```typescript
// Create contract
await procure.contracts.create({
  supplier: 'SUP-APPLE',
  type: 'master-agreement',
  title: 'Apple Enterprise Agreement 2025',
  effectiveDate: '2025-01-01',
  expirationDate: '2027-12-31',
  value: {
    type: 'estimated',
    amount: 500000,
    period: 'annual',
  },
  terms: {
    paymentTerms: 'Net 30 with 2% 10-day discount',
    priceProtection: '12 months',
    volumeDiscounts: [
      { threshold: 50, discount: 5 },
      { threshold: 100, discount: 10 },
      { threshold: 250, discount: 15 },
    ],
  },
  pricingSchedule: 'pricing-schedule-2025.xlsx',
  renewalType: 'auto',
  noticePeriod: 90,
})

// Contract compliance check on PO
await procure.purchaseOrders.checkContract('PO-001')
// Validates pricing, terms, supplier status against contract
```

### Catalogs

Guided buying from approved sources:

```typescript
// Configure punch-out catalog
await procure.catalogs.punchout({
  supplier: 'SUP-AMAZON-BUSINESS',
  name: 'Amazon Business',
  protocol: 'cxml', // or 'oci'
  credentials: {
    identity: '...',
    sharedSecret: '...',
  },
  url: 'https://www.amazon.com/punchout',
  categories: ['Office Supplies', 'IT Accessories'],
  maxOrderValue: 5000,
})

// Static catalog
await procure.catalogs.create({
  name: 'Preferred IT Equipment',
  supplier: 'SUP-APPLE',
  items: [
    {
      sku: 'MBP16-M3MAX',
      name: 'MacBook Pro 16" M3 Max',
      description: 'Laptop with M3 Max chip, 36GB RAM, 1TB SSD',
      price: 3499,
      category: 'IT Equipment',
      image: 'https://...',
    },
    // ... more items
  ],
  contract: 'CTR-APPLE-2025',
  validThrough: '2025-12-31',
})
```

## Spend Analytics

Understand where the money goes:

```typescript
// Spend by category
const categorySpend = await procure.analytics.spendByCategory({
  period: '2024',
  groupBy: 'category',
})
// [
//   { category: 'IT Equipment', spend: 2400000, percentage: 24 },
//   { category: 'Professional Services', spend: 1800000, percentage: 18 },
//   { category: 'Marketing', spend: 1500000, percentage: 15 },
//   ...
// ]

// Spend by supplier
const supplierSpend = await procure.analytics.spendBySupplier({
  period: '2024',
  topN: 20,
})

// Maverick spend (off-contract)
const maverickSpend = await procure.analytics.maverickSpend({
  period: '2024-Q4',
})
// {
//   total: 450000,
//   percentage: 12,
//   categories: [...],
//   departments: [...],
//   recommendations: [...]
// }

// Contract utilization
const utilization = await procure.analytics.contractUtilization({
  period: '2024',
})
// Shows spend vs contract commitments
```

## AI-Native Procurement

### AI Spend Analysis

```typescript
import { ada } from 'coupa.do/agents'

// Identify savings opportunities
await ada`
  Analyze our 2024 spend data and identify:
  1. Categories with supplier consolidation opportunity
  2. Contracts up for renewal with negotiation leverage
  3. Price variance for same items across suppliers
  4. Maverick spend that should go through contracts
  5. Early payment discount opportunities not being captured

  Quantify potential savings for each opportunity.
`

// Ada analyzes and returns:
// "Total identified savings opportunities: $847,000
//
// 1. SUPPLIER CONSOLIDATION: $320,000
//    - IT Accessories: 12 suppliers, recommend 3 preferred
//    - Office Supplies: Consolidate to Amazon Business
//
// 2. CONTRACT RENEWALS: $180,000
//    - AWS contract expires Q2 - usage up 40%, negotiate volume discount
//    - Salesforce - paying list price, competitors offering 25% off
//
// 3. PRICE VARIANCE: $127,000
//    - Same Dell monitors: $499 vs $449 depending on buyer
//    - Professional services: Rate card not enforced
//
// 4. MAVERICK SPEND: $145,000
//    - Marketing buying software outside IT agreements
//    - Regional offices purchasing office supplies locally
//
// 5. EARLY PAY DISCOUNTS: $75,000
//    - $3.2M eligible for 2/10 Net 30, only capturing 40%"
```

### AI Invoice Processing

```typescript
import { ralph } from 'agents.do'

// Auto-extract invoice data
await ralph`
  Process the attached invoice image:
  1. Extract supplier, invoice number, date, amounts
  2. Match line items to open POs
  3. Identify any discrepancies
  4. Flag unusual items or pricing
  5. Code to appropriate GL accounts
`

// Ralph processes:
// "Invoice processed: INV-2025-001234
//
// Match Results:
// - Line 1: Matched to PO-001 Line 1 (5x MacBook Pro) ✓
// - Line 2: Matched to PO-001 Line 2 (5x AppleCare) ✓
// - Tax: Matches expected rate (8%) ✓
//
// No exceptions. Ready for auto-approval."
```

### AI Contract Negotiation

```typescript
import { sally } from 'agents.do'

// Prepare for supplier negotiation
await sally`
  We're renewing our Salesforce contract:
  - Current annual spend: $450,000
  - Contract expires: March 31, 2025
  - Current discount: 15% off list

  Research:
  1. What are competitors paying? (benchmark data)
  2. What leverage do we have?
  3. What additional services should we negotiate?
  4. What's our BATNA?

  Provide negotiation strategy and target pricing.
`

// Sally provides:
// "NEGOTIATION BRIEF: Salesforce Renewal
//
// MARKET INTELLIGENCE:
// - Similar-sized companies averaging 25-30% discount
// - New competitors (HubSpot, Dynamics) actively pursuing accounts
// - Salesforce pushing multi-year deals for better rates
//
// LEVERAGE POINTS:
// - Contract expiring in 60 days - time pressure on both sides
// - 85% license utilization - room to right-size
// - Competitor quote in hand (HubSpot -40%)
//
// TARGET:
// - 30% discount (from 15%)
// - Right-size to 90% current licenses
// - Include Premier Support (currently paying extra)
// - 2-year term max (preserve flexibility)
//
// EXPECTED OUTCOME: $130,000 annual savings"
```

### AI Supplier Risk

```typescript
import { tom } from 'agents.do'

// Monitor supplier risk
await tom`
  Assess risk across our top 50 suppliers:
  1. Financial stability (public filings, credit ratings)
  2. Concentration risk (% of our spend, alternatives)
  3. Geographic risk (single source, political stability)
  4. Compliance risk (certifications, audits)
  5. Cyber risk (security posture, breaches)

  Flag any suppliers requiring immediate action.
`

// Tom monitors continuously:
// "SUPPLIER RISK ALERT
//
// HIGH RISK (Immediate Action Required):
// - SUP-047 (ChipTech Inc): Credit rating downgraded B- to C+
//   Action: Accelerate second-source qualification
//   Exposure: $2.1M annual spend, 90-day lead time
//
// MEDIUM RISK (Monitor):
// - SUP-012 (GlobalWidgets): 100% of Category X spend
//   Recommendation: Qualify alternative supplier
//
// - SUP-089 (DataCorp): SOC 2 certification expired
//   Action: Request updated certification"
```

### AI Purchase Recommendations

```typescript
import { priya } from 'agents.do'

// Smart recommendations
await priya`
  User wants to purchase 10 laptops for new hires.
  Based on:
  - Our preferred vendors and contracts
  - Historical purchases
  - Budget constraints
  - Delivery requirements

  Recommend:
  1. Best value option
  2. Best performance option
  3. Most compliant option

  Include pricing, availability, and approval requirements.
`
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

### Integration Architecture

```typescript
// ERP Integration
await procure.integrations.erp({
  system: 'netsuite', // or 'sap', 'oracle', 'dynamics'
  sync: {
    vendors: 'bidirectional',
    glAccounts: 'pull',
    purchaseOrders: 'push',
    invoices: 'push',
    payments: 'pull',
  },
  schedule: 'real-time', // or 'hourly', 'daily'
})

// Banking Integration
await procure.integrations.banking({
  provider: 'plaid', // or direct bank API
  accounts: ['operating', 'payables'],
  capabilities: ['balance', 'payments', 'reconciliation'],
})

// Supplier Portal
await procure.supplierPortal.configure({
  domain: 'suppliers.yourcompany.com',
  capabilities: [
    'view-pos',
    'submit-invoices',
    'update-profile',
    'view-payments',
    'upload-documents',
  ],
})
```

### Workflow Engine

```typescript
// Complex approval workflows
await procure.workflows.create({
  name: 'Capital Equipment Approval',
  trigger: {
    type: 'requisition',
    conditions: ['category = Capital', 'amount > 10000'],
  },
  steps: [
    {
      name: 'Manager Approval',
      type: 'approval',
      assignee: 'requestor.manager',
      sla: '2 business days',
    },
    {
      name: 'Budget Check',
      type: 'automatic',
      action: 'checkBudget',
      onFail: 'routeToFinance',
    },
    {
      name: 'IT Review',
      type: 'approval',
      assignee: 'it-team',
      condition: 'category = IT Equipment',
    },
    {
      name: 'Finance Approval',
      type: 'approval',
      assignee: 'finance-team',
      parallel: true,
    },
    {
      name: 'Executive Approval',
      type: 'approval',
      assignee: 'cfo',
      condition: 'amount > 50000',
    },
  ],
  escalation: {
    after: '5 business days',
    action: 'notifyProcurement',
  },
})
```

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
// Edge for requisitions, origin for analytics
await procure.config.hybrid({
  edge: ['requisitions', 'approvals', 'catalogs'],
  origin: ['invoices', 'payments', 'analytics'],
})
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
  <strong>coupa.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://coupa.do">Website</a> | <a href="https://docs.coupa.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
