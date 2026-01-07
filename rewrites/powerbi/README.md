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

// Connect directly to Excel files
const report = await powerbi.fromExcel({
  file: 'sales_data.xlsx',
  tables: ['Sales', 'Products', 'Regions'],
})

// Or connect to Google Sheets
const report2 = await powerbi.fromSheet({
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  ranges: ['Sales!A1:Z1000', 'Products!A1:D100'],
})

// Excel formulas work as DAX measures
const report3 = await powerbi`
  analyze ${excelFile} with measures:
  - Total Sales = SUM(Sales[Amount])
  - YoY Growth = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))
`
```

## Features

### DAX Compatible

Write DAX formulas exactly like Power BI:

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

Define relationships and hierarchies:

```typescript
import { DataModel, Table, Relationship } from 'powerbi.do'

export const SalesModel = DataModel({
  tables: {
    Sales: Table({
      source: 'sales.csv',
      columns: {
        OrderID: { type: 'integer', key: true },
        Date: { type: 'date' },
        ProductID: { type: 'integer' },
        CustomerID: { type: 'integer' },
        Amount: { type: 'decimal' },
        Quantity: { type: 'integer' },
      },
    }),

    Products: Table({
      source: 'products.csv',
      columns: {
        ProductID: { type: 'integer', key: true },
        Name: { type: 'string' },
        Category: { type: 'string' },
        Subcategory: { type: 'string' },
        Price: { type: 'decimal' },
      },
      hierarchies: {
        'Product Hierarchy': ['Category', 'Subcategory', 'Name'],
      },
    }),

    Date: Table({
      type: 'date',
      start: '2020-01-01',
      end: '2025-12-31',
      // Auto-generates Year, Quarter, Month, Week, Day columns
    }),
  },

  relationships: [
    Relationship({
      from: { table: 'Sales', column: 'ProductID' },
      to: { table: 'Products', column: 'ProductID' },
      type: 'many-to-one',
    }),
    Relationship({
      from: { table: 'Sales', column: 'Date' },
      to: { table: 'Date', column: 'Date' },
      type: 'many-to-one',
    }),
  ],
})
```

### Reports

Build interactive reports:

```typescript
import { Report, Page, Visual } from 'powerbi.do'

export const SalesReport = Report({
  name: 'Sales Analysis',
  theme: 'corporate',
  pages: [
    Page({
      name: 'Overview',
      visuals: [
        Visual.card({
          title: 'Total Revenue',
          measure: '[Total Sales]',
          format: 'currency',
          position: { x: 0, y: 0, width: 200, height: 100 },
        }),
        Visual.card({
          title: 'YoY Growth',
          measure: '[YoY Growth %]',
          format: 'percent',
          conditionalFormatting: {
            positive: 'green',
            negative: 'red',
          },
          position: { x: 220, y: 0, width: 200, height: 100 },
        }),
        Visual.lineChart({
          title: 'Revenue Trend',
          axis: 'Date[Month]',
          values: ['[Total Sales]', '[Same Period Last Year]'],
          position: { x: 0, y: 120, width: 600, height: 300 },
        }),
        Visual.barChart({
          title: 'Sales by Category',
          axis: 'Products[Category]',
          values: ['[Total Sales]'],
          sort: 'descending',
          position: { x: 620, y: 120, width: 400, height: 300 },
        }),
      ],
      slicers: [
        { field: 'Date[Year]', type: 'dropdown' },
        { field: 'Products[Category]', type: 'list' },
        { field: 'Customers[Region]', type: 'tile' },
      ],
    }),
    Page({
      name: 'Product Details',
      visuals: [
        Visual.matrix({
          rows: ['Products[Category]', 'Products[Subcategory]'],
          columns: ['Date[Quarter]'],
          values: ['[Total Sales]', '[Profit Margin]'],
          subtotals: true,
        }),
      ],
    }),
  ],
})
```

### Power Query (M)

Transform data with Power Query:

```typescript
import { PowerQuery } from 'powerbi.do'

const transformedSales = PowerQuery(`
  let
    Source = Csv.Document(File.Contents("sales.csv")),
    #"Promoted Headers" = Table.PromoteHeaders(Source),
    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers", {
      {"Date", type date},
      {"Amount", type number}
    }),
    #"Filtered Rows" = Table.SelectRows(#"Changed Type", each [Amount] > 0),
    #"Added YearMonth" = Table.AddColumn(#"Filtered Rows", "YearMonth",
      each Date.Year([Date]) * 100 + Date.Month([Date])
    )
  in
    #"Added YearMonth"
`)
```

### Quick Measures

AI-generated DAX:

```typescript
import { quickMeasure } from 'powerbi.do'

// Describe what you want, get DAX
const measure = await quickMeasure({
  model: SalesModel,
  description: 'rolling 3-month average of sales',
})
// Returns: AVERAGEX(DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -3, MONTH), [Total Sales])

