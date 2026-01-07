# dynamics.do

> Microsoft Dynamics 365. Reimagined for AI. Open source.

[![npm version](https://img.shields.io/npm/v/dynamics.do.svg)](https://www.npmjs.com/package/dynamics.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

Microsoft Dynamics 365 is the only enterprise platform that unifies CRM and ERP. Sales, Service, Finance, Supply Chain, HR - all on one data platform. But it costs $65-200+ per user per month, requires months of implementation, and locks you into Microsoft's ecosystem.

**dynamics.do** is the open-source alternative. One Dataverse. Every module. AI-native from day one. Deploy in minutes.

## The Problem

Enterprise CRM and ERP systems are broken.

**Microsoft Dynamics 365 costs $65-200 per user per month.** A 500-person company pays $390,000 to $1.2M annually just for licensing. Add implementation partners, Microsoft consultants, and ongoing maintenance - enterprises hemorrhage millions.

| Module | D365 Pricing | What You Get |
|--------|--------------|--------------|
| Sales Professional | $65/user/mo | Basic CRM |
| Sales Enterprise | $95/user/mo | Advanced CRM |
| Customer Service | $50-95/user/mo | Support desk |
| Finance | $180/user/mo | GL, AP, AR |
| Supply Chain | $180/user/mo | Inventory, procurement |
| Human Resources | $120/user/mo | HCM |
| **Full Suite** | **$500+/user/mo** | Everything |

For a 200-user company needing full CRM + ERP: **$1.2M/year minimum**.

But the cost is only half the problem:

- **Vendor lock-in** - Your business data trapped in Microsoft's ecosystem
- **Deployment complexity** - Months of implementation, armies of consultants
- **AI as afterthought** - Copilot bolted on, not built in
- **Licensing labyrinth** - Sales Professional vs. Enterprise vs. Premium vs. add-ons
- **Geographic restrictions** - Data residency nightmares, compliance theater

Meanwhile, the platform itself? It's Dataverse - CRUD operations over entities with business rules. We can build this.

---

## The Solution

**dynamics.do** is an open-source, edge-native Dataverse alternative with AI at the core.

```bash
npx create-dotdo dynamics
```

One command. Your own Dynamics 365. Your data. Your rules.

| Dynamics 365 | dynamics.do |
|--------------|-------------|
| $65-200+/user/month | **Free** (open source) |
| Months to deploy | **Minutes** |
| Microsoft data centers | **Your Cloudflare account** |
| AI is an add-on | **AI is the foundation** |
| Complex licensing | **MIT License** |
| Vendor lock-in | **OData v4 compatible** |

---

## Features

### Sales (CRM)

Full sales automation out of the box:

```typescript
import { dynamics } from 'dynamics.do'

// Create a lead
const lead = await dynamics.leads.create({
  firstname: 'John',
  lastname: 'Smith',
  companyname: 'Acme Corp',
  emailaddress1: 'john@acme.com',
  leadsourcecode: 'web'
})

// Qualify lead to opportunity
const { account, contact, opportunity } = await dynamics.leads.qualify(lead.id, {
  createAccount: true,
  createContact: true,
  createOpportunity: true
})

// Manage opportunity through pipeline
await dynamics.opportunities.update(opportunity.id, {
  estimatedvalue: 150000,
  estimatedclosedate: '2025-03-31',
  salesstage: 'propose'
})
```

**Included:**
- **Accounts & Contacts** - Company and person records with relationships
- **Leads** - Qualification workflows, lead scoring, conversion
- **Opportunities** - Pipeline management, probability forecasting
- **Quotes & Orders** - Product catalog, pricing rules, line items
- **Activities** - Tasks, emails, phone calls, appointments
- **Goals** - Sales quotas and KPI tracking

### Customer Service

Omnichannel support desk:

```typescript
// Create a case
const incident = await dynamics.incidents.create({
  title: 'Product not working as expected',
  customerid: 'CONTACT-001',
  caseorigincode: 'email',
  prioritycode: 'high',
  entitlementid: 'ENT-001'  // Links to service contract
})

// Track SLA
const sla = await dynamics.incidents.getSlaStatus(incident.id)
// { firstResponse: { due: '2025-01-15T10:00:00Z', status: 'in-progress' } }

// Route to queue
await dynamics.incidents.route(incident.id, { queue: 'tier-2-support' })

// Resolve
await dynamics.incidents.resolve(incident.id, {
  resolution: 'Provided configuration update',
  billabletime: 30
})
```

**Included:**
- **Cases** - Incident management with SLA tracking
- **Queues** - Routing rules, assignment logic
- **Knowledge Base** - Article management with AI search
- **Entitlements** - Service contracts and support terms
- **Omnichannel** - Chat, email, voice unified routing

### Finance

Enterprise-grade financial management:

```typescript
// General Ledger
await dynamics.finance.journalEntry({
  journalType: 'daily',
  date: '2025-01-15',
  lines: [
    { account: '6100-00', debit: 5000, dimension: { department: 'Engineering' } },
    { account: '2100-00', credit: 5000 }
  ]
})

// Accounts Receivable
const invoice = await dynamics.finance.customerInvoice({
  customer: 'CUST-001',
  lines: [
    { item: 'SERV-001', quantity: 10, unitPrice: 500 }
  ],
  paymentTerms: 'Net30'
})

// Apply payment
await dynamics.finance.customerPayment({
  customer: 'CUST-001',
  amount: 5000,
  invoices: [{ invoice: invoice.id, amount: 5000 }]
})

// Accounts Payable
const vendorInvoice = await dynamics.finance.vendorInvoice({
  vendor: 'VEND-001',
  invoiceNumber: 'INV-12345',
  lines: [
    { account: '5100-00', amount: 10000, description: 'Raw materials' }
  ]
})

// Payment proposal
const proposal = await dynamics.finance.paymentProposal({
  vendors: 'all',
  dueBy: '2025-01-31',
  method: 'ACH'
})
```

**Included:**
- **General Ledger** - Chart of accounts, journal entries, dimensions
- **Accounts Receivable** - Customer invoicing, payments, aging
- **Accounts Payable** - Vendor bills, payment processing
- **Cash Management** - Bank accounts, reconciliation
- **Fixed Assets** - Asset tracking, depreciation
- **Budgeting** - Budget creation, variance analysis
- **Financial Reporting** - Statements, consolidation

### Supply Chain Management

End-to-end supply chain operations:

```typescript
// Inventory Management
await dynamics.inventory.adjust({
  item: 'WIDGET-001',
  warehouse: 'WH-01',
  quantity: 100,
  reason: 'physical-count'
})

// Check availability across locations
const availability = await dynamics.inventory.availability('WIDGET-001')
// { total: 500, byWarehouse: { 'WH-01': 300, 'WH-02': 200 }, reserved: 50, available: 450 }

// Procurement
const po = await dynamics.procurement.purchaseOrder({
  vendor: 'VEND-001',
  lines: [
    { item: 'RAW-001', quantity: 1000, unitPrice: 5.00 }
  ],
  requestedDate: '2025-02-01'
})

// Receive against PO
await dynamics.procurement.productReceipt({
  purchaseOrder: po.id,
  lines: [{ item: 'RAW-001', quantity: 1000 }]
})

// Sales Order fulfillment
const salesOrder = await dynamics.sales.salesOrder({
  customer: 'CUST-001',
  lines: [
    { item: 'WIDGET-001', quantity: 50 }
  ]
})

// Create shipment
await dynamics.warehouse.createShipment({
  salesOrder: salesOrder.id,
  warehouse: 'WH-01'
})
```

**Included:**
- **Inventory Management** - Stock levels, movements, valuation
- **Warehouse Management** - Locations, picking, packing
- **Procurement** - Purchase orders, vendor management
- **Sales Order Processing** - Order entry, fulfillment
- **Transportation** - Shipment management, carrier integration
- **Master Planning** - MRP, demand forecasting

### Project Operations

Project-based businesses:

```typescript
// Create project
const project = await dynamics.projects.create({
  name: 'Website Redesign',
  customer: 'CUST-001',
  type: 'time-and-material',
  startDate: '2025-02-01',
  endDate: '2025-04-30',
  budget: 75000
})

// Add work breakdown structure
await dynamics.projects.addTasks(project.id, [
  { name: 'Discovery', hours: 40, assignee: 'USR-001' },
  { name: 'Design', hours: 80, assignee: 'USR-002', predecessor: 'Discovery' },
  { name: 'Development', hours: 200, assignee: 'USR-003', predecessor: 'Design' }
])

// Record time
await dynamics.projects.timeEntry({
  project: project.id,
  task: 'Discovery',
  hours: 8,
  date: '2025-02-03',
  description: 'Requirements gathering'
})

// Generate invoice
await dynamics.projects.invoice(project.id, {
  throughDate: '2025-02-28',
  includeExpenses: true
})
```

**Included:**
- **Project Planning** - WBS, scheduling, resource allocation
- **Time & Expense** - Entry, approval workflows
- **Project Accounting** - Budgets, actuals, recognition
- **Resource Management** - Skills, availability, utilization
- **Billing** - Time-and-material, fixed-price, milestones

### Human Resources

Complete HCM solution:

```typescript
// Employee lifecycle
const employee = await dynamics.hr.hire({
  name: 'Alice Johnson',
  position: 'Software Engineer',
  department: 'Engineering',
  startDate: '2025-02-15',
  compensation: { salary: 120000, currency: 'USD' }
})

// Benefits enrollment
await dynamics.hr.enrollBenefits(employee.id, {
  plans: ['medical-hmo', 'dental', '401k'],
  coverage: { medical: 'employee+family' }
})

// Leave management
await dynamics.hr.requestLeave({
  employee: employee.id,
  type: 'vacation',
  startDate: '2025-03-10',
  endDate: '2025-03-14'
})

// Performance review
await dynamics.hr.performanceReview({
  employee: employee.id,
  period: '2024',
  rating: 4,
  goals: [
    { objective: 'Ship authentication system', result: 'exceeded' }
  ]
})
```

**Included:**
- **Core HR** - Employee records, org structure
- **Recruiting** - Job postings, applications, hiring
- **Onboarding** - Task workflows, document collection
- **Benefits** - Enrollment, life events
- **Leave Management** - Accruals, requests, approvals
- **Performance** - Goals, reviews, feedback
- **Compensation** - Pay structures, adjustments

---

## OData v4 Compatible

Standard OData - existing Power Platform integrations work.

```bash
# Query accounts with related contacts
GET /api/data/v9.2/accounts?$select=name,revenue&$expand=contact_customer_accounts($select=fullname,emailaddress1)&$filter=revenue gt 1000000&$orderby=revenue desc&$top=10

# Create a sales order
POST /api/data/v9.2/salesorders
Content-Type: application/json
{
  "customerid_account@odata.bind": "/accounts(12345)",
  "name": "SO-2025-001"
}

# Execute action
POST /api/data/v9.2/leads(67890)/Microsoft.Dynamics.CRM.QualifyLead
Content-Type: application/json
{
  "CreateAccount": true,
  "CreateContact": true,
  "CreateOpportunity": true
}
```

Every OData operation you know:

| Operation | Example |
|-----------|---------|
| `$select` | Return specific fields |
| `$filter` | Query conditions with operators |
| `$expand` | Include related entities |
| `$orderby` | Sort results |
| `$top` / `$skip` | Pagination |
| `$count` | Include total count |
| `$search` | Full-text search |
| `$apply` | Aggregations and grouping |

### FetchXML Support

```typescript
const response = await dynamics.query({
  fetchXml: `
    <fetch mapping="logical" count="50">
      <entity name="account">
        <attribute name="name" />
        <attribute name="revenue" />
        <filter>
          <condition attribute="statecode" operator="eq" value="0" />
        </filter>
        <order attribute="revenue" descending="true" />
      </entity>
    </fetch>
  `
})
```

---

## AI-Native

dynamics.do is built for AI agents, not retrofitted.

### Natural Language Everything

```typescript
import { dynamics } from 'dynamics.do'

// Sales queries
const deals = await dynamics.ask('Show me all opportunities closing this quarter over $50k')

// Finance queries
const aging = await dynamics.ask('What invoices are past due?')

// Supply chain
const stock = await dynamics.ask('Which items are below reorder point?')

// HR queries
const headcount = await dynamics.ask('How many engineers have we hired this year?')
```

### AI Agents for Every Module

```typescript
import { sally, ada, ralph } from 'dynamics.do/agents'

// Sales agent
await sally`
  Review the pipeline for Q1.
  Identify deals at risk of slipping.
  Create follow-up tasks for the sales team.
`

// Finance agent
await ada`
  Run month-end close for January.
  Generate variance analysis vs budget.
  Flag any unusual transactions.
`

// Operations agent
await ralph`
  Check inventory levels against demand forecast.
  Create purchase orders for items below safety stock.
  Optimize warehouse replenishment.
`
```

### AI-Powered Automation

**Sales Intelligence:**
- Predictive lead scoring
- Opportunity risk analysis
- Next best action recommendations
- Email sentiment detection

**Finance Intelligence:**
- Anomaly detection in transactions
- Cash flow forecasting
- Automated bank reconciliation
- Invoice matching

**Supply Chain Intelligence:**
- Demand forecasting
- Inventory optimization
- Supplier risk scoring
- Delivery prediction

### MCP Server

Every entity, every action - exposed as AI tools:

```json
{
  "mcpServers": {
    "dynamics": {
      "command": "npx",
      "args": ["dynamics.do-mcp"],
      "env": {
        "DYNAMICS_URL": "https://your-dynamics.workers.dev",
        "DYNAMICS_TOKEN": "your-token"
      }
    }
  }
}
```

Available tools:

| Tool | Description |
|------|-------------|
| `dynamics_query` | Query any entity with natural language or OData |
| `dynamics_create` | Create new records |
| `dynamics_update` | Update existing records |
| `dynamics_delete` | Delete records |
| `dynamics_execute` | Run actions and functions |
| `dynamics_metadata` | Explore entity definitions |
| `dynamics_associate` | Create relationships between records |
| `dynamics_workflow` | Trigger business process flows |
| `dynamics_finance` | Financial operations |
| `dynamics_inventory` | Inventory operations |

---

## Architecture

```
                                    dynamics.do
                                        |
              +-----------+-------------+-------------+-----------+
              |           |             |             |           |
          OData v4    FetchXML    MCP Server     WebSocket    RPC
              |           |             |             |           |
              +-----------+-------------+-------------+-----------+
                                        |
                              Query Translator
                                        |
                    +-------------------+-------------------+
                    |                                       |
            Entity Router                           Security Layer
                    |                                       |
                    +-------------------+-------------------+
                                        |
                        +---------------+---------------+
                        |               |               |
                  +----------+    +----------+    +----------+
                  |  Sales   |    | Finance  |    |  Supply  |
                  |   DO     |    |   DO     |    | Chain DO |
                  +----------+    +----------+    +----------+
                        |               |               |
                    +-------+-------+-------+-------+-------+
                    |       |       |       |       |       |
                 SQLite  SQLite  SQLite  SQLite  SQLite   R2
                 (CRM)   (GL)    (AP/AR) (Inv)   (HR)   (Docs)
```

### Durable Objects Per Module

Each business domain runs in its own Durable Object:

| Durable Object | Module | Entities |
|----------------|--------|----------|
| `SalesDO` | Sales | Account, Contact, Lead, Opportunity, Quote, Order |
| `ServiceDO` | Customer Service | Case, Queue, Knowledge, Entitlement |
| `FinanceDO` | Finance | Journal, Customer Invoice, Vendor Invoice, Payment |
| `InventoryDO` | Supply Chain | Item, Warehouse, Stock, Movement |
| `ProcurementDO` | Procurement | Vendor, PO, Receipt |
| `ProjectDO` | Project Ops | Project, Task, Time, Expense |
| `HRDO` | Human Resources | Employee, Position, Leave, Performance |

### Cross-Module Integration

The magic of unified CRM+ERP - transactions flow automatically:

```typescript
// When a sales order is confirmed:
// 1. SalesDO creates the order
// 2. InventoryDO reserves stock
// 3. FinanceDO creates revenue recognition schedule
// 4. ProjectDO creates project (if project-based)

const salesOrder = await dynamics.sales.confirm('SO-001')
// All of the above happens transactionally
```

### Tiered Storage

| Tier | Storage | Use Case |
|------|---------|----------|
| Hot | SQLite in DO | Active records, recent transactions |
| Warm | R2 | Historical data, closed periods |
| Cold | R2 + Parquet | Analytics, compliance retention |

---

## Built-in Entities

### Sales & Marketing

| Entity | Description |
|--------|-------------|
| `account` | Companies and organizations |
| `contact` | Individual people |
| `lead` | Potential customers |
| `opportunity` | Sales opportunities |
| `quote` | Price proposals |
| `salesorder` | Confirmed orders |
| `product` | Product catalog |
| `pricelevel` | Price lists |
| `campaign` | Marketing campaigns |

### Customer Service

| Entity | Description |
|--------|-------------|
| `incident` | Service cases |
| `queue` | Work queues |
| `knowledgearticle` | Knowledge base |
| `entitlement` | Service contracts |

### Finance

| Entity | Description |
|--------|-------------|
| `msdyn_journalentry` | General ledger entries |
| `invoice` | Customer invoices |
| `msdyn_vendorinvoice` | Vendor bills |
| `msdyn_payment` | Payment records |
| `msdyn_fixedasset` | Fixed assets |

### Supply Chain

| Entity | Description |
|--------|-------------|
| `msdyn_warehouse` | Storage locations |
| `msdyn_inventoryadjustment` | Stock adjustments |
| `msdyn_purchaseorder` | Purchase orders |
| `msdyn_productreceipt` | Goods receipt |

### Human Resources

| Entity | Description |
|--------|-------------|
| `msdyn_employee` | Workers |
| `msdyn_position` | Job positions |
| `msdyn_leaverequest` | Time off requests |
| `msdyn_performancereview` | Reviews |

---

## Business Process Flows

Visual stage-gate workflows for any entity:

```typescript
await dynamics.workflows.createBusinessProcess({
  name: 'Lead to Opportunity',
  entity: 'lead',
  stages: [
    {
      name: 'Qualify',
      steps: [
        { attribute: 'companyname', required: true },
        { attribute: 'emailaddress1', required: true },
        { attribute: 'telephone1', required: false }
      ]
    },
    {
      name: 'Develop',
      steps: [
        { attribute: 'budgetamount', required: true },
        { attribute: 'decisionmaker', required: true }
      ]
    },
    {
      name: 'Propose',
      steps: [
        { attribute: 'qualifyingopportunityid', required: true }
      ]
    }
  ]
})
```

### Finance Workflows

```typescript
await dynamics.workflows.createApproval({
  name: 'Vendor Invoice Approval',
  entity: 'msdyn_vendorinvoice',
  conditions: [
    { when: 'amount > 10000', require: 'manager' },
    { when: 'amount > 50000', require: 'director' },
    { when: 'amount > 100000', require: 'cfo' }
  ]
})
```

---

## Security Model

Row-level security matching Dynamics 365:

```typescript
// Create a security role
await dynamics.security.createRole({
  name: 'Sales Representative',
  privileges: [
    { entity: 'account', create: 'User', read: 'BusinessUnit', write: 'User', delete: 'None' },
    { entity: 'opportunity', create: 'User', read: 'BusinessUnit', write: 'User', delete: 'User' },
    { entity: 'lead', create: 'User', read: 'BusinessUnit', write: 'User', delete: 'User' }
  ]
})

// Finance role with sensitive access
await dynamics.security.createRole({
  name: 'Accounts Payable Clerk',
  privileges: [
    { entity: 'msdyn_vendorinvoice', create: 'BusinessUnit', read: 'BusinessUnit', write: 'BusinessUnit' },
    { entity: 'msdyn_payment', create: 'None', read: 'BusinessUnit', write: 'None' }  // Can't create payments
  ]
})
```

Access levels:
- **None** - No access
- **User** - Own records only
- **BusinessUnit** - Records in user's business unit
- **ParentChild** - Parent and child business units
- **Organization** - All records

---

## Power Platform Compatibility

dynamics.do exposes the same APIs Power Platform expects:

### Power Apps

```javascript
// In Power Apps, your dynamics.do instance works like Dataverse
ClearCollect(Accounts, Filter(accounts, revenue > 1000000))
```

### Power Automate

```yaml
trigger:
  type: dataverse
  entity: opportunity
  event: create

actions:
  - sendEmail:
      to: sales-team@company.com
      subject: "New Opportunity: {triggerOutputs()?['body/name']}"
```

### Power BI

Connect via OData feed:
```
https://your-dynamics.workers.dev/api/data/v9.2/
```

---

## Quick Start

### One-Click Deploy

```bash
npx create-dotdo dynamics

# Follow prompts:
# - Organization name
# - Modules to enable (Sales, Service, Finance, Supply Chain, HR)
# - Base currency
# - Fiscal year
```

This creates a new Cloudflare Worker with:
- Full dynamics.do deployment
- SQLite database per module
- Sample data for selected modules
- MCP server endpoint enabled

### Manual Setup

```bash
git clone https://github.com/dot-do/dynamics.git
cd dynamics
npm install
npm run deploy
```

### Connect

```typescript
import { DynamicsClient } from 'dynamics.do'

const client = new DynamicsClient({
  url: 'https://your-dynamics.workers.dev',
  token: 'your-token'
})

// Create an account
const account = await client.accounts.create({
  name: 'Contoso Ltd',
  revenue: 5000000,
  industrycode: 1
})

// Create a customer invoice (Finance)
const invoice = await client.finance.customerInvoice({
  customer: account.id,
  lines: [{ item: 'SERV-001', amount: 10000 }]
})
```

---

## Migration from Dynamics 365

### Export from Dynamics

```bash
# Use Dynamics 365 Data Export Service or XrmToolBox
dynamics365-export --environment contoso.crm.dynamics.com --entities account,contact,opportunity --output ./export
```

### Import to dynamics.do

```bash
npx dynamics.do import ./export --url https://your-dynamics.workers.dev

# Migrates:
# - All entity data
# - Relationships
# - Custom entities
# - Business process flows
# - Security roles
```

Supported formats:
- Dynamics 365 Data Export JSON
- CSV with relationship mapping
- XrmToolBox export format
- Solution package (.zip)

---

## Comparison

| Feature | Dynamics 365 | Salesforce | SAP | dynamics.do |
|---------|--------------|------------|-----|-------------|
| Pricing | $65-200/user/mo | $25-330/user/mo | $95-500/user/mo | **Free** |
| CRM | Yes | Yes | Limited | **Yes** |
| ERP | Yes | No | Yes | **Yes** |
| Unified Platform | Yes | No | No | **Yes** |
| Deployment | Months | Weeks | Months | **Minutes** |
| AI | Copilot (add-on) | Einstein (add-on) | SAP AI (add-on) | **Built-in** |
| Open Source | No | No | No | **Yes (MIT)** |

### Cost Comparison

**200-user company needing CRM + ERP:**

| | Dynamics 365 | dynamics.do |
|-|--------------|-------------|
| Sales (100 users) | $79,200/yr | $0 |
| Service (50 users) | $47,500/yr | $0 |
| Finance (30 users) | $64,800/yr | $0 |
| Supply Chain (20 users) | $43,200/yr | $0 |
| **Annual Total** | **$234,700** | **$5** (Workers) |
| **5-Year TCO** | **$1,500,000+** | **$300** |

---

## Roadmap

### Now
- [x] Core CRUD operations
- [x] OData v4 query support
- [x] Sales entities
- [x] Customer Service entities
- [x] MCP server for AI

### Next
- [ ] Finance module (GL, AP, AR)
- [ ] Supply Chain (Inventory, Procurement)
- [ ] Business Process Flows
- [ ] Security roles and row-level access
- [ ] FetchXML parser

### Later
- [ ] Project Operations
- [ ] Human Resources
- [ ] Plugins (pre/post operation)
- [ ] Real-time workflows
- [ ] Solution packaging
- [ ] Multi-currency
- [ ] Consolidation

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Quick Start](./docs/quickstart.mdx) | Deploy in 5 minutes |
| [Sales Module](./docs/sales.mdx) | CRM functionality |
| [Finance Module](./docs/finance.mdx) | Financial management |
| [Supply Chain](./docs/supply-chain.mdx) | Inventory and procurement |
| [AI Features](./docs/ai.mdx) | Natural language, agents |
| [OData API](./docs/odata.mdx) | API reference |
| [Security](./docs/security.mdx) | Roles and permissions |
| [Migration](./docs/migration.mdx) | Moving from Dynamics 365 |

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

### Development

```bash
git clone https://github.com/dot-do/dynamics.git
cd dynamics
npm install
npm test
npm run dev
```

### Key Areas

- Finance module implementation
- Supply Chain entities
- OData query translation
- Business Process Flow engine
- Security model

---

## License

MIT - see [LICENSE](LICENSE)

---

<p align="center">
  <strong>The complete business platform, liberated.</strong><br/>
  CRM + ERP. Built on Cloudflare Workers. Designed for AI. Open to everyone.
</p>
