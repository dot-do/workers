# tableau.do

> The $15B visualization platform. Now open source. AI-native.

Tableau revolutionized how businesses see data. But at $70/user/month for Creators, $42/user/month for Explorers, and $15/user/month for just viewing - with Salesforce's AI features locked behind premium tiers - it's time for a new approach.

**tableau.do** reimagines data visualization for the AI era. Natural language to charts. One-click deploy. No per-seat licensing.

## AI-Native API

```typescript
import { tableau } from 'tableau.do'           // Full SDK
import { tableau } from 'tableau.do/tiny'      // Minimal client
import { tableau } from 'tableau.do/viz'       // Visualization-only
```

Natural language for data visualization:

```typescript
import { tableau } from 'tableau.do'

// Talk to it like a colleague
const sales = await tableau`sales by region this quarter`
const trend = await tableau`revenue trend last 12 months`
const compare = await tableau`compare Q3 vs Q4 by product`

// Chain like sentences
await tableau`customers at risk of churn`
  .visualize(`heatmap by segment and tenure`)

// Dashboards that build themselves
await tableau`executive dashboard`
  .add(`revenue this quarter`)
  .add(`top customers by lifetime value`)
  .add(`churn risk by segment`)
  .publish()
```

## The Problem

Salesforce acquired Tableau for $15.7B and built an empire on:

| What Tableau Charges | The Reality |
|---------------------|-------------|
| **Creator** | $70/user/month to make charts |
| **Explorer** | $42/user/month to interact |
| **Viewer** | $15/user/month just to look |
| **AI Features** | Premium tier upsell |
| **Server** | Dedicated infrastructure + admin |
| **Lock-in** | Einstein ties you to Salesforce |

### The Salesforce Tax

Since the acquisition:

- Per-seat pricing at every tier
- AI features locked behind premium
- Einstein integration push
- Server complexity unchanged
- Data extracts still required

A 50-person analytics team? **$50k+/year** before you connect a single data source.

### The Visualization Gap

Tableau talks "self-service." But:

- Creator license to make a chart
- Explorer license to interact
- Viewer license just to see it
- Premium for AI-powered insights
- Server for any collaboration

Everyone should see their data. Not just licensed "Creators."

## The Solution

**tableau.do** reimagines visualization for everyone:

```
Traditional Tableau              tableau.do
-----------------------------------------------------------------
$70/user/month Creator          $0 - run your own
$42/user/month Explorer         Everyone explores
$15/user/month Viewer           Everyone views
"Ask Data" premium              Natural language built-in
Tableau Server                  Cloudflare Workers
Data extracts                   Live queries at the edge
```

## One-Click Deploy

```bash
npx create-dotdo tableau
```

Your own visualization platform. Running on Cloudflare. Zero per-seat fees.

```typescript
import { Tableau } from 'tableau.do'

export default Tableau({
  name: 'acme-analytics',
  domain: 'viz.acme.com',
  theme: 'brand',
})
```

## Features

### Data Connections

```typescript
// Natural as describing your data
const sales = await tableau`connect postgres with orders, customers, products`
const logs = await tableau`connect parquet files in analytics bucket`
const sheets = await tableau`import Q4 forecast from Google Sheets`

// AI infers what you need
await tableau`orders`              // connects to orders table
await tableau`sales data`          // finds relevant datasource
await tableau`last year revenue`   // queries the right tables
```

### Visualizations

```typescript
// Just describe what you want to see
await tableau`sales by region as bar chart`
await tableau`revenue trend over 12 months`
await tableau`customers by state on a map`
await tableau`traffic by hour and day as heatmap`

// AI picks the right chart type
await tableau`show me the distribution`         // histogram
await tableau`compare categories`               // bar chart
await tableau`show the trend`                   // line chart
await tableau`show relationships`               // scatter plot
```

### Dashboards

```typescript
// Dashboards are just sentences
await tableau`sales dashboard`
  .add(`revenue this quarter`)
  .add(`orders by region`)
  .add(`top 10 customers`)

// Or one-shot
await tableau`executive dashboard with revenue, orders, and customer metrics`

// Interactive filters just work
await tableau`sales dashboard filtered by region and date`
```

### Calculated Fields

```typescript
// Define calculations naturally
const margin = await tableau`profit margin as [Profit] / [Revenue] in percent`
const segment = await tableau`customer segment: Enterprise if LTV > 10k, Business if > 1k, else Consumer`
const rolling = await tableau`7-day moving average of revenue by region`

// Or ask for them
await tableau`add year-over-year growth calculation`
await tableau`add running total to sales`
await tableau`rank customers by revenue within each region`
```

### Table Calculations

```typescript
// Window functions as natural language
await tableau`rank by sales within each region`
await tableau`running total of revenue`
await tableau`percent of total by category`
await tableau`compare to previous year`

// Complex analytics
await tableau`show month-over-month change`
await tableau`add trend line to revenue chart`
await tableau`forecast next 3 months based on trend`
```

## AI-Native Analytics

### Ask Data

```typescript
// Just ask questions
await tableau`what were total sales last month?`
await tableau`which products are underperforming?`
await tableau`what will sales be next quarter?`

// AI returns answers with visualizations
const answer = await tableau`why did churn spike in Q3?`
// Returns chart + narrative + contributing factors
```

### Explain Data

```typescript
// Ask why things changed
await tableau`why did revenue drop in February?`
await tableau`what's driving the Q3 decline?`
await tableau`explain the spike in signups last week`

