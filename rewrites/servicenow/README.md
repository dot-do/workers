# servicenow.do

> Enterprise ITSM. AI-native. One click to deploy.

ServiceNow built a $150B+ company charging $100+ per user per month for IT Service Management. Implementation takes 6-18 months. AI was bolted on as an afterthought.

**servicenow.do** is the open-source alternative. Deploy your own instance in one click. AI agents are first-class citizens. Table API compatible - your existing integrations just work.

## AI-Native API

```typescript
import { servicenow } from 'servicenow.do'           // Full SDK
import { servicenow } from 'servicenow.do/tiny'      // Minimal client
import { servicenow } from 'servicenow.do/table'     // Table API only
```

Natural language for IT service management:

```typescript
import { servicenow } from 'servicenow.do'

// Talk to it like a service desk
const incident = await servicenow`email server down for networking team`
const p1s = await servicenow`P1 incidents this week`
const changes = await servicenow`pending changes for CAB review`

// Chain like sentences
await servicenow`P1 incidents this week`
  .map(inc => servicenow`root cause for ${inc}`)

// Incidents that resolve themselves
await servicenow`email server down`
  .assign('Network Operations')
  .resolve('Restarted mail service')
```

## The Problem

ServiceNow revolutionized enterprise IT. But the model is broken:

| What ServiceNow Charges | The Reality |
|------------------------|-------------|
| **Per User Licensing** | $100+/user/month ($1.2M+ annually for 1,000 users) |
| **Implementation** | 6-18 months, consultants cost more than software |
| **Shared Tenants** | Your data lives with everyone else's |
| **AI Integration** | "Now Assist" bolted onto 20-year-old architecture |
| **Vendor Lock-in** | Leaving means losing years of configuration |

### The Now Tax

Since going public:

- Aggressive upselling to higher tiers
- Complexity drives consultant dependency
- Slow innovation on core platform
- AI features require premium licenses
- Data trapped in proprietary formats

IT departments are hostage to a workflow company that sees ITSM as a subscription vehicle.

### The AI Gap

AI agents are the new workforce. They need to file incidents, resolve tickets, run change management. ServiceNow wasn't built for them.

## The Solution

**servicenow.do** reimagines ITSM for the AI era:

```
ServiceNow                         servicenow.do
-----------------------------------------------------------------
$100+/user/month                   Deploy for free
6-18 month implementation          Deploy in minutes
Shared tenant                      Your own instance
AI as afterthought                 AI-native design
Oracle/Azure data centers          Your Cloudflare account
$$$ consultants                    Code it yourself
Vendor lock-in                     Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo servicenow
```

That's it. Your own ServiceNow instance running on Cloudflare's edge.

```typescript
import { ServiceNow } from 'servicenow.do'

export default ServiceNow({
  name: 'my-company',
  domain: 'itsm.my-company.com',
})
```

## Features

### Incident Management

```typescript
// Just say it
const incident = await servicenow`email server down for networking team`

// Full lifecycle in natural language
await servicenow`email server down`
  .assign('Network Operations')
  .escalate('P1')
  .resolve('Restarted mail service')

// Query incidents naturally
await servicenow`open incidents for networking team`
await servicenow`P1 incidents this week`
await servicenow`incidents affecting prod-web-01`

// Batch operations read like commands
await servicenow`reassign all John Smith incidents to Jane Doe`
await servicenow`close resolved incidents older than 30 days`
```

### Problem Management

```typescript
// Create problems from patterns
await servicenow`problem from recurring mail server crashes`

// Root cause analysis
await servicenow`root cause for PRB0001234`
  .document('Memory leak in mail daemon')
  .workaround('Scheduled restart every 24h')
  .fix('Upgrade to v2.1.0')

// Find problems naturally
await servicenow`problems without root cause`
await servicenow`problems linked to prod-db-01`
```

### Change Management

```typescript
// Request changes naturally
const change = await servicenow`change to upgrade production database`
  .risk('moderate')
  .window('Sunday 2am-6am')

// Approval workflow in plain English
await servicenow`submit CHG0001234 for CAB approval`
await servicenow`approve CHG0001234`
await servicenow`implement CHG0001234`

// Query changes naturally
await servicenow`pending changes for CAB review`
await servicenow`emergency changes this month`
await servicenow`failed changes in Q4`
```

### Service Catalog

