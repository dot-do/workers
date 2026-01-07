# servicenow.do

> Enterprise ITSM. AI-native. One click to deploy.

ServiceNow built a $150B+ company charging $100+ per user per month for IT Service Management. Implementation takes 6-18 months. AI was bolted on as an afterthought.

**servicenow.do** is the open-source alternative. Deploy your own instance in one click. AI agents are first-class citizens. Table API compatible - your existing integrations just work.

## The Problem

ServiceNow revolutionized enterprise IT. But the model is broken:

- **$100+ per user/month** - A 1,000-person company pays $1.2M+ annually
- **6-18 month implementations** - Consultants cost more than the software
- **Shared tenants** - Your data lives with everyone else's
- **AI as afterthought** - "Now Assist" bolted onto 20-year-old architecture
- **Vendor lock-in** - Leaving means losing years of configuration

Meanwhile, AI agents are the new workforce. They need to file incidents, resolve tickets, run change management. ServiceNow wasn't built for them.

## The Solution

**servicenow.do** reimagines ITSM for the AI era:

- **One-click deploy** - Your own instance, not a shared tenant
- **Edge-native** - Runs on Cloudflare's global network, not legacy data centers
- **AI-native** - AI agents can file incidents, resolve tickets, manage changes
- **Open source** - MIT licensed, no vendor lock-in
- **Table API compatible** - `/api/now/table/*` works exactly the same

## One-Click Deploy

```bash
npx create-dotdo servicenow
```

That's it. Your own ServiceNow instance running on Cloudflare's edge.

Or deploy to your workers.do workspace:

```typescript
import { ServiceNow } from 'servicenow.do'

export default ServiceNow({
  name: 'my-company',
  domain: 'itsm.my-company.com',
})
```

## Features

### Incident Management

Full incident lifecycle - create, assign, escalate, resolve, close.

```typescript
// Create an incident
const incident = await snow.incidents.create({
  short_description: 'Email server down',
  urgency: 1,
  impact: 1,
  category: 'Network',
})

// Assign to a group
await incident.assign({ group: 'Network Operations' })

// Resolve
await incident.resolve({
  close_notes: 'Restarted mail service',
  close_code: 'Solved (Permanently)',
})
```

### Problem Management

Root cause analysis and permanent fixes.

```typescript
// Create problem from related incidents
const problem = await snow.problems.create({
  short_description: 'Recurring mail server crashes',
  related_incidents: [inc001, inc002, inc003],
})

// Document root cause
await problem.rootCause({
  cause: 'Memory leak in mail daemon',
  workaround: 'Scheduled restart every 24h',
})

// Implement permanent fix
await problem.implement({
  change: change001,
  resolution: 'Upgraded mail server to v2.1.0',
})
```

### Change Management

Standard, normal, and emergency changes with approval workflows.

```typescript
// Create a change request
const change = await snow.changes.create({
  type: 'normal',
  short_description: 'Upgrade production database',
  risk: 'moderate',
  impact_analysis: 'Brief downtime during maintenance window',
})

// Submit for approval
await change.submit()

// Approve (via workflow or AI agent)
await change.approve({ approver: 'CAB' })

// Implement
await change.implement()
```

### Service Catalog

Self-service requests for users and AI agents.

```typescript
// Define a catalog item
const laptopRequest = await snow.catalog.create({
  name: 'Request New Laptop',
  category: 'Hardware',
  workflow: 'hardware-fulfillment',
  variables: [
    { name: 'laptop_type', type: 'choice', choices: ['MacBook Pro', 'ThinkPad'] },
    { name: 'accessories', type: 'multiselect', choices: ['Monitor', 'Keyboard', 'Mouse'] },
  ],
})

// Submit a request
await snow.requests.create({
  catalog_item: laptopRequest.sys_id,
  variables: {
    laptop_type: 'MacBook Pro',
    accessories: ['Monitor', 'Keyboard'],
  },
})
```

### Knowledge Base

Searchable documentation for humans and AI.

```typescript
// Create an article
await snow.knowledge.create({
  title: 'How to reset your password',
  category: 'Self-Service',
  content: '...',
  keywords: ['password', 'reset', 'login'],
})

// Search (used by AI agents to resolve tickets)
const articles = await snow.knowledge.search('email not working')
```

