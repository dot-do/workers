# looker.do

> Google's $2.6B BI platform. Now open source. AI-native.

Looker revolutionized BI with its semantic modeling layer. But at $5,000/month minimum, with LookML complexity requiring dedicated analysts, and complete Google Cloud lock-in, it's time for a new approach.

**looker.do** reimagines modern BI for the AI era. Conversational analytics. LookML-compatible. One-click deploy.

## The Problem

Google acquired Looker for $2.6B and built an enterprise moat on:

- **Enterprise pricing** - $5,000/month minimum, often $50-300k/year for real deployments
- **LookML complexity** - Requires dedicated engineers to maintain the semantic layer
- **Google Cloud lock-in** - Deep BigQuery integration, harder to use with other clouds
- **Developer-focused** - Business users can't create their own models
- **Slow iteration** - LookML changes require dev cycles, PR reviews, deployments
- **Embedded costs** - Charging per-user for embedded analytics in your product

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

## Conversational Analytics

Skip the Explores. Just ask:

```typescript
import { looker } from 'looker.do'

// Ask questions in plain English
const answer = await looker`how many users signed up last week?`
const trends = await looker`show me revenue trends by product category`
const deep = await looker`why did churn increase in Q3?`

// AI generates LookML, runs query, returns results
console.log(answer.data)         // Query results
console.log(answer.lookml)       // Generated LookML
console.log(answer.visualization) // Auto-generated chart
console.log(answer.narrative)    // Natural language explanation
```

## Features

### LookML Semantic Layer

Define your data model once, query it everywhere:

```lookml
# models/ecommerce.model.lkml
connection: "production"

include: "/views/*.view.lkml"

explore: orders {
  label: "Order Analysis"
  description: "Analyze customer orders and revenue"

  join: customers {
    type: left_outer
    sql_on: ${orders.customer_id} = ${customers.id} ;;
    relationship: many_to_one
  }

  join: products {
    type: left_outer
    sql_on: ${orders.product_id} = ${products.id} ;;
    relationship: many_to_one
  }
}
```

```lookml
# views/orders.view.lkml
view: orders {
  sql_table_name: public.orders ;;

  dimension: id {
    primary_key: yes
    type: number
    sql: ${TABLE}.id ;;
  }

  dimension_group: created {
    type: time
    timeframes: [raw, date, week, month, quarter, year]
    sql: ${TABLE}.created_at ;;
  }

  dimension: status {
    type: string
    sql: ${TABLE}.status ;;
  }

  measure: total_revenue {
    type: sum
    sql: ${TABLE}.amount ;;
    value_format_name: usd
  }

  measure: order_count {
    type: count
    drill_fields: [id, created_date, customers.name, total_revenue]
  }

  measure: average_order_value {
    type: average
    sql: ${TABLE}.amount ;;
    value_format_name: usd
  }
}
```

### AI-Generated LookML

Let AI create your semantic layer:

```typescript
import { generateLookML } from 'looker.do'

// Point at your database, AI generates LookML
const model = await generateLookML({
  connection: 'postgresql://...',
  schema: 'public',
  tables: ['orders', 'customers', 'products'],
})

// Returns complete LookML files
console.log(model.files)
// {
//   'models/generated.model.lkml': '...',
//   'views/orders.view.lkml': '...',
//   'views/customers.view.lkml': '...',
//   'views/products.view.lkml': '...',
// }

// AI infers:
// - Primary keys and relationships
// - Dimension types (time, string, number, etc.)
// - Useful measures (counts, sums, averages)
// - Drill fields and formatting
```

### Explores

Interactive data exploration:

```typescript
import { Explore } from 'looker.do'

// Create an explore programmatically
const orderExplore = Explore({
  model: 'ecommerce',
  explore: 'orders',
  fields: [
    'orders.created_month',
    'orders.total_revenue',
    'orders.order_count',
    'customers.country',
  ],
  filters: {
    'orders.created_date': 'last 90 days',
    'orders.status': 'completed',
  },
  sorts: ['orders.total_revenue desc'],
  limit: 500,
})

// Run the query
const results = await orderExplore.run()

// Get SQL (for debugging/auditing)
const sql = orderExplore.toSQL()
```

### Dashboards

Compose explores into dashboards:

```typescript
import { Dashboard, Tile } from 'looker.do'

export const RevenueDashboard = Dashboard({
  title: 'Revenue Analytics',
  layout: 'grid',
  filters: [
    { name: 'Date Range', field: 'orders.created_date', default: 'last 30 days' },
    { name: 'Region', field: 'customers.region', type: 'multiselect' },
  ],
  tiles: [
    Tile.singleValue({
      title: 'Total Revenue',
      explore: 'orders',
      measure: 'orders.total_revenue',
      comparison: { type: 'previous_period' },
    }),
    Tile.singleValue({
      title: 'Order Count',
      explore: 'orders',
      measure: 'orders.order_count',
    }),
    Tile.lineChart({
      title: 'Revenue Trend',
      explore: 'orders',
      dimensions: ['orders.created_week'],
      measures: ['orders.total_revenue'],
      span: 2,
    }),
    Tile.barChart({
      title: 'Revenue by Category',
      explore: 'orders',
      dimensions: ['products.category'],
      measures: ['orders.total_revenue'],
      sorts: ['orders.total_revenue desc'],
    }),
    Tile.table({
      title: 'Top Customers',
      explore: 'orders',
      dimensions: ['customers.name', 'customers.email'],
      measures: ['orders.total_revenue', 'orders.order_count'],
      limit: 10,
    }),
  ],
})
```

### Looks (Saved Queries)

Save and share queries:

```typescript
import { Look } from 'looker.do'

export const TopProducts = Look({
  title: 'Top 10 Products by Revenue',
  model: 'ecommerce',
  explore: 'orders',
  fields: [
    'products.name',
    'products.category',
    'orders.total_revenue',
    'orders.order_count',
  ],
  filters: {
    'orders.created_date': 'this quarter',
  },
  sorts: ['orders.total_revenue desc'],
  limit: 10,
  visualization: {
    type: 'table',
    showRowNumbers: true,
    columnWidths: { 'products.name': 200 },
  },
})
```

## AI-Native Features

### Conversational Queries

Ask questions, get answers:

```typescript
import { ask } from 'looker.do'

// Simple questions
const q1 = await ask('What was revenue last month?')
// AI: Queries orders.total_revenue with date filter

// Comparative questions
const q2 = await ask('How does this month compare to last month?')
// AI: Adds period-over-period comparison

// Drill-down questions
const q3 = await ask('Break that down by region')
// AI: Adds customers.region dimension

// Follow-up questions (context-aware)
const q4 = await ask('Which products drove the increase?')
// AI: Pivots to product analysis, focuses on growth
```

### Auto-Modeling

AI creates LookML from your questions:

```typescript
import { autoModel } from 'looker.do'

// Describe what you want to analyze
const model = await autoModel({
  description: `
    I want to analyze our SaaS business. Key metrics are:
    - MRR and ARR
    - Customer acquisition cost
    - Lifetime value
    - Churn rate
    - Revenue by plan type
  `,
  database: 'postgresql://...',
})

// AI discovers relevant tables, creates model
console.log(model.explores) // ['subscriptions', 'customers', 'payments']
console.log(model.measures) // ['mrr', 'arr', 'cac', 'ltv', 'churn_rate']
```

### Insight Discovery

Automatic anomaly detection and insights:

```typescript
import { discoverInsights } from 'looker.do'

const insights = await discoverInsights({
  explore: 'orders',
  timeframe: 'last 30 days',
  focus: ['revenue', 'conversion'],
})

// Returns ranked insights
for (const insight of insights) {
  console.log(insight.headline)
  // "Mobile conversion dropped 23% on March 15"

  console.log(insight.explanation)
  // "Coincides with app update v2.3.1. Checkout flow changed."

  console.log(insight.recommendation)
  // "Investigate checkout funnel on mobile devices"

  console.log(insight.look)
  // Link to saved look with relevant query
}
```

### AI Agents as Analysts

AI agents can build complete analytics:

```typescript
import { priya, tom } from 'agents.do'
import { looker } from 'looker.do'

// Product manager builds analytics
const productAnalytics = await priya`
  create a complete analytics model for our product usage data
  I need to track feature adoption, user engagement, and retention
`

// Tech lead reviews the LookML
const review = await tom`
  review this LookML model for performance issues and best practices
  ${productAnalytics.lookml}
`
```

## Embedded Analytics

Embed Looker in your product without per-user fees:

### SSO Embed

```typescript
import { createEmbedUrl } from 'looker.do/embed'

// Generate signed embed URL
const embedUrl = await createEmbedUrl({
  dashboard: 'customer_analytics',
  user: {
    external_user_id: customer.id,
    first_name: customer.name,
    permissions: ['access_data', 'see_looks'],
    models: ['customer_facing'],
    user_attributes: {
      customer_id: customer.id,  // Row-level security
    },
  },
  session_length: 3600,
})

// Embed in your app
return <iframe src={embedUrl} />
```

### Private Embedding

```typescript
import { LookerEmbed } from 'looker.do/react'

function CustomerDashboard({ customerId }) {
  return (
    <LookerEmbed
      dashboard="customer_analytics"
      filters={{ customer_id: customerId }}
      theme="light"
      height={800}
    />
  )
}
```

