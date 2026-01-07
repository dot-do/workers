# dynamics.do

> Microsoft Dynamics 365. Reimagined for AI. Open source.

[![npm version](https://img.shields.io/npm/v/dynamics.do.svg)](https://www.npmjs.com/package/dynamics.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The Problem

Enterprise CRM and ERP systems are broken.

**Microsoft Dynamics 365 costs $65-200 per user per month.** A 500-person company pays $390,000 to $1.2M annually just for licensing. Add implementation partners, Microsoft consultants, and ongoing maintenance — enterprises hemorrhage millions.

But the cost is only half the problem:

- **Vendor lock-in** — Your customer data trapped in Microsoft's ecosystem
- **Deployment complexity** — Months of implementation, armies of consultants
- **AI as afterthought** — Copilot bolted on, not built in
- **Licensing labyrinth** — Sales Professional vs. Enterprise vs. Premium vs. add-ons
- **Geographic restrictions** — Data residency nightmares, compliance theater

Meanwhile, the CRM itself? It's just CRUD operations over entities with business rules.

---

## The Solution

**dynamics.do** is an open-source, edge-native Dataverse alternative with AI at the core.

```bash
npx create-dotdo dynamics
```

One command. Your own Dynamics 365. Your data. Your rules.

| Dynamics 365 | dynamics.do |
|--------------|-------------|
| $65-200/user/month | **Free** (open source) |
| Months to deploy | **Minutes** |
| Microsoft data centers | **Your Cloudflare account** |
| AI is an add-on | **AI is the foundation** |
| Complex licensing | **MIT License** |
| Vendor lock-in | **OData v4 compatible** |

---

## Features

### Sales

Full CRM functionality out of the box:

- **Accounts & Contacts** — Company and person records with relationships
- **Leads** — Qualification workflows, lead scoring, conversion
- **Opportunities** — Pipeline management, probability forecasting
- **Quotes & Orders** — Product catalog, pricing rules, line items
- **Activities** — Tasks, emails, phone calls, appointments

### Customer Service

- **Cases** — Incident management with SLA tracking
- **Queues** — Routing rules, assignment logic
- **Knowledge Base** — Article management with AI search
- **Entitlements** — Service contracts and support terms

### Core Platform

- **Custom Entities** — Define any business object with relationships
- **Business Process Flows** — Visual stage-gate workflows
- **Business Rules** — No-code field validation and automation
- **Security Roles** — Row-level security, team hierarchies
- **Workflows** — Background and real-time automation

---

## OData v4 Compatible

Standard OData — existing Power Platform integrations work.

```bash
# Query accounts with related contacts
GET /api/data/v9.2/accounts?$select=name,revenue&$expand=contact_customer_accounts($select=fullname,emailaddress1)&$filter=revenue gt 1000000&$orderby=revenue desc&$top=10
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
const response = await fetch('/api/data/v9.2/accounts/Microsoft.Dynamics.CRM.FetchXml', {
  method: 'POST',
  body: JSON.stringify({
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
})
```

---

## AI-Native

dynamics.do is built for AI agents, not retrofitted.

### MCP Server

Every entity, every action — exposed as AI tools:

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

### Natural Language Queries

```typescript
import { dynamics } from 'dynamics.do'

// Ask questions, get answers
const result = await dynamics.ask('Show me all opportunities closing this quarter over $50k')

// AI translates to OData automatically
// GET /api/data/v9.2/opportunities?$filter=estimatedclosedate ge 2025-01-01 and estimatedclosedate le 2025-03-31 and estimatedvalue gt 50000
```

### Available MCP Tools

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

### AI-Powered Features

- **Predictive Lead Scoring** — ML models rank leads by likelihood to convert
- **Opportunity Insights** — Risk analysis, competitor intelligence
- **Smart Recommendations** — Next best action suggestions
- **Conversation Intelligence** — Call transcription and sentiment analysis
- **Email Intelligence** — Auto-draft responses, sentiment detection

---

## Quick Start

### One-Click Deploy

```bash
npx create-dotdo dynamics
```

This creates a new Cloudflare Worker with:
- Full dynamics.do deployment
- SQLite database per tenant
- Sample Sales entities configured
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
  industrycode: 1  // Accounting
})

// Query with OData
const opportunities = await client.opportunities.query({
  $filter: 'estimatedvalue gt 100000',
  $orderby: 'estimatedclosedate asc',
  $expand: 'customerid_account($select=name)'
})
```

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
                              Durable Objects
                         (One per Tenant/Organization)
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
               SQLite               Vectorize              R2
           (Entity Data)         (AI Embeddings)     (Attachments)
```

