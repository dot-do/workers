# looker.do

> Google's $2.6B BI platform. Now open source. AI-native.

Looker revolutionized BI with its semantic modeling layer. But at $5,000/month minimum, with LookML complexity requiring dedicated analysts, and complete Google Cloud lock-in, it's time for a new approach.

**looker.do** reimagines modern BI for the AI era. Conversational analytics. LookML-compatible. One-click deploy.

## AI-Native API

```typescript
import { looker } from 'looker.do'           // Full SDK
import { looker } from 'looker.do/tiny'      // Minimal client
import { looker } from 'looker.do/embed'     // Embedding only
```

Natural language for business intelligence:

```typescript
import { looker } from 'looker.do'

// Talk to it like a colleague
const revenue = await looker`revenue by region this quarter`
const trends = await looker`show signups week over week`
const deep = await looker`why did churn spike in Q3?`

// Chain like sentences
await looker`top customers by revenue`
  .notify(`Your quarterly report is ready`)

// Dashboards that build themselves
await looker`customer analytics for ${customer.id}`
  .embed({ sessionLength: 3600 })
```

## The Problem

Google acquired Looker for $2.6B and built an enterprise moat on:

| What Google Charges | The Reality |
|---------------------|-------------|
| **Minimum License** | $5,000/month to start |
| **Enterprise Deploys** | $50-300k/year for real usage |
| **LookML Engineers** | Dedicated staff to maintain semantic layer |
| **Embedded Analytics** | Per-user fees kill product analytics |
| **Cloud Lock-in** | Deep BigQuery integration |
| **Iteration Speed** | LookML changes require dev cycles |

A mid-size company with 100 analysts? **$100k+/year** just for BI access.

## The Solution

**looker.do** is Looker reimagined:

```
Traditional Looker              looker.do
-----------------------------------------------------------------
$5,000/month minimum            $0 - run your own
LookML required                 LookML optional (AI generates it)
Google Cloud focused            Any data source
Developer-only modeling         Business user self-service
PR-based changes                Instant iteration
Per-user embedded pricing       Unlimited embedding
```

## One-Click Deploy

```bash
npx create-dotdo looker
```

Your own Looker instance. Running on Cloudflare. Zero licensing fees.

```typescript
import { Looker } from 'looker.do'

export default Looker({
  name: 'my-analytics',
  domain: 'analytics.mycompany.com',
  connections: ['postgresql://...'],
})
```

## Features

### Conversational Analytics

Skip the Explores. Just ask:

```typescript
// Ask questions in plain English
const answer = await looker`how many users signed up last week?`
const trends = await looker`revenue trends by product category`
const deep = await looker`why did churn increase in Q3?`

// AI generates LookML, runs query, returns results
console.log(answer.data)          // Query results
console.log(answer.lookml)        // Generated LookML
console.log(answer.visualization) // Auto-generated chart
console.log(answer.narrative)     // Natural language explanation
```

### Explores

```typescript
// Natural language IS the explore
const orders = await looker`orders by month last 90 days`
const geo = await looker`revenue by country completed only`
const top = await looker`top 500 customers by revenue`

// Comparative queries
await looker`this quarter vs last quarter by product`
await looker`revenue YoY by region`

// Get the SQL (for debugging/auditing)
const sql = await looker`orders by status`.toSQL()
```

### Dashboards

```typescript
// Create dashboards naturally
const dashboard = await looker`executive dashboard for revenue`

// Or compose from queries
await looker`create dashboard "Revenue Analytics"`
  .add(looker`total revenue this month vs last`)
  .add(looker`order count trend by week`)
  .add(looker`revenue by category bar chart`)
  .add(looker`top 10 customers table`)

// Filter across all tiles
await looker`revenue dashboard for APAC region`
```

### Saved Queries (Looks)

```typescript
// Save any query for reuse
await looker`top 10 products by revenue this quarter`
  .save(`Top Products Q1`)

// Reference saved queries
const products = await looker`load Top Products Q1`

// Schedule delivery
await looker`Top Products Q1`
  .schedule({ daily: '8am', to: 'team@company.com' })
```

### LookML Semantic Layer

AI builds your semantic layer from natural descriptions:

```typescript
// Point at your database, AI generates LookML
const model = await looker`generate LookML for orders, customers, products`

// Describe what you want to analyze
const saas = await looker`
  create model for our SaaS business
  track MRR, ARR, churn rate, LTV, CAC
`

// AI infers:
// - Primary keys and relationships
// - Dimension types (time, string, number, etc.)
// - Useful measures (counts, sums, averages)
// - Drill fields and formatting
```

Or define LookML directly when you need precision:

```lookml
# models/ecommerce.model.lkml
connection: "production"
include: "/views/*.view.lkml"

explore: orders {
  label: "Order Analysis"
  join: customers {
    sql_on: ${orders.customer_id} = ${customers.id} ;;
  }
}
```

## AI-Native Features

### Follow-Up Questions

Context-aware conversation:

```typescript
const q1 = await looker`revenue last month`
const q2 = await looker`break that down by region`      // remembers context
const q3 = await looker`which products drove the increase?`  // follows the thread
const q4 = await looker`export that to CSV`             // exports q3 results
```

### Insight Discovery

```typescript
// AI finds what's interesting
const insights = await looker`what's unusual in revenue this month?`

