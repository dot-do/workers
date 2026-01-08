# powerbi.do

> Microsoft's BI juggernaut. Now open source. AI-native.

Power BI dominates enterprise BI with its Excel integration and Microsoft 365 ecosystem. But at $10-20/user/month for Pro, premium capacity starting at $5,000/month, and complete Microsoft lock-in, it's time for a new approach.

**powerbi.do** reimagines self-service BI for the AI era. Excel-native. DAX-compatible. Zero Microsoft dependency.

## The Problem

Microsoft built a BI empire on:

- **Per-seat pricing** - Pro at $10/user/month, Premium Per User at $20/user/month
- **Capacity pricing trap** - Premium capacity starts at $5,000/month for shared resources
- **Microsoft ecosystem lock-in** - Azure, Microsoft 365, SharePoint, Teams integration
- **Desktop-first** - Power BI Desktop required for authoring, service for viewing
- **DAX complexity** - Powerful but steep learning curve
- **Refresh limitations** - 8 refreshes/day on Pro, more requires Premium
- **Row limits** - 1M rows in reports without Premium

A 500-person enterprise? **$60k+/year** for Pro. Premium capacity? **$60k+ additional**.

## AI-Native API

```typescript
import { powerbi } from 'powerbi.do'           // Full SDK
import { powerbi } from 'powerbi.do/tiny'      // Minimal client
import { powerbi } from 'powerbi.do/dax'       // DAX-only operations
```

Your CFO lives in Excel. Your team needs dashboards. Microsoft wants $120k/year and a Power BI Desktop license for every analyst.

**What if your spreadsheets just became dashboards?**

```typescript
import { powerbi } from 'powerbi.do'
import { priya, mark } from 'agents.do'

// Talk to it like a colleague
const report = await powerbi`analyze ${excelFile} with revenue trends`
const dashboard = await powerbi`build KPI dashboard from ${spreadsheet}`
const insight = await powerbi`why did margins drop in February?`

// AI agents as BI developers
const analysis = await priya`create DAX measures for SaaS metrics`
const deck = await mark`build investor report from ${financials}`
```

**Promise pipelining** - chain transformations without `Promise.all`:

```typescript
const report = await powerbi`import ${excelFile}`
  .map(data => powerbi`transform with Power Query ${data}`)
  .map(model => powerbi`visualize ${model} as executive dashboard`)
  .map(viz => [priya, mark].map(r => r`review ${viz} for board`))
```

One network round trip. Natural language. Your Excel, transformed.

## The Solution

**powerbi.do** is Power BI reimagined:

```
Traditional Power BI            powerbi.do
-----------------------------------------------------------------
$10-20/user/month              $0 - run your own
Premium capacity $5k/month     Cloudflare Workers (free tier)
Desktop app required           Browser-first
Azure-only                     Any cloud, edge-native
8 refreshes/day (Pro)          Real-time streaming
1M row limit                   Unlimited (chunked)
DAX formulas                   DAX formulas (compatible!)
```

## One-Click Deploy

```bash
npx create-dotdo powerbi
```

Your own Power BI service. Running on Cloudflare. No Microsoft licenses.

## Excel-Native

The killer feature: true Excel integration without Microsoft:

```typescript
import { powerbi } from 'powerbi.do'

// Just point at your data
const report = await powerbi`load sales_data.xlsx with tables Sales Products Regions`
const sheets = await powerbi`connect to Google Sheet ${spreadsheetId}`

// Excel formulas work as DAX measures
await powerbi`
  analyze ${excelFile} with measures:
  - Total Sales = SUM(Sales[Amount])
  - YoY Growth = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))
`
```

## Features

### DAX Compatible

Write DAX formulas exactly like Power BI - or describe them naturally:

```typescript
// Natural language generates DAX
await powerbi`profit margin as [Profit] / [Revenue] in percent`
await powerbi`YTD sales vs same period last year`
await powerbi`running total of sales by date`
```

Or write DAX directly:

```dax
// Measures
Total Sales = SUM(Sales[Amount])

Profit Margin = DIVIDE([Total Profit], [Total Sales], 0)

YTD Sales = TOTALYTD([Total Sales], 'Date'[Date])

Running Total =
CALCULATE(
    [Total Sales],
    FILTER(
        ALL('Date'[Date]),
        'Date'[Date] <= MAX('Date'[Date])
    )
)

// Time intelligence
Same Period Last Year =
CALCULATE(
    [Total Sales],
    SAMEPERIODLASTYEAR('Date'[Date])
)

YoY Growth % =
DIVIDE(
    [Total Sales] - [Same Period Last Year],
    [Same Period Last Year],
    0
)

// Advanced filtering
Top 10 Products =
CALCULATE(
    [Total Sales],
    TOPN(10, ALL(Products), [Total Sales], DESC)
)
```

### Data Model

Define relationships and hierarchies naturally:

```typescript
import { powerbi } from 'powerbi.do'

// Load tables from files
await powerbi`load sales.csv as Sales`
await powerbi`load products.csv as Products`
await powerbi`create date table 2020 to 2025`

// Relationships in plain English
await powerbi`relate Sales.ProductID to Products.ProductID`
await powerbi`relate Sales.Date to Date.Date`

// Hierarchies
await powerbi`Products hierarchy: Category > Subcategory > Name`

// Or describe the whole model at once
await powerbi`
  model from:
  - sales.csv as Sales
  - products.csv as Products
  - date table 2020 to 2025

  relationships:
  - Sales.ProductID -> Products.ProductID
  - Sales.Date -> Date.Date
`
```

### Reports

Build interactive reports with natural language:

```typescript
import { powerbi } from 'powerbi.do'

// Create a report with one sentence
const report = await powerbi`executive dashboard for sales data`

// Or describe what you want to see
await powerbi`
  Sales Analysis report:
  - card: Total Revenue as currency
  - card: YoY Growth as percent, green if positive red if negative
  - line chart: revenue by month vs last year
  - bar chart: sales by category descending

  slicers: Year, Category, Region
`

// Add pages naturally
await powerbi`add Product Details page to ${report}`
await powerbi`matrix: Category > Subcategory by Quarter showing Sales and Margin`

// AI builds the layout - you refine if needed
await powerbi`make the revenue chart bigger`
await powerbi`move slicers to sidebar`
```

### Power Query (M)

Transform data naturally or with M code:

```typescript
import { powerbi } from 'powerbi.do'

// Natural language transformations
await powerbi`transform sales.csv: filter Amount > 0, add YearMonth column`
await powerbi`unpivot months into Month and Value columns`
await powerbi`split Name column by comma into First and Last`

// Chain transformations
await powerbi`load sales.csv`
  .map(data => powerbi`filter ${data} where Amount > 0`)
  .map(data => powerbi`add column YearMonth = Year * 100 + Month`)
  .map(data => powerbi`remove duplicates by OrderID`)

// Or use M code directly when you need precision
await powerbi`
  M code:
  let
    Source = Csv.Document(File.Contents("sales.csv")),
    Filtered = Table.SelectRows(Source, each [Amount] > 0)
  in
    Filtered
`
```

### Quick Measures

Describe what you want, get DAX:

```typescript
import { powerbi } from 'powerbi.do'

// Just say it
const rolling = await powerbi`measure: rolling 3-month average of sales`
// Returns: AVERAGEX(DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -3, MONTH), [Total Sales])

const ytdCompare = await powerbi`measure: YTD sales vs same period last year`
// Returns complex DAX with time intelligence

// Common patterns in plain English
await powerbi`measure: profit margin as Profit / Revenue in percent`
await powerbi`measure: running total of sales by date`
await powerbi`measure: percent of parent category`
await powerbi`measure: rank products by sales descending`
```

## AI-Native Features

### Natural Language Q&A

Ask questions about your data:

```typescript
import { powerbi } from 'powerbi.do'

// Just ask
const answer = await powerbi`what were total sales last month?`
const compare = await powerbi`how does Europe compare to North America?`
const trend = await powerbi`show me the sales trend over time`

// Drill down conversationally
await powerbi`break that down by product category`
await powerbi`now just show electronics`
await powerbi`why did margins drop in Q3?`

// Answers come with visualizations automatically
```

### AI Insights

Automatic insight discovery:

```typescript
import { powerbi } from 'powerbi.do'

// Ask for insights
const findings = await powerbi`insights on sales last quarter`
const anomalies = await powerbi`what's unusual in the data?`
const drivers = await powerbi`what's driving revenue growth?`

// AI finds and explains patterns automatically:
// - "Sales spiked 45% on March 15, driven by Product X promotion"
// - "West region outperforming by 23% due to new store openings"
// - "Customer churn increased in segment B after price change"

// Each insight comes with a visualization
```

### Smart Narratives

Auto-generated text summaries:

```typescript
import { powerbi } from 'powerbi.do'

// Generate executive summaries
const summary = await powerbi`summarize sales performance for the board`
// "Sales increased 12% quarter-over-quarter, driven primarily by strong
// performance in Electronics (+23%). West region led at 18%, Northeast declined 5%..."

// Different tones for different audiences
await powerbi`explain this chart for the CEO`
await powerbi`technical summary of data quality issues`
await powerbi`weekly metrics email for the sales team`
```

### AI Agents as Analysts

AI agents create complete reports with promise pipelining:

```typescript
import { priya, mark, tom } from 'agents.do'
import { powerbi } from 'powerbi.do'

// Agents work like analysts
const productReport = await priya`analyze our product usage data`
  .visualize()    // auto-generates Power BI report
  .share()        // sends to stakeholders

// Chain agents for review workflows
const report = await mark`build campaign performance report`
  .map(draft => [priya, tom].map(r => r`review ${draft}`))
  .map(approved => powerbi`publish ${approved} to workspace`)

// One round trip - natural language throughout
```

## Real-Time Streaming

No refresh limitations:

```typescript
import { powerbi } from 'powerbi.do'

// Create a streaming dataset
const stream = await powerbi`stream: Real-time Sales with timestamp product amount region`

// Push data naturally
await powerbi`push to Real-time Sales: ${sale}`

// Or pipe from any source
await powerbi`stream from ${kafkaTopic} to Real-time Sales`
await powerbi`stream from ${webhookUrl} to Real-time Sales`

// Reports update automatically - no 8/day limit
```

## Embedding

Embed reports in your applications:

### React Component

```tsx
import { PowerBIReport } from 'powerbi.do/react'

function Dashboard() {
  return (
    <PowerBIReport
      report="sales-analysis"
      filters={{ year: 2024, region: 'West' }}
      onDataSelected={(data) => console.log(data)}
    />
  )
}
```

### Row-Level Security

```typescript
import { powerbi } from 'powerbi.do'

// Embed with security in one line
const token = await powerbi`embed sales-analysis for ${user.email} filtered to ${user.region}`

// RLS just works - users see only their data
```

### JavaScript SDK

```typescript
import { powerbi } from 'powerbi.do'

// Embed and control naturally
const embed = await powerbi`embed sales-analysis in ${container}`

// Interact naturally
await powerbi`filter ${embed} to Year 2024`
await powerbi`export ${embed} data to Excel`
```

## Architecture

### DAX Engine

```
DAX Expression         Parse Tree           Execution Plan
      |                    |                      |
      v                    v                      v
+-----------+        +-----------+          +-----------+
| DAX       |  --->  | AST       |  --->    | Query     |
| Parser    |        | Optimizer |          | Engine    |
+-----------+        +-----------+          +-----------+
                           |
                    +------+------+
                    |             |
              +----------+  +----------+
              | Filter   |  | Iterator |
              | Context  |  | Engine   |
              +----------+  +----------+