// AI surfaces contributing factors automatically
// - Marketing spend decreased 40%
// - Key product out of stock
// - Seasonal trend
```

### Auto-Insights

```typescript
// Surface patterns automatically
await tableau`what's interesting in sales data?`
await tableau`anomalies in the last 30 days`
await tableau`trends I should know about`

// AI proactively finds insights
// "Revenue up 23% in West region"
// "Churn correlated with support tickets"
// "Tuesday orders 40% higher than average"
```

### Promise Pipelining

Chain operations without `Promise.all`:

```typescript
const deck = await tableau`sales data`
  .map(data => tableau`visualize ${data} by region`)
  .map(viz => [priya, mark].map(r => r`review ${viz} for board`))

// One network round trip. Natural language. Your data, visualized.
```

### AI Agents as Analysts

```typescript
import { priya, mark } from 'agents.do'

// Product manager analyzes metrics
await priya`analyze funnel conversion and visualize drop-off`

// Marketing creates campaign dashboard
await mark`real-time dashboard for launch campaign with social, signups, revenue`

// They iterate naturally
await priya`this chart is confusing, simplify it`
await mark`add comparison to last quarter`
```

## Architecture

### Durable Object per Dashboard

```
TableauDO (config, theme, permissions)
  |
  +-- DashboardsDO (layouts, filters, state)
  |     |-- SQLite: Dashboard definitions
  |     +-- R2: Exported snapshots
  |
  +-- DataSourcesDO (connections, schemas)
  |     |-- SQLite: Connection metadata
  |     +-- Hyperdrive: Live queries
  |
  +-- ChartsDO (specs, cache, renders)
        |-- SQLite: Chart specs
        +-- KV: Rendered outputs (SVG/PNG)
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Dashboard metadata, preferences | <10ms |
| **Warm** | Hyperdrive | Live database queries | <100ms |
| **Cold** | R2 | Exports, snapshots, large datasets | <1s |

## Embedding

```typescript
// Embed anywhere
await tableau`sales dashboard`.embed('div#chart')

// Or as iframe
await tableau`sales dashboard`.iframe({ width: '100%', height: 600 })

// React component
import { Tableau } from 'tableau.do/react'

<Tableau query="sales by region" height={400} />
```

### Interactive Features

```typescript
// Filters are natural language
await tableau`sales dashboard`
  .filter(`West and East regions`)
  .filter(`Q1 2024`)

// Export anywhere
await tableau`executive dashboard`.export('pdf')
await tableau`revenue chart`.export('png')
await tableau`customer data`.export('csv')
```

## vs Tableau

| Feature | Tableau | tableau.do |
|---------|---------|-----------|
| **Pricing** | $15-70/user/month | $0 - run your own |
| **AI** | Premium tier | Built-in |
| **Architecture** | Server + Desktop | Edge-native |
| **Data** | Extracts required | Live queries |
| **Deploy** | Months | Minutes |
| **Lock-in** | Salesforce ecosystem | MIT licensed |

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo tableau
```

### Docker

```bash
docker run -p 8787:8787 dotdo/tableau
```

### Self-Hosted

```bash
git clone https://github.com/dotdo/tableau.do
cd tableau.do && pnpm install && pnpm dev
```

## Migration from Tableau

```typescript
// Import existing workbooks
await tableau`import workbooks from Tableau Server`

// VizQL expressions work directly
await tableau`SUM([Sales]) by [Region]`           // same syntax
await tableau`WINDOW_AVG(SUM([X]), -6, 0)`        // same functions
await tableau`DATETRUNC('month', [Order Date])`   // same date math
```

## Use Cases

### Executive Dashboards

```typescript
await tableau`executive dashboard`
  .add(`revenue this quarter vs target`)
  .add(`top 10 customers by ARR`)
  .add(`churn by segment`)
  .share(`board@company.com`)
```

### Sales Analytics

```typescript
await tableau`sales pipeline by stage and owner`
await tableau`conversion rates by lead source`
await tableau`forecast vs actual by quarter`
```

### Product Analytics

```typescript
await tableau`user funnel from signup to paid`
await tableau`feature usage by cohort`
await tableau`retention curve by acquisition channel`
```

## Roadmap

### Core
- [x] Natural language queries
- [x] Chart types (bar, line, scatter, map)
- [x] Dashboard builder
- [x] Calculated fields
- [x] Table calculations
- [ ] Storytelling (guided narratives)
- [ ] Prep (data transformation)
- [ ] Alerting and subscriptions

### AI
- [x] Ask Data
- [x] Explain Data
- [x] Auto-Insights
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] Natural language alerts

## Why Open Source?

Data visualization shouldn't require a license for every viewer:

1. **Your insights** - Understanding your business shouldn't cost $70/user
2. **Your data** - Visualizations should run where your data lives
3. **Your AI** - Natural language should be built-in, not premium
4. **Your team** - Everyone should explore data, not just "Creators"

Tableau showed the world what visual analytics could be. **tableau.do** makes it accessible to everyone.

## Contributing

```bash
git clone https://github.com/dotdo/tableau.do
cd tableau.do
pnpm install
pnpm test
```

## License

MIT License - Build dashboards. Embed in your product. Visualize anything.

---

<p align="center">
  <strong>The $15B visualization platform ends here.</strong>
  <br />
  Natural language. AI-native. Everyone's an analyst.
  <br /><br />
  <a href="https://tableau.do">Website</a> |
  <a href="https://docs.tableau.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/tableau.do">GitHub</a>
</p>