### API Access

```typescript
import { LookerAPI } from 'looker.do'

const looker = new LookerAPI({ baseUrl: 'https://your-org.looker.do' })

// Run a query
const results = await looker.runQuery({
  model: 'ecommerce',
  view: 'orders',
  fields: ['orders.created_month', 'orders.total_revenue'],
  filters: { 'orders.created_date': 'last 12 months' },
})

// Get as different formats
const csv = await looker.runQuery({ ...query, format: 'csv' })
const json = await looker.runQuery({ ...query, format: 'json' })
const sql = await looker.runQuery({ ...query, format: 'sql' })
```

## Architecture

### LookML Compilation

```
LookML Files          Semantic Model          SQL Generation
    |                      |                       |
    v                      v                       v
+----------+        +-------------+         +-----------+
| .lkml    |  --->  | Compiled    |  --->   | Query     |
| files    |        | Model       |         | Engine    |
+----------+        +-------------+         +-----------+
                          |
                    +-----+-----+
                    |           |
              +---------+  +---------+
              | Views   |  | Explores|
              | (dims,  |  | (joins, |
              | measures)|  | filters)|
              +---------+  +---------+
```

### Durable Objects Architecture

```
                    +------------------------+
                    |    looker.do Worker    |
                    |   (API + Query)        |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | ModelDO          | | QueryCacheDO     | | DashboardDO      |
    | (LookML compile) | | (Result cache)   | | (Layout + State) |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    |    D1    |       | Hyperdrive |        |     R2     |
    | (Metadata)|      | (DB Conn)  |        | (Exports)  |
    +----------+       +-----------+        +------------+
```

### Query Execution

1. **Parse** - LookML explore + fields + filters
2. **Compile** - Generate SQL from semantic model
3. **Cache Check** - Look for cached results
4. **Execute** - Run against database via Hyperdrive
5. **Transform** - Apply formatting, pivots, calculations
6. **Cache Store** - Store results for reuse
7. **Deliver** - Return to client

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
// connections/production.connection.lkml
connection: production {
  database: "analytics"
  host: "${env.DB_HOST}"
  port: 5432
  username: "${env.DB_USER}"
  password: "${env.DB_PASSWORD}"
  ssl: required
  pool_size: 10
}
```

## Migration from Looker

### Export Your LookML

```bash
# Clone your Looker project
git clone https://github.com/your-org/looker-project.git

# Validate with looker.do
npx looker-migrate validate ./looker-project

# Deploy to looker.do
npx looker-migrate deploy ./looker-project
```

### LookML Compatibility

Full LookML syntax support:

```
Feature                    Status
-----------------------------------------------------------------
Views                      Supported
Explores                   Supported
Models                     Supported
Dimensions                 Supported
Measures                   Supported
Derived tables             Supported
PDTs (Persistent)          Supported (via D1)
Filters                    Supported
Parameters                 Supported
Liquid templating          Supported
Extensions                 Supported
Refinements                Supported
```

## Scheduling & Delivery

Automate report delivery:

```typescript
import { Schedule } from 'looker.do'

const dailyReport = Schedule({
  name: 'Daily Revenue Report',
  look: 'revenue_summary',
  frequency: 'daily',
  time: '08:00',
  timezone: 'America/New_York',
  recipients: [
    { type: 'email', address: 'team@company.com' },
    { type: 'slack', channel: '#revenue' },
    { type: 'webhook', url: 'https://api.company.com/reports' },
  ],
  format: 'pdf',
  filters: {
    'orders.created_date': 'yesterday',
  },
})
```

## Roadmap

- [x] LookML parser and compiler
- [x] Explore query engine
- [x] Dashboard builder
- [x] AI-generated LookML
- [x] Conversational queries
- [x] Embedded analytics (SSO)
- [ ] Persistent derived tables (PDTs)
- [ ] Data actions
- [ ] Content validation
- [ ] Version control integration
- [ ] System activity analytics
- [ ] Labs features

## Why Open Source?

Business intelligence shouldn't require $50k/year minimum:

1. **Your semantic layer** - Data modeling is how you understand your business
2. **Your queries** - LookML shouldn't lock you into Google Cloud
3. **Your embedding** - Per-user embedded pricing kills product analytics
4. **Your AI** - Conversational analytics should be built-in, not extra

Looker showed the world what a semantic layer could do. **looker.do** makes it accessible to everyone.

## License

MIT License - Use it however you want. Embed in your SaaS. Sell analytics to clients.

---

<p align="center">
  <strong>looker.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://looker.do">Website</a> | <a href="https://docs.looker.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