### Durable Objects Per Tenant

Each organization gets isolated:
- **SQLite database** — All entity data, relationships, metadata
- **Vectorize index** — Semantic search across records
- **R2 bucket** — Attachments, documents, images

### Tiered Storage

| Tier | Storage | Use Case |
|------|---------|----------|
| Hot | SQLite in DO | Active records, recent data |
| Warm | R2 | Archived records, attachments |
| Cold | R2 + Parquet | Historical analytics, compliance |

---

## Entity Model

dynamics.do uses a Dataverse-compatible entity model:

```typescript
// Define a custom entity
await client.metadata.createEntity({
  logicalName: 'new_project',
  displayName: 'Project',
  primaryAttribute: 'new_name',
  attributes: [
    { logicalName: 'new_name', type: 'string', maxLength: 200 },
    { logicalName: 'new_budget', type: 'money' },
    { logicalName: 'new_startdate', type: 'datetime' },
    { logicalName: 'new_status', type: 'picklist', options: [
      { value: 1, label: 'Not Started' },
      { value: 2, label: 'In Progress' },
      { value: 3, label: 'Completed' }
    ]}
  ],
  relationships: [
    {
      type: 'ManyToOne',
      relatedEntity: 'account',
      lookupAttribute: 'new_customerid'
    }
  ]
})
```

### Built-in Entities

| Entity | Description |
|--------|-------------|
| `account` | Companies and organizations |
| `contact` | Individual people |
| `lead` | Potential customers |
| `opportunity` | Sales opportunities |
| `quote` | Price proposals |
| `salesorder` | Confirmed orders |
| `invoice` | Billing records |
| `incident` | Service cases |
| `task` | To-do items |
| `email` | Email activities |
| `phonecall` | Call records |
| `appointment` | Calendar events |
| `product` | Product catalog |
| `pricelevel` | Price lists |
| `team` | User groups |
| `systemuser` | Users |
| `businessunit` | Organizational units |
| `role` | Security roles |

---

## Business Process Flows

Visual stage-gate workflows for any entity:

```typescript
await client.workflows.createBusinessProcess({
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

---

## Security Model

Row-level security matching Dynamics 365:

```typescript
// Create a security role
await client.security.createRole({
  name: 'Sales Representative',
  privileges: [
    { entity: 'account', create: 'User', read: 'BusinessUnit', write: 'User', delete: 'None' },
    { entity: 'opportunity', create: 'User', read: 'BusinessUnit', write: 'User', delete: 'User' },
    { entity: 'lead', create: 'User', read: 'BusinessUnit', write: 'User', delete: 'User' }
  ]
})
```

Access levels:
- **None** — No access
- **User** — Own records only
- **BusinessUnit** — Records in user's business unit
- **ParentChild** — Parent and child business units
- **Organization** — All records

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

## Local Development

```bash
# Start local server
npm run dev

# Connect with any OData client
# Base URL: http://localhost:8787/api/data/v9.2/
```

### Seed Sample Data

```bash
npm run seed

# Creates:
# - 100 accounts
# - 500 contacts
# - 200 opportunities
# - Sample products and price lists
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
```

Supported formats:
- Dynamics 365 Data Export JSON
- CSV with relationship mapping
- XrmToolBox export format

---

## Comparison

| Feature | Dynamics 365 | Salesforce | dynamics.do |
|---------|--------------|------------|-------------|
| Pricing | $65-200/user/mo | $25-330/user/mo | **Free** |
| Deployment | Months | Weeks | **Minutes** |
| Data Location | Microsoft | Salesforce | **Your infrastructure** |
| API | OData + Proprietary | REST + SOAP | **OData v4** |
| AI | Copilot (add-on) | Einstein (add-on) | **Built-in** |
| Customization | Power Platform | Force.com | **Code + No-code** |
| Open Source | No | No | **Yes (MIT)** |
| Vendor Lock-in | High | High | **None** |

---

## Roadmap

### Now
- Core CRUD operations
- OData v4 query support
- Basic entity metadata
- MCP server for AI

### Next
- Business Process Flows
- Security roles and row-level access
- FetchXML parser
- Change tracking and sync

### Later
- Plugins (pre/post operation)
- Real-time workflows
- Solution packaging
- Multi-tenant with isolation

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

### Architecture Docs

- [Entity Model](docs/entity-model.md)
- [OData Implementation](docs/odata.md)
- [Security Model](docs/security.md)
- [AI Integration](docs/ai.md)

---

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  <strong>Enterprise CRM, liberated.</strong><br/>
  Built on Cloudflare Workers. Designed for AI. Open to everyone.
</p>