// Returns ranked discoveries
// - "Mobile conversion dropped 23% on March 15"
// - "Enterprise segment up 45% week over week"
// - "Product X has 3x average return rate"
```

### AI Agents as Analysts

```typescript
import { priya, tom } from 'agents.do'

// Product manager builds analytics
const analytics = await priya`
  create complete analytics for product usage
  track feature adoption, engagement, retention
`

// Tech lead reviews the model
const review = await tom`review ${analytics.lookml} for performance`

// Promise pipelining - one network round trip
const verified = await looker`analyze ${customerData}`
  .map(data => looker`build explore from ${data}`)
  .map(explore => [priya, tom].map(r => r`review ${explore}`))
```

## Embedded Analytics

Embed in your product without per-user fees:

```typescript
// Natural language embedding
const embed = await looker`customer analytics for ${customer.id}`
  .embed({ sessionLength: 3600 })

// Row-level security automatic from context
return <iframe src={embed.url} />
```

### React Component

```typescript
import { LookerEmbed } from 'looker.do/react'

function CustomerDashboard({ customerId }) {
  return (
    <LookerEmbed
      query="customer analytics"
      context={{ customer_id: customerId }}
      theme="light"
    />
  )
}
```

### Programmatic Access

```typescript
// Get results in any format
const csv = await looker`revenue by month`.format('csv')
const json = await looker`top customers`.format('json')
const sql = await looker`orders this week`.toSQL()
```

## Data Connections

Connect to any database:

| Database | Connection | Notes |
|----------|------------|-------|
| **PostgreSQL** | Hyperdrive | Connection pooling included |
| **MySQL** | Hyperdrive | Connection pooling included |
| **BigQuery** | Direct | Service account auth |
| **Snowflake** | Direct | Key-pair auth |
| **Redshift** | Direct | IAM auth supported |
| **Databricks** | Direct | SQL warehouse |
| **D1** | Native | Zero-config |

```typescript
// Connect naturally
await looker`connect to postgresql://analytics@db.company.com/metrics`
await looker`use BigQuery project analytics-prod`
```

## Scheduling & Delivery

```typescript
// Natural language scheduling
await looker`revenue by region daily`
  .schedule({ daily: '8am EST', to: 'team@company.com' })

await looker`weekly funnel report`
  .schedule({ weekly: 'Monday 9am', to: '#analytics' })

// Multi-channel delivery
await looker`executive summary`
  .email('ceo@company.com')
  .slack('#leadership')
  .pdf()
```

## Migration from Looker

```bash
# Clone your Looker project
git clone https://github.com/your-org/looker-project.git

# Validate with looker.do
npx looker-migrate validate ./looker-project

# Deploy to looker.do
npx looker-migrate deploy ./looker-project
```

Full LookML syntax support:

| Feature | Status |
|---------|--------|
| Views, Explores, Models | Supported |
| Dimensions & Measures | Supported |
| Derived tables & PDTs | Supported |
| Filters & Parameters | Supported |
| Liquid templating | Supported |
| Extensions & Refinements | Supported |

## Architecture

### Durable Objects

```
LookerDO (config, models, users)
  |
  +-- ModelDO (LookML compilation, caching)
  |     |-- SQLite: Compiled models
  |     +-- R2: LookML source files
  |
  +-- QueryDO (execution, result cache)
  |     |-- SQLite: Query history
  |     +-- Hyperdrive: Database connections
  |
  +-- DashboardDO (layout, state, scheduling)
        |-- SQLite: Dashboard definitions
        +-- R2: Exports (PDF, CSV)
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Recent queries, active dashboards | <10ms |
| **Warm** | R2 + Index | Historical reports | <100ms |
| **Cold** | R2 Archive | Audit logs, old exports | <1s |

## vs Google Looker

| Feature | Google Looker | looker.do |
|---------|---------------|-----------|
| **Minimum Cost** | $5,000/month | $0 |
| **LookML** | Required | AI-generated |
| **Cloud** | Google Cloud | Any/Your Cloudflare |
| **Modeling** | Developer-only | Natural language |
| **Embedded** | Per-user fees | Unlimited |
| **AI** | Limited | Native |
| **Lock-in** | Years | MIT licensed |

## Roadmap

### Core BI
- [x] LookML parser and compiler
- [x] Explore query engine
- [x] Dashboard builder
- [x] AI-generated LookML
- [x] Conversational queries
- [x] Embedded analytics (SSO)
- [ ] Persistent derived tables (PDTs)
- [ ] Data actions
- [ ] Version control integration

### AI
- [x] Natural language queries
- [x] Insight discovery
- [x] Auto-modeling
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] Recommendation engine

## Why Open Source?

### 1. Your Semantic Layer

Data modeling is how you understand your business. It shouldn't be locked in Google Cloud.

### 2. AI-First Analytics

Conversational analytics should be built-in, not a $50k add-on. Business users should query data as easily as talking.

### 3. Embed Without Limits

Per-user embedded pricing kills product analytics. Your customers should get insights without vendor per-seat fees.

### 4. Innovation Velocity

LookML changes shouldn't require dev cycles. Natural language means business users iterate without engineers.

## License

MIT License - Embed in your SaaS. Sell analytics to clients. Build your business.

---

<p align="center">
  <strong>The $2.6B acquisition ends here.</strong>
  <br />
  AI-native. Natural language. Semantic layer for everyone.
  <br /><br />
  <a href="https://looker.do">Website</a> |
  <a href="https://docs.looker.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/looker.do">GitHub</a>
</p>
