# [opensaas.org](https://opensaas.org)

> Clone any SaaS. Own your data. Pay 99% less.

```typescript
import { crm } from 'hubspot.do'
import { db } from 'firebase.do'
import { files } from 'fsx.do'

// Your HubSpot. Your Firebase. Your infrastructure.
// Open source. Self-hostable. MIT licensed.
```

## The Problem

You're paying $43,200/year for HubSpot Enterprise.
You're paying $150,000/year for Salesforce.
You're paying $50,000/year for ServiceNow.

For what? CRM features that haven't changed in a decade. Data you can't export. AI features sold as "premium add-ons."

**Your data. Their servers. Their prices.**

## The Solution

65+ open source clones of billion-dollar SaaS companies.

| Clone | Replaces | Savings |
|-------|----------|---------|
| [hubspot.do](https://hubspot.do) | HubSpot ($43K/yr) | ~$42,940/yr |
| [salesforce.do](https://salesforce.do) | Salesforce ($150K/yr) | ~$149,500/yr |
| [servicenow.do](https://servicenow.do) | ServiceNow ($100K/yr) | ~$99,500/yr |
| [zendesk.do](https://zendesk.do) | Zendesk ($25K/yr) | ~$24,900/yr |
| [firebase.do](https://firebase.do) | Firebase ($10K/yr) | ~$9,900/yr |

**Same APIs. Your infrastructure. 99% cost reduction.**

## How It Works

Every clone is:

1. **API Compatible** - Drop-in replacement for the original
2. **Self-Hostable** - Run on your Cloudflare account
3. **Open Source** - MIT licensed, fork it, modify it
4. **AI-Native** - MCP tools built in for AI agents

```typescript
// Before: Pay HubSpot $3,600/month
import { Client } from '@hubspot/api-client'
const hubspot = new Client({ accessToken: process.env.HUBSPOT_TOKEN })
await hubspot.crm.contacts.basicApi.create({ properties: { email, name } })

// After: Pay ~$5/month for the same usage
import { crm } from 'hubspot.do'
await crm.contacts.create({ email, name })
```

Same code. Different bill.

## The Catalog

### CRM & Sales

| Package | Clones | Market Cap |
|---------|--------|------------|
| [salesforce.do](https://github.com/opensaas/salesforce) | Salesforce | $200B |
| [hubspot.do](https://github.com/opensaas/hubspot) | HubSpot | $30B |
| [pipedrive.do](https://github.com/opensaas/pipedrive) | Pipedrive | $1.5B |
| [zendesk.do](https://github.com/opensaas/zendesk) | Zendesk | $10B |
| [intercom.do](https://github.com/opensaas/intercom) | Intercom | $1.3B |
| [zoho.do](https://github.com/opensaas/zoho) | Zoho CRM | Private |

### HR & People

| Package | Clones | Market Cap |
|---------|--------|------------|
| [workday.do](https://github.com/opensaas/workday) | Workday | $60B |
| [bamboohr.do](https://github.com/opensaas/bamboohr) | BambooHR | $3B |
| [gusto.do](https://github.com/opensaas/gusto) | Gusto | $10B |
| [rippling.do](https://github.com/opensaas/rippling) | Rippling | $13B |

### Operations & Field Service

| Package | Clones | Market Cap |
|---------|--------|------------|
| [servicenow.do](https://github.com/opensaas/servicenow) | ServiceNow | $150B |
| [servicetitan.do](https://github.com/opensaas/servicetitan) | ServiceTitan | $10B |
| [procore.do](https://github.com/opensaas/procore) | Procore | $10B |

### Analytics & BI

| Package | Clones | Market Cap |
|---------|--------|------------|
| [tableau.do](https://github.com/opensaas/tableau) | Tableau | Acq. $15B |
| [looker.do](https://github.com/opensaas/looker) | Looker | Acq. $2.6B |
| [mixpanel.do](https://github.com/opensaas/mixpanel) | Mixpanel | $1B |
| [amplitude.do](https://github.com/opensaas/amplitude) | Amplitude | $1.2B |
| [posthog.do](https://github.com/opensaas/posthog) | PostHog | $450M |
| [datadog.do](https://github.com/opensaas/datadog) | Datadog | $30B |
| [sentry.do](https://github.com/opensaas/sentry) | Sentry | $3B |

### Data & Databases

| Package | Clones | Market Cap |
|---------|--------|------------|
| [firebase.do](https://github.com/opensaas/firebase) | Firebase | Google |
| [supabase.do](https://github.com/opensaas/supabase) | Supabase | $2B |
| [mongo.do](https://github.com/opensaas/mongo) | MongoDB | $15B |
| [redis.do](https://github.com/opensaas/redis) | Redis | $2B |
| [convex.do](https://github.com/opensaas/convex) | Convex | $500M |
| [turso.do](https://github.com/opensaas/turso) | Turso | $100M |

### Data Warehouses

| Package | Clones | Market Cap |
|---------|--------|------------|
| [snowflake.do](https://github.com/opensaas/snowflake) | Snowflake | $50B |
| [databricks.do](https://github.com/opensaas/databricks) | Databricks | $43B |
| [firebolt.do](https://github.com/opensaas/firebolt) | Firebolt | $1.4B |

### Developer Tools

| Package | Clones | Market Cap |
|---------|--------|------------|
| [linear.do](https://github.com/opensaas/linear) | Linear | $400M |
| [jira.do](https://github.com/opensaas/jira) | Jira | Atlassian |
| [asana.do](https://github.com/opensaas/asana) | Asana | $3B |
| [monday.do](https://github.com/opensaas/monday) | Monday.com | $7B |
| [notion.do](https://github.com/opensaas/notion) | Notion | $10B |
| [airtable.do](https://github.com/opensaas/airtable) | Airtable | $11B |
| [confluence.do](https://github.com/opensaas/confluence) | Confluence | Atlassian |

### Infrastructure

| Package | Clones | Description |
|---------|--------|-------------|
| [fsx.do](https://github.com/opensaas/fsx) | POSIX filesystem | Virtual FS |
| [gitx.do](https://github.com/opensaas/gitx) | Git | Version control |
| [kafka.do](https://github.com/opensaas/kafka) | Kafka | Message streaming |
| [nats.do](https://github.com/opensaas/nats) | NATS | Messaging |
| [inngest.do](https://github.com/opensaas/inngest) | Inngest | Job queues |

### E-commerce & Payments

| Package | Clones | Market Cap |
|---------|--------|------------|
| [shopify.do](https://github.com/opensaas/shopify) | Shopify | $100B |
| [toast.do](https://github.com/opensaas/toast) | Toast | $10B |

### Search & Discovery

| Package | Clones | Market Cap |
|---------|--------|------------|
| [algolia.do](https://github.com/opensaas/algolia) | Algolia | $2.25B |

### Specialized

| Package | Clones | Industry |
|---------|--------|----------|
| [veeva.do](https://github.com/opensaas/veeva) | Veeva | Life Sciences |
| [epic.do](https://github.com/opensaas/epic) | Epic | Healthcare |
| [netsuite.do](https://github.com/opensaas/netsuite) | NetSuite | ERP |
| [sap.do](https://github.com/opensaas/sap) | SAP | Enterprise |
| [dynamics.do](https://github.com/opensaas/dynamics) | Dynamics 365 | Microsoft |

## Architecture

Every clone follows the same architecture:

```
{package}/
├── src/
│   ├── core/              # Pure business logic
│   ├── durable-object/    # Cloudflare Durable Object
│   ├── storage/           # Tiered: SQLite (hot) + R2 (warm/cold)
│   ├── mcp/               # AI tools for Claude, GPT, etc.
│   └── client/            # HTTP/RPC client
├── package.json           # npm exports with subpaths
└── wrangler.jsonc         # Cloudflare config
```

### Storage Tiers

| Tier | Technology | Use Case | Latency |
|------|------------|----------|---------|
| Hot | SQLite in DO | Active data, <2 years | <10ms |
| Warm | R2 | Historical, 2-7 years | ~100ms |
| Cold | R2 Archive | Compliance, 7+ years | ~1s |

### Multi-Level Exports

```typescript
// Full package
import { crm } from 'hubspot.do'

// Just the core logic (no network)
import { Contact } from 'hubspot.do/core'

// Just the Durable Object class
import { HubSpotDO } from 'hubspot.do/do'

// Just the MCP tools for AI
import { hubspotTools } from 'hubspot.do/mcp'

// Just the storage layer
import { HubSpotStorage } from 'hubspot.do/storage'
```

### AI-Native

Every clone exposes MCP tools:

```typescript
import { hubspotTools, invokeTool } from 'hubspot.do/mcp'

// Use with Claude, GPT, or any MCP-compatible AI
await invokeTool('contacts_create', {
  email: 'jane@acme.com',
  firstName: 'Jane',
  lastName: 'Doe',
})

await invokeTool('deals_search', {
  query: 'enterprise deals closing this quarter over $50k',
})
```

## Quick Start

### 1. Install

```bash
npm install hubspot.do
```

### 2. Configure

```bash
export DO_API_KEY=your-api-key
```

Or self-host on your Cloudflare account:

```bash
git clone https://github.com/opensaas/hubspot
cd hubspot
npm install
npx wrangler deploy
```

### 3. Use

```typescript
import { crm } from 'hubspot.do'

// Create a contact
const contact = await crm.contacts.create({
  email: 'jane@acme.com',
  firstName: 'Jane',
  lastName: 'Doe',
})

// Create a deal
const deal = await crm.deals.create({
  name: 'Enterprise Plan',
  amount: 50000,
  stage: 'proposal',
  contact: contact.id,
})

// Search with natural language
const qualified = await crm.deals.search({
  natural: 'enterprise deals closing this quarter',
})

// Real-time updates
crm.deals.watch({ stage: 'closed_won' }, deal => {
  console.log(`Deal closed: ${deal.name} for $${deal.amount}`)
})
```

## Migration Guide

### From HubSpot

```typescript
// Before
import { Client } from '@hubspot/api-client'
const hubspot = new Client({ accessToken: process.env.HUBSPOT_TOKEN })

const contact = await hubspot.crm.contacts.basicApi.create({
  properties: { email: 'jane@acme.com', firstname: 'Jane' }
})

// After
import { crm } from 'hubspot.do'

const contact = await crm.contacts.create({
  email: 'jane@acme.com',
  firstName: 'Jane',
})
```

### From Firebase

```typescript
// Before
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const app = initializeApp(config)
const db = getFirestore(app)
await setDoc(doc(db, 'users', 'jane'), { name: 'Jane' })

// After
import { db } from 'firebase.do'

await db.collection('users').doc('jane').set({ name: 'Jane' })
```

### From Salesforce

```typescript
// Before
import jsforce from 'jsforce'
const conn = new jsforce.Connection({ loginUrl: '...' })
await conn.login(username, password)
const result = await conn.sobject('Contact').create({ Email: 'jane@acme.com' })

// After
import { sobjects } from 'salesforce.do'

const result = await sobjects.Contact.create({ Email: 'jane@acme.com' })
```

## For Startup Founders

Don't want to self-host? Use [startups.new](https://startups.new) to get a fully managed version with an AI team that builds, markets, and sells for you.

## For Enterprise

Need enterprise features?

- **Self-hosted** on your infrastructure
- **SOC 2 Type II** compliant
- **SSO/SAML** via [org.ai](https://org.ai)
- **Audit logs** and compliance reports
- **SLA guarantees**
- **Dedicated support**

Contact [enterprise@opensaas.org](mailto:enterprise@opensaas.org)

## Contributing

Every clone lives in its own repo under the `opensaas` org:

```bash
# Fork the repo
gh repo fork opensaas/hubspot

# Clone your fork
git clone https://github.com/yourusername/hubspot
cd hubspot

# Install dependencies
npm install

# Run tests
npm test

# Make your changes, then PR
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT. Fork it. Modify it. Sell it. We don't care.

The whole point is that **you own your software**.

---

**Stop renting software. Start owning it.**

[Browse the catalog](https://opensaas.org) | [Self-host guide](https://docs.opensaas.org/self-host) | [Discord](https://discord.opensaas.org)

---

Built on [saaskit.js.org](https://saaskit.js.org) | Part of [workers.do](https://workers.do)