const measure2 = await quickMeasure({
  model: SalesModel,
  description: 'year-to-date sales compared to same period last year',
})
// Returns complex DAX with time intelligence
```

## AI-Native Features

### Natural Language Q&A

Ask questions about your data:

```typescript
import { qna } from 'powerbi.do'

// Simple questions
const answer1 = await qna('what were total sales last month?')
// Returns: { value: 1234567, visualization: <chart> }

// Comparative questions
const answer2 = await qna('how does Europe compare to North America?')
// Returns: { data: [...], visualization: <comparison chart> }

// Trend questions
const answer3 = await qna('show me the sales trend over time')
// Returns: { data: [...], visualization: <line chart> }

// Drill-down questions
const answer4 = await qna('break that down by product category')
// Returns: { data: [...], visualization: <stacked chart> }
```

### AI Insights

Automatic insight discovery:

```typescript
import { insights } from 'powerbi.do'

const findings = await insights({
  model: SalesModel,
  focus: 'Sales[Amount]',
  timeframe: 'last quarter',
})

// Returns ranked insights
for (const finding of findings) {
  console.log(finding.type)        // 'anomaly' | 'trend' | 'driver'
  console.log(finding.description) // "Sales spiked 45% on March 15"
  console.log(finding.explanation) // "Driven by Product X promotion"
  console.log(finding.visual)      // Auto-generated visualization
}
```

### Smart Narratives

Auto-generated text summaries:

```typescript
import { smartNarrative } from 'powerbi.do'

const narrative = await smartNarrative({
  visual: salesTrendChart,
  style: 'executive-summary',
})

// Returns: "Sales increased 12% quarter-over-quarter, driven primarily
// by strong performance in the Electronics category (+23%). The West
// region led growth at 18%, while the Northeast declined 5%..."
```

### AI Agents as Analysts

AI agents can create complete reports:

```typescript
import { priya, mark } from 'agents.do'
import { powerbi } from 'powerbi.do'

// Product manager builds analytics
const productReport = await priya`
  create a Power BI report analyzing our product usage data
  include adoption metrics, engagement scores, and churn indicators
`

// Marketing builds campaign report
const campaignReport = await mark`
  build a report showing our marketing campaign performance
  with spend, conversions, and ROI by channel
`
```

## Real-Time Streaming

No refresh limitations:

```typescript
import { StreamingDataset } from 'powerbi.do'

const realtimeSales = StreamingDataset({
  name: 'Real-time Sales',
  columns: {
    timestamp: { type: 'datetime' },
    product: { type: 'string' },
    amount: { type: 'number' },
    region: { type: 'string' },
  },
})

// Push data in real-time
for await (const sale of salesStream) {
  await realtimeSales.push({
    timestamp: new Date(),
    product: sale.product,
    amount: sale.amount,
    region: sale.region,
  })
}

// Report updates automatically
```

## Embedding

Embed reports in your applications:

### JavaScript SDK

```typescript
import { PowerBIEmbed } from 'powerbi.do/embed'

const embed = new PowerBIEmbed({
  container: document.getElementById('report'),
  report: 'sales-analysis',
  accessToken: await getEmbedToken(),
  settings: {
    filterPaneEnabled: false,
    navContentPaneEnabled: true,
  },
})

// Interact programmatically
await embed.setFilters([
  { table: 'Date', column: 'Year', values: [2024] },
])
const data = await embed.exportData()
```

### React Component

```tsx
import { PowerBIReport } from 'powerbi.do/react'

function Dashboard() {
  return (
    <PowerBIReport
      reportId="sales-analysis"
      filters={{ year: 2024, region: 'West' }}
      onDataSelected={(data) => console.log(data)}
      height={600}
    />
  )
}
```

### Row-Level Security

```typescript
import { createEmbedToken } from 'powerbi.do/embed'

const token = await createEmbedToken({
  report: 'sales-analysis',
  roles: ['RegionalManager'],
  filters: {
    'Customers[Region]': user.region,  // Row-level security
  },
  expiry: Date.now() + 3600000,
})
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

Power BI uses columnar storage for performance:

```typescript
// Data stored in column format for fast aggregations
ColumnStore({
  table: 'Sales',
  columns: {
    Date: Int32Array,      // Dates as integers
    ProductID: Int32Array, // Dictionary encoded
    Amount: Float64Array,  // Native numbers
  },
  dictionaries: {
    ProductID: ['Widget A', 'Widget B', ...],
  },
  indexes: {
    Date: BitIndex,  // Bitmap index for filtering
  },
})
```

## Data Connections

Connect to any source:

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

### Export Your Reports

```bash
# Export PBIX file
# (Manual export from Power BI Desktop)

# Import to powerbi.do
npx powerbi-migrate import ./report.pbix
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