```

### Storage Architecture

```
                    +------------------------+
                    |   powerbi.do Worker    |
                    |   (API + DAX Engine)   |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | ModelDO          | | QueryCacheDO     | | ReportDO         |
    | (Data Model)     | | (DAX Results)    | | (Layout + State) |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    |    D1    |       |     R2    |        |     KV     |
    | (Metadata)|      | (Datasets)|        | (Cache)    |
    +----------+       +-----------+        +------------+
```

### Column Store

Columnar storage for fast aggregations - automatic optimization:

```typescript
import { powerbi } from 'powerbi.do'

// You don't configure storage - it optimizes automatically
// Dates as integers, dictionary encoding, bitmap indexes
// All handled by the engine

// Just query naturally
await powerbi`sum of Amount by Date for last 5 years`  // <10ms
```

## Data Connections

Connect to any source naturally:

```typescript
import { powerbi } from 'powerbi.do'

// Just say where your data is
await powerbi`connect to ${postgresUrl}`
await powerbi`import from Snowflake sales_db.transactions`
await powerbi`load data from ${restApiEndpoint}`
await powerbi`sync with Google Sheet ${spreadsheetId}`
```

| Source | Type | Notes |
|--------|------|-------|
| **Excel** | Import | Full Excel formula support |
| **CSV/JSON** | Import | Auto-detect schema |
| **PostgreSQL** | DirectQuery | Via Hyperdrive |
| **MySQL** | DirectQuery | Via Hyperdrive |
| **SQL Server** | DirectQuery | Compatible queries |
| **Snowflake** | DirectQuery | Native connector |
| **BigQuery** | DirectQuery | Service account auth |
| **REST API** | Import | Any JSON endpoint |
| **OData** | Import | Full OData support |
| **SharePoint** | Import | List data |
| **Google Sheets** | Import | Real-time sync |

## Migration from Power BI

### Import Your Reports

```bash
# One command migration
npx powerbi-migrate import ./report.pbix
```

```typescript
import { powerbi } from 'powerbi.do'

// Or import programmatically
await powerbi`import ${pbixFile}`
await powerbi`migrate workspace from Power BI service`
```

### DAX Compatibility

Full DAX function support:

```
Category               Functions
-----------------------------------------------------------------
Aggregation            SUM, AVERAGE, MIN, MAX, COUNT, DISTINCTCOUNT
Filter                 CALCULATE, FILTER, ALL, ALLEXCEPT, VALUES
Time Intelligence      TOTALYTD, SAMEPERIODLASTYEAR, DATEADD, DATESYTD
Table                  SUMMARIZE, ADDCOLUMNS, SELECTCOLUMNS, TOPN
Text                   CONCATENATE, FORMAT, LEFT, RIGHT, LEN
Logical                IF, SWITCH, AND, OR, NOT, TRUE, FALSE
Math                   DIVIDE, ROUND, ABS, POWER, SQRT
Information            ISBLANK, ISERROR, ISFILTERED, HASONEVALUE
```

## Roadmap

- [x] DAX parser and engine
- [x] Data model and relationships
- [x] Core visualizations
- [x] Power Query (M) parser
- [x] Natural language Q&A
- [x] Embedding SDK
- [ ] DirectQuery optimization
- [ ] Composite models
- [ ] Paginated reports
- [ ] Dataflows
- [ ] Deployment pipelines
- [ ] Mobile app (PWA)

## Why Open Source?

Self-service BI shouldn't require Microsoft licensing:

1. **Your data model** - Relationships and DAX encode business logic
2. **Your reports** - Visualizations are how you understand your business
3. **Your Excel files** - The world runs on spreadsheets
4. **Your embedding** - Analytics in your product shouldn't cost per-user

Power BI showed the world what self-service BI could be. **powerbi.do** makes it accessible to everyone.

## License

MIT License - Use it however you want. Embed in your apps. Build BI platforms.

---

<p align="center">
  <strong>powerbi.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://powerbi.do">Website</a> | <a href="https://docs.powerbi.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
