# tableau.do

> The $15B visualization platform. Now open source. AI-native.

Tableau revolutionized how businesses see data. But at $70/user/month for Creators, $42/user/month for Explorers, and $15/user/month for just viewing - with Salesforce's AI features locked behind premium tiers - it's time for a new approach.

**tableau.do** reimagines data visualization for the AI era. Natural language to charts. One-click deploy. No per-seat licensing.

## The Problem

Salesforce acquired Tableau for $15.7B and built an empire on:

- **Per-seat pricing** - Creator ($70), Explorer ($42), Viewer ($15) per user/month
- **Role-based paywalls** - Want to make a chart? Pay for Creator. Want to explore? Pay for Explorer.
- **AI as premium upsell** - "Ask Data" and AI features require additional licensing
- **Server complexity** - Tableau Server requires dedicated infrastructure and admins
- **Data extracts** - Performance requires pre-computing extracts, not live queries
- **Salesforce lock-in** - Einstein integration ties you deeper into the ecosystem

A 50-person analytics team? **$50k+/year** before you connect a single data source.

## The Solution

**tableau.do** is Tableau reimagined:

```
Traditional Tableau              tableau.do
-----------------------------------------------------------------
$15-70/user/month               $0 - run your own
"Ask Data" premium              Natural language built-in
Tableau Server                  Cloudflare Workers
Data extracts                   Live queries at the edge
Desktop app required            Browser-first, PWA optional
VizQL proprietary               VizQL-compatible (open)
```

## One-Click Deploy

```bash
npx create-dotdo tableau
```

Your own Tableau Server. Running on Cloudflare. Zero per-seat fees.

## Natural Language to Visualization

Skip the drag-and-drop. Just ask:

```typescript
import { tableau } from 'tableau.do'

// Natural language creates visualizations
const chart = await tableau`show me sales by region over time`
const dashboard = await tableau`create a dashboard showing customer metrics`
const insight = await tableau`what's driving the decline in Q3?`

// Returns both visualization spec and rendered output
console.log(chart.spec)      // VegaLite/VizQL spec
console.log(chart.svg)       // Rendered SVG
console.log(chart.png)       // Rendered PNG
console.log(chart.insight)   // AI-generated narrative
```

## Features

### Data Connections

Connect to any data source:

| Source | Status | Description |
|--------|--------|-------------|
| **D1/SQLite** | Built-in | Native Cloudflare integration |
| **PostgreSQL** | Supported | Via Hyperdrive connection pooling |
| **MySQL** | Supported | Via Hyperdrive |
| **Snowflake** | Supported | Direct query |
| **BigQuery** | Supported | Direct query |
| **REST APIs** | Supported | Any JSON/CSV endpoint |
| **R2/S3** | Supported | Parquet, CSV, JSON files |
| **Spreadsheets** | Supported | Excel, Google Sheets |

```typescript
import { DataSource } from 'tableau.do'

// Connect to your data
const sales = DataSource.postgres({
  connectionString: env.DATABASE_URL,
  schema: 'public',
  tables: ['orders', 'customers', 'products'],
})

// Or connect to files
const logs = DataSource.parquet({
  bucket: env.R2_BUCKET,
  prefix: 'logs/',
})
```

### Visualization Types

All the charts you need:

```typescript
import { Chart } from 'tableau.do'

// Bar charts
Chart.bar({ x: 'region', y: 'sales', color: 'product' })

// Line charts with trends
Chart.line({ x: 'date', y: 'revenue', trendline: true })

// Scatter plots
Chart.scatter({ x: 'price', y: 'quantity', size: 'profit', color: 'category' })

// Geographic maps
Chart.map({ geo: 'state', value: 'customers', type: 'choropleth' })

// Treemaps
Chart.treemap({ path: ['category', 'subcategory'], value: 'sales' })

// Heat maps
Chart.heatmap({ x: 'hour', y: 'day', value: 'traffic' })

// Bullet charts
Chart.bullet({ measure: 'actual', target: 'goal', ranges: [0, 50, 75, 100] })
```

### Dashboards

Compose visualizations into interactive dashboards:

```typescript
import { Dashboard } from 'tableau.do'

export const SalesDashboard = Dashboard({
  name: 'Sales Performance',
  layout: 'responsive',
  sections: [
    {
      title: 'KPIs',
      items: [
        { type: 'metric', field: 'total_revenue', format: 'currency' },
        { type: 'metric', field: 'order_count', format: 'number' },
        { type: 'metric', field: 'avg_order_value', format: 'currency' },
      ],
    },
    {
      title: 'Trends',
      items: [
        { type: 'chart', chart: 'revenue_over_time', span: 2 },
        { type: 'chart', chart: 'orders_by_region', span: 1 },
      ],
    },
    {
      title: 'Details',
      items: [
        { type: 'table', source: 'recent_orders', pageSize: 20 },
      ],
    },
  ],
  filters: [
    { field: 'date_range', type: 'dateRange', default: 'last30Days' },
    { field: 'region', type: 'multiSelect', source: 'regions' },
    { field: 'product', type: 'search', source: 'products' },
  ],
})
```

### VizQL Compatibility

Write VizQL queries directly:

```typescript
import { vizql } from 'tableau.do'