```typescript
// Request things naturally
await servicenow`request MacBook Pro with monitor and keyboard`
await servicenow`request access to production database`
await servicenow`request new hire onboarding for Jane Doe`

// Check request status
await servicenow`my pending requests`
await servicenow`hardware requests awaiting approval`
```

### Knowledge Base

```typescript
// Search knowledge naturally
await servicenow`how to reset VPN password`
await servicenow`email troubleshooting steps`

// Create articles naturally
await servicenow`article: how to connect to VPN from home`
  .category('Self-Service')
  .keywords('vpn', 'remote', 'work from home')

// AI uses knowledge to resolve tickets
await servicenow`unresolved incidents`
  .map(inc => servicenow`knowledge article for ${inc}`)
  .map(article => inc.suggest(article))
```

### CMDB

```typescript
// Register assets naturally
await servicenow`server prod-web-01 at 10.0.1.100 in production`
await servicenow`database prod-db-01 depends on prod-storage-01`

// Query the CMDB naturally
await servicenow`what depends on prod-web-01`
await servicenow`production servers in Austin data center`
await servicenow`assets owned by platform team`
```

## Table API Compatible

Existing ServiceNow integrations work without changes:

```bash
# List incidents
curl https://your-instance.servicenow.do/api/now/table/incident

# Create incident
curl -X POST https://your-instance.servicenow.do/api/now/table/incident \
  -H "Content-Type: application/json" \
  -d '{"short_description": "Cannot access email"}'

# Update incident
curl -X PATCH https://your-instance.servicenow.do/api/now/table/incident/INC0001 \
  -H "Content-Type: application/json" \
  -d '{"state": "2"}'
```

All `/api/now/table/*` endpoints are supported. GlideRecord queries work. Scripted REST APIs work. Your existing integrations just work.

## AI-Native ITSM

### Incidents That Triage Themselves

```typescript
// AI determines urgency and impact automatically
await servicenow`checkout broken, users see 500 error, started 10 min ago`
// -> P1 incident, assigned to Critical Response Team, notifications sent

// Or be explicit
await servicenow`email slow for marketing team`
  .priority('P3')
  .assign('Email Team')
```

### Root Cause in One Line

```typescript
// AI analyzes patterns and suggests root cause
await servicenow`P1 incidents this week`
  .map(inc => servicenow`root cause for ${inc}`)
  .map(rca => servicenow`problem from ${rca}`)

// Or just ask
await servicenow`why did prod-db-01 fail yesterday`
```

### Change Impact Analysis

```typescript
// AI evaluates change risk automatically
await servicenow`change to upgrade production database`
// -> Analyzes CMDB, identifies dependencies, suggests maintenance window

// Review pending changes
await servicenow`pending changes`
  .map(chg => servicenow`impact analysis for ${chg}`)
```

### Knowledge That Learns

```typescript
// AI creates articles from resolved incidents
await servicenow`resolved incidents this month`
  .map(inc => servicenow`knowledge article from ${inc}`)

// Articles improve resolution times
await servicenow`new incidents`
  .map(inc => servicenow`suggest resolution for ${inc}`)
```

### SLA Management

```typescript
// Monitor SLAs naturally
await servicenow`incidents breaching SLA`
await servicenow`P1 incidents close to breach`

// AI escalates automatically
// -> Notifications sent before breach, not after
```

## Architecture

servicenow.do is built on Cloudflare's edge infrastructure:

```
                    Cloudflare Edge
                          |
          +---------------+---------------+
          |               |               |
    +-----------+   +-----------+   +-----------+
    | Routing   |   | Auth      |   | API       |
    | Snippet   |   | Snippet   |   | Gateway   |
    +-----------+   +-----------+   +-----------+
          |               |               |
          +---------------+---------------+
                          |
                +-----------------+
                | ServiceNow DO   |
                | (per instance)  |
                +-----------------+
                    |         |
            +-------+         +-------+
            |                         |
      +-----------+             +-----------+
      | SQLite    |             | R2        |
      | (hot)     |             | (archive) |
      +-----------+             +-----------+
```

### Dynamic Table Engine

ServiceNow's power is its table-driven architecture. servicenow.do implements this naturally:

```typescript
// Create tables with natural language
await servicenow`table custom_asset extending cmdb_ci with asset_tag, purchase_date, cost`

// Or be explicit about types
await servicenow`table custom_asset`
  .extends('cmdb_ci')
  .field('asset_tag', 'string')
  .field('purchase_date', 'date')
  .field('cost', 'currency')

// Query naturally
await servicenow`custom assets over $10,000 by purchase date`
await servicenow`custom assets purchased this year`
```

### Business Rules Engine

React to data changes with natural language:

```typescript
// Auto-assign P1 incidents
await servicenow`when P1 incident created assign to Critical Response Team and notify manager`

// Auto-escalate breaching SLAs
await servicenow`when incident SLA at 80% escalate to supervisor`

// Close stale incidents
await servicenow`when resolved incident untouched for 7 days close automatically`
```

### Workflow Engine

Define workflows naturally:

```typescript
// Change approval workflow
await servicenow`workflow: normal change approval`
  .step('submit and validate')
  .step('assign reviewer')
  .step('CAB approval with 3 votes')
  .step('schedule implementation window')
  .step('verify success')

// Or describe it
await servicenow`create workflow for normal changes requiring CAB approval`
```

### Durable Object per Instance

Each servicenow.do deployment is a single Durable Object:

- **Strong consistency** - No eventual consistency surprises
- **SQLite storage** - Millions of records per instance
- **Geographic distribution** - Runs near your users
- **Automatic persistence** - No database to manage

## vs ServiceNow

| Feature | ServiceNow | servicenow.do |
|---------|------------|---------------|
| **Pricing** | $100+/user/month | Free (open source) |
| **Deployment** | 6-18 months | Deploy in minutes |
| **Architecture** | Shared tenant | Your own instance |
| **AI** | Bolted on (Now Assist) | AI-first design |
| **Table API** | Proprietary | Compatible |
| **Data Location** | Their data centers | Your Cloudflare account |
| **Customization** | $$$$ consultants | Code it yourself |
| **Lock-in** | Years of migration | MIT licensed |

## Use Cases

### IT Operations

```typescript
// Daily standup for ops team
await servicenow`P1 and P2 incidents from overnight`
await servicenow`changes scheduled for today`
await servicenow`SLAs at risk`

// Incident management at scale
await servicenow`open incidents`
  .map(inc => servicenow`suggested resolution for ${inc}`)
  .map((inc, suggestion) => inc.tryResolve(suggestion))
```

### Service Desk

```typescript
// First-line support
await servicenow`new tickets for Service Desk`
  .map(ticket => servicenow`auto-resolve if knowledge exists for ${ticket}`)

// Escalation
await servicenow`tickets open more than 4 hours`
  .map(ticket => ticket.escalate())
```

### Change Management

```typescript
// CAB meeting prep
await servicenow`changes pending CAB approval`
  .map(chg => servicenow`risk assessment for ${chg}`)

// Post-implementation review
await servicenow`changes implemented this week`
  .map(chg => servicenow`success rate for ${chg}`)
```

### Reporting

```typescript
// Executive dashboard
await servicenow`MTTR this month vs last month`
await servicenow`incident volume by category`
await servicenow`SLA compliance by team`

// Export for analysis
await servicenow`export P1 incidents for 2024`
```

## Roadmap

### Core ITSM
- [x] Incident Management
- [x] Problem Management
- [x] Change Management
- [x] Service Catalog
- [x] Knowledge Base
- [x] CMDB

### Platform
- [x] Table API compatibility
- [x] Business Rules Engine
- [x] Workflow Engine
- [x] SLA Management
- [ ] Asset Management
- [ ] Project Portfolio Management

### Enterprise
- [ ] Discovery & Service Mapping
- [ ] Security Operations
- [ ] HR Service Delivery
- [ ] Customer Service Management

### AI
- [x] Natural language queries
- [x] Auto-triage incidents
- [x] Root cause suggestions
- [x] Knowledge article generation
- [ ] Predictive incident prevention
- [ ] Automated resolution

## Contributing

servicenow.do is open source under the MIT license. Contributions welcome.

```bash
git clone https://github.com/dotdo/servicenow.do
cd servicenow.do
pnpm install
pnpm test
```

## License

MIT

---

<p align="center">
  <strong>The $150B tax ends here.</strong>
  <br />
  Edge-native. AI-first. Your instance.
  <br /><br />
  <a href="https://servicenow.do">Website</a> |
  <a href="https://docs.servicenow.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/servicenow.do">GitHub</a>
</p>
