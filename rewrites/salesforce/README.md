# salesforce.do

> The world's #1 CRM. Now open source. AI-native.

Salesforce revolutionized how businesses manage customer relationships. But at $25-330 per user per month, with AI "Einstein" features locked behind premium tiers, and complete vendor lock-in, it's time for a new approach.

**salesforce.do** reimagines CRM for the AI era. One-click deploy your own Salesforce org. No per-seat pricing. AI at the core. SOQL-compatible.

## The Problem

Salesforce built a $200B+ empire on:

- **Per-seat pricing** - $25-330/user/month scales to millions in enterprise
- **AI as premium upsell** - Einstein costs extra, on top of already expensive seats
- **Platform lock-in** - Custom Objects, Apex, Flows trap your data and logic
- **Complexity tax** - Consultants, admins, developers just to operate
- **No self-hosting** - Your customer data lives on their servers, period

A 100-person sales team on Enterprise Edition? **$200k/year minimum**. With AI features? Double it.

## The Solution

**salesforce.do** is Salesforce reimagined:

```
Traditional Salesforce          salesforce.do
-----------------------------------------------------------------
$25-330/user/month              $0 - run your own
Einstein AI premium             AI-native from day one
Vendor lock-in                  Open source, MIT licensed
Their servers                   Your Cloudflare account
Apex proprietary                TypeScript
SOQL queries                    SOQL queries (compatible!)
Custom Objects                  Custom Objects (compatible!)
Triggers                        Triggers (TypeScript)
Flows                           Workflows (code-first)
```

## One-Click Deploy

```bash
npx create-dotdo salesforce
```

That's it. Your own Salesforce org. Running on Cloudflare.

Or deploy the full stack manually:

```bash
git clone https://github.com/dotdo/salesforce.do
cd salesforce.do
npm install
npm run deploy
```

Your data. Your infrastructure. Your rules.

## Features

### Standard Objects

All the CRM objects you know:

| Object | Description |
|--------|-------------|
| **Account** | Companies and organizations |
| **Contact** | People at accounts |
| **Lead** | Prospects before conversion |
| **Opportunity** | Sales deals in progress |
| **Case** | Customer support tickets |
| **Task** | To-dos and activities |
| **Event** | Calendar entries |
| **Campaign** | Marketing campaigns |
| **Product** | What you sell |
| **PriceBook** | Pricing configurations |

### Custom Objects

Define your own objects with full metadata:

```typescript
import { SObject } from 'salesforce.do'

export const Invoice__c = SObject({
  name: 'Invoice__c',
  label: 'Invoice',
  fields: {
    Amount__c: { type: 'Currency', required: true },
    Status__c: { type: 'Picklist', values: ['Draft', 'Sent', 'Paid'] },
    Account__c: { type: 'Lookup', referenceTo: 'Account' },
    DueDate__c: { type: 'Date' },
  },
  triggers: {
    beforeInsert: async (records) => {
      // Auto-generate invoice numbers
    },
    afterUpdate: async (records, oldRecords) => {
      // Send notification on status change
    },
  },
})
```

### Triggers

React to data changes with TypeScript triggers:

```typescript
import { Trigger } from 'salesforce.do'

export const OpportunityTrigger = Trigger('Opportunity', {
  afterUpdate: async (newRecords, oldRecords, context) => {
    for (const [opp, oldOpp] of zip(newRecords, oldRecords)) {
      if (opp.StageName === 'Closed Won' && oldOpp.StageName !== 'Closed Won') {
        await context.insert('Task', {
          Subject: `Onboard ${opp.Name}`,
          WhatId: opp.Id,
          OwnerId: opp.OwnerId,
        })
      }
    }
  },
})
```

### Flows (Workflows)

Orchestrate complex processes:

```typescript
import { Flow } from 'salesforce.do'

export const LeadConversion = Flow({
  name: 'Convert Lead to Opportunity',
  trigger: {
    object: 'Lead',
    when: 'Status changes to Qualified',
  },
  steps: [
    { action: 'createRecord', object: 'Account', mapping: { Name: '{!Lead.Company}' } },
    { action: 'createRecord', object: 'Contact', mapping: { AccountId: '{!Account.Id}' } },
    { action: 'createRecord', object: 'Opportunity', mapping: { AccountId: '{!Account.Id}' } },
    { action: 'updateRecord', object: 'Lead', values: { IsConverted: true } },
  ],
})
```

## SOQL Compatible

Write SOQL queries exactly like Salesforce:

```sql
SELECT Id, Name, Amount, StageName
FROM Opportunity
WHERE StageName != 'Closed Lost'
  AND Amount > 50000
  AND CloseDate = THIS_QUARTER
ORDER BY Amount DESC
LIMIT 10
```

Relationship queries work too:

```sql
SELECT Id, Name,
  (SELECT Id, LastName, Email FROM Contacts),
  (SELECT Id, Amount, StageName FROM Opportunities WHERE IsClosed = false)
FROM Account
WHERE Industry = 'Technology'
```

The SOQL parser compiles to SQLite - your queries run locally, instantly.

## AI-Native

### Natural Language Queries

Skip SOQL entirely:

```typescript
import { sf } from 'salesforce.do'

// Natural language to SOQL
const deals = await sf`show me all deals over $100k closing this quarter`
const contacts = await sf`who are the decision makers at Acme Corp?`
const pipeline = await sf`what's our pipeline by stage?`
```

### AI Agents as CRM Users

AI agents work alongside humans:

```typescript
import { ralph, sally } from 'agents.do'
import { sf } from 'salesforce.do'

// AI SDR qualifies leads
await sally`qualify all new leads from yesterday and update their status`

// AI creates follow-up tasks
await ralph`create follow-up tasks for all opportunities with no activity in 14 days`
```

### MCP Tools for Every Object

Every SObject automatically exposes MCP tools:

```typescript
// Auto-generated MCP tools
sf.Account.create(data)    // Create account
sf.Account.read(id)        // Get account by ID
sf.Account.update(id, data) // Update account
sf.Account.delete(id)       // Delete account
sf.Account.query(soql)      // Query accounts
sf.Account.describe()       // Get metadata
```

AI assistants can directly manipulate CRM data through the Model Context Protocol.

## jsforce Compatible

Existing jsforce integrations work out of the box:

```typescript
import jsforce from 'jsforce'

// Point jsforce at your salesforce.do instance
const conn = new jsforce.Connection({
  loginUrl: 'https://your-org.salesforce.do',
})

await conn.login('user@example.com', 'password')

// All jsforce APIs work
const accounts = await conn.query('SELECT Id, Name FROM Account')
const result = await conn.sobject('Contact').create({ LastName: 'Smith' })
await conn.sobject('Lead').update({ Id: '001...', Status: 'Qualified' })
```

Your existing Salesforce integrations, data loaders, and tools continue working.

## Architecture

### Durable Object per SObject Type

Each object type runs in its own Durable Object with co-located SQLite:

```
OrgDO (metadata, users, permissions)
  |
  +-- AccountDO (all Account records)
  +-- ContactDO (all Contact records)
  +-- OpportunityDO (all Opportunity records)
  +-- LeadDO (all Lead records)
  +-- Invoice__cDO (custom object)
```

### Storage Tiers

- **Hot (SQLite)** - Recent records, frequently accessed
- **Warm (R2)** - Historical data, queryable
- **Cold (R2 Archive)** - Compliance retention, compressed

### SOQL to SQLite

The SOQL parser handles:
- SELECT, WHERE, ORDER BY, LIMIT, OFFSET
- Relationship queries (parent and child)
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- Date literals (TODAY, THIS_WEEK, LAST_N_DAYS:30)
- TYPEOF for polymorphic relationships

### Multi-Tenancy

One deployment supports unlimited orgs:

```
your-company.salesforce.do     <- Your org
client-a.salesforce.do         <- Client A's org
client-b.salesforce.do         <- Client B's org
```

Each org has isolated data, users, and custom objects.

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo salesforce
# Deploys to your Cloudflare account
```

### Docker

```bash
docker run -p 8787:8787 dotdo/salesforce
```

### Self-Hosted

```bash
git clone https://github.com/dotdo/salesforce.do
cd salesforce.do
npm install
npm run dev    # Local development
npm run deploy # Production deployment
```

## Roadmap

- [x] Standard Objects (Account, Contact, Lead, Opportunity, Case)
- [x] Custom Objects with metadata
- [x] SOQL parser and query engine
- [x] Triggers (before/after insert/update/delete)
- [x] jsforce compatibility layer
- [ ] Flows (visual workflow builder)
- [ ] Reports and Dashboards
- [ ] Approval Processes
- [ ] Permission Sets and Profiles
- [ ] Lightning Web Components runtime
- [ ] Apex runtime (subset)
- [ ] Data Loader compatibility

## Why Open Source?

CRM is too important to be locked away:

1. **Your data** - Customer relationships are your business's lifeblood
2. **Your logic** - Automations and workflows encode how you operate
3. **Your cost structure** - Per-seat pricing shouldn't scale to millions
4. **Your AI** - Intelligence on your data should be yours

Salesforce showed the world what CRM could be. **salesforce.do** makes it accessible to everyone.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- SOQL parser extensions
- Standard object implementations
- jsforce compatibility
- AI/MCP integrations
- Documentation and examples

## License

MIT License - Use it however you want. Build your business on it. Sell it to your clients. Fork it and make it your own.

---

<p align="center">
  <strong>salesforce.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://salesforce.do">Website</a> | <a href="https://docs.salesforce.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