// VizQL query syntax
const result = await vizql`
  SELECT
    [Region],
    SUM([Sales]) AS [Total Sales],
    AVG([Profit]) AS [Avg Profit]
  FROM [Orders]
  WHERE [Order Date] >= #2024-01-01#
  GROUP BY [Region]
  ORDER BY [Total Sales] DESC
`

// Renders to visualization spec
console.log(result.visualization)
```

### Calculated Fields

Create calculations without writing SQL:

```typescript
import { Field } from 'tableau.do'

const profitMargin = Field.calculated({
  name: 'Profit Margin',
  formula: '[Profit] / [Revenue]',
  format: 'percent',
})

const customerSegment = Field.calculated({
  name: 'Customer Segment',
  formula: `
    IF [Lifetime Value] > 10000 THEN 'Enterprise'
    ELSEIF [Lifetime Value] > 1000 THEN 'Business'
    ELSE 'Consumer'
    END
  `,
})

const rollingAvg = Field.calculated({
  name: '7-Day Moving Average',
  formula: 'WINDOW_AVG(SUM([Revenue]), -6, 0)',
  partitionBy: ['Region'],
})
```

### Table Calculations

Window functions and analytics:

```typescript
// Rank by sales within each region
Field.calculation('Sales Rank', 'RANK(SUM([Sales]))', {
  partitionBy: 'Region',
  orderBy: 'Sales DESC'
})

// Running total
Field.calculation('Running Total', 'RUNNING_SUM(SUM([Revenue]))')

// Percent of total
Field.calculation('% of Total', 'SUM([Sales]) / TOTAL(SUM([Sales]))')

// Year-over-year growth
Field.calculation('YoY Growth', '(ZN(SUM([Sales])) - LOOKUP(ZN(SUM([Sales])), -1)) / ABS(LOOKUP(ZN(SUM([Sales])), -1))')
```

## AI-Native Features

### Ask Data

Natural language queries that understand your data:

```typescript
import { askData } from 'tableau.do'

// Simple questions
const answer1 = await askData('What were total sales last month?')
// Returns: { value: 1234567, visualization: <bar chart>, narrative: "Total sales..." }

// Complex analysis
const answer2 = await askData('Which products are underperforming compared to last year?')
// Returns: { data: [...], visualization: <comparison chart>, narrative: "..." }

// Predictive
const answer3 = await askData('What will sales be next quarter based on current trends?')
// Returns: { prediction: {...}, confidence: 0.85, visualization: <forecast chart> }
```

### Explain Data

AI-powered anomaly detection and explanation:

```typescript
import { explainData } from 'tableau.do'

// Why did this metric change?
const explanation = await explainData({
  metric: 'revenue',
  period: { from: '2024-01-01', to: '2024-03-31' },
  question: 'Why did revenue drop in February?',
})

// Returns contributing factors with visualizations
console.log(explanation.factors)
// [
//   { factor: 'Marketing spend decreased 40%', impact: -0.35, viz: <chart> },
//   { factor: 'Key product out of stock', impact: -0.25, viz: <chart> },
//   { factor: 'Seasonal trend', impact: -0.15, viz: <chart> },
// ]
```

### Auto-Insights

Automatic discovery of interesting patterns:

```typescript
import { autoInsights } from 'tableau.do'

const insights = await autoInsights({
  datasource: 'sales',
  focus: ['revenue', 'customers', 'churn'],
})

// Returns ranked insights with visualizations
for (const insight of insights) {
  console.log(insight.headline)      // "Revenue up 23% in West region"
  console.log(insight.significance)  // 0.95
  console.log(insight.visualization) // <chart>
  console.log(insight.narrative)     // "The West region saw significant..."
}
```

### AI Agents as Analysts

AI agents can create and iterate on visualizations:

```typescript
import { priya, mark } from 'agents.do'
import { tableau } from 'tableau.do'

// Product manager analyzes metrics
const analysis = await priya`
  analyze our funnel conversion rates and create a dashboard
  showing where users are dropping off
`

// Marketing creates campaign dashboard
const campaign = await mark`
  build a real-time dashboard showing our launch campaign performance
  with social metrics, signups, and revenue attribution
`
```

## Architecture

### Edge-First Rendering

Visualizations render at the edge, close to your users:

```
                    +------------------------+
                    |    tableau.do Worker   |
                    |  (Query + Render)      |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | DashboardDO      | | DataSourceDO     | | ChartDO          |
    | (Layout + State) | | (Connection)     | | (Spec + Cache)   |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    |    D1    |       | Hyperdrive |        |     R2     |
    | (Metadata)|      | (Postgres) |        | (Exports)  |
    +----------+       +-----------+        +------------+