### CMDB

Configuration management database for your entire infrastructure.

```typescript
// Register a CI
await snow.cmdb.create({
  sys_class_name: 'cmdb_ci_server',
  name: 'prod-web-01',
  ip_address: '10.0.1.100',
  environment: 'production',
  owner: 'platform-team',
})

// Query relationships
const dependencies = await snow.cmdb.relationships('prod-web-01')
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

## AI-Native

AI agents are first-class citizens in servicenow.do:

### AI Files Tickets

```typescript
import { quinn } from 'agents.do'

// QA agent found a bug
quinn`
  The checkout flow is broken in production.
  Users see a 500 error when clicking "Place Order".
  Affects all users. Started 10 minutes ago.
`
// Quinn automatically files an incident with correct urgency/impact
```

### AI Resolves Tickets

```typescript
import { ralph } from 'agents.do'

// Developer agent resolves incidents
ralph`
  INC0012345 is caused by a database connection pool exhaustion.
  Deployed fix in PR #789. Connection limit increased from 50 to 200.
  Monitoring shows errors have stopped.
`
// Ralph updates the incident, links the change, and resolves
```

### AI Runs Changes

```typescript
import { tom } from 'agents.do'

// Tech lead manages change approval
tom`
  Review CHG0001234 for the database upgrade.
  Verify the rollback plan is complete.
  Approve if risk assessment is acceptable.
`
// Tom reviews the change, verifies docs, and approves via CAB workflow
```

### AI Searches Knowledge

```typescript
import { priya } from 'agents.do'

// Product agent answers questions
priya`
  A customer is asking about our SLA for P1 incidents.
  Check the knowledge base and respond with our policy.
`
// Priya searches KB, finds the article, and responds accurately
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

ServiceNow's power is its table-driven architecture. servicenow.do implements this as a dynamic schema engine:

```typescript
// Tables are defined at runtime
await snow.tables.create({
  name: 'u_custom_asset',
  extends: 'cmdb_ci',
  columns: [
    { name: 'u_asset_tag', type: 'string', maxLength: 40 },
    { name: 'u_purchase_date', type: 'date' },
    { name: 'u_cost', type: 'currency' },
  ],
})

// Queries work immediately
const assets = await snow.table('u_custom_asset')
  .where('u_cost', '>', 10000)
  .orderBy('u_purchase_date', 'desc')
  .limit(100)
```

### Business Rules Engine

React to data changes with server-side logic:

```typescript
// Business rule: auto-assign P1 incidents
await snow.rules.create({
  table: 'incident',
  when: 'before',
  operation: 'insert',
  condition: 'priority == 1',
  script: async (current) => {
    current.assignment_group = 'Critical Response Team'
    current.notify = 'manager'
  },
})
```

### Workflow Engine

Visual workflows for approvals, tasks, and automation:

```typescript
// Change approval workflow
await snow.workflows.create({
  name: 'Normal Change Approval',
  table: 'change_request',
  stages: [
    { name: 'Submit', action: 'validate_fields' },
    { name: 'Review', action: 'assign_reviewer' },
    { name: 'CAB Approval', action: 'cab_vote', quorum: 3 },
    { name: 'Implementation', action: 'schedule_window' },
    { name: 'Post-Implementation', action: 'verify_success' },
  ],
})
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
| Pricing | $100+/user/month | Free (open source) |
| Deployment | 6-18 months | 1 click |
| Architecture | Shared tenant | Your own instance |
| AI Integration | Bolted on | Native |
| Table API | Proprietary | Compatible |
| Data Location | Their data centers | Your choice (edge) |
| Customization | $$$$ consultants | Code it yourself |
| Lock-in | Years of migration | MIT licensed |

## Roadmap

- [x] Incident Management
- [x] Problem Management
- [x] Change Management
- [x] Service Catalog
- [x] Knowledge Base
- [x] CMDB
- [x] Table API compatibility
- [x] Business Rules Engine
- [x] Workflow Engine
- [ ] Service Level Management
- [ ] Asset Management
- [ ] Project Portfolio Management
- [ ] Discovery & Service Mapping
- [ ] Security Operations
- [ ] HR Service Delivery

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