```

### Storage Tiers

- **Hot (SQLite/D1)** - Dashboard metadata, user preferences, recent queries
- **Warm (Hyperdrive)** - Live connections to external databases
- **Cold (R2)** - Exported data, snapshots, large datasets

### Rendering Pipeline

```typescript
// Query -> Spec -> Render -> Cache
NaturalLanguage | VizQL | ChartBuilder
        ↓
   Query Engine (SQL generation)
        ↓
   Data Fetch (Hyperdrive/D1/R2)
        ↓
   VegaLite Spec Generation
        ↓
   Server-Side Render (SVG/PNG/PDF)
        ↓
   Edge Cache (KV)
        ↓
   Client Delivery
```

## Embedding

Embed visualizations anywhere:

### iframe Embed

```html
<iframe
  src="https://your-org.tableau.do/embed/dashboard/sales?theme=light"
  width="100%"
  height="600"
></iframe>
```

### JavaScript SDK

```typescript
import { TableauEmbed } from 'tableau.do/embed'

const viz = new TableauEmbed({
  container: document.getElementById('viz'),
  dashboard: 'sales-performance',
  filters: {
    region: ['West', 'East'],
    date: { start: '2024-01-01', end: '2024-03-31' },
  },
  onSelect: (data) => console.log('Selected:', data),
})

// Programmatic interaction
await viz.applyFilter('product', ['Widget A', 'Widget B'])
const image = await viz.export('png')
const data = await viz.getData()
```

### React Component

```tsx
import { Tableau } from 'tableau.do/react'

function AnalyticsDashboard() {
  return (
    <Tableau
      dashboard="sales-performance"
      height={600}
      filters={{ region: selectedRegion }}
      onDataSelect={handleSelection}
      theme="dark"
    />
  )
}
```

## MCP Tools

Every visualization capability exposed as MCP tools:

```typescript
import { tableauTools } from 'tableau.do/mcp'

// Available tools
tableauTools.map(t => t.name)
// [
//   'create_chart',
//   'create_dashboard',
//   'query_data',
//   'ask_data',
//   'explain_data',
//   'export_visualization',
//   'list_datasources',
//   'connect_datasource',
// ]

// AI can create visualizations
await invokeTool('create_chart', {
  type: 'bar',
  datasource: 'sales',
  x: 'region',
  y: 'sum(revenue)',
  title: 'Revenue by Region',
})
```

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo tableau
# Deploys to your Cloudflare account
```

### Docker

```bash
docker run -p 8787:8787 dotdo/tableau
```

### Self-Hosted

```bash
git clone https://github.com/dotdo/tableau.do
cd tableau.do
npm install
npm run dev    # Local development
npm run deploy # Production deployment
```

## Migration from Tableau

### Export Your Workbooks

```bash
# Export from Tableau Server/Online
tableau export --server your-server.tableau.com --workbooks all

# Import to tableau.do
npx tableau-migrate import --source ./exports
```

### VizQL Compatibility

Most VizQL expressions work directly:

```
Tableau                         tableau.do
-----------------------------------------------------------------
[Sales]                         [Sales]                    (same)
SUM([Revenue])                  SUM([Revenue])             (same)
DATETRUNC('month', [Date])      DATETRUNC('month', [Date]) (same)
WINDOW_AVG(SUM([X]), -6, 0)     WINDOW_AVG(SUM([X]), -6, 0)(same)
ZN([Value])                     ZN([Value])                (same)
LOOKUP(SUM([X]), -1)            LOOKUP(SUM([X]), -1)       (same)
```

## Roadmap

- [x] Core chart types (bar, line, scatter, map, etc.)
- [x] Dashboard builder
- [x] VizQL query engine
- [x] Natural language queries
- [x] Calculated fields
- [x] Table calculations
- [ ] Storytelling (guided narratives)
- [ ] Prep (data transformation flows)
- [ ] Mobile app (PWA)
- [ ] Alerting and subscriptions
- [ ] Collaboration (comments, annotations)
- [ ] Data modeling layer

## Why Open Source?

Data visualization is too important to be locked behind per-seat pricing:

1. **Your insights** - Understanding your business shouldn't cost $70/user
2. **Your data** - Visualizations should run where your data lives
3. **Your AI** - Natural language analytics should be built-in, not premium
4. **Your team** - Everyone should be able to explore data, not just "Creators"

Tableau showed the world what visual analytics could be. **tableau.do** makes it accessible to everyone.

## License

MIT License - Use it however you want. Build dashboards. Embed in your product. Sell it to clients.

---

<p align="center">
  <strong>tableau.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://tableau.do">Website</a> | <a href="https://docs.tableau.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
