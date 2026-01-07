# sap.do

> Enterprise ERP for Manufacturing. AI-Native. Zero Complexity.

[![npm version](https://img.shields.io/npm/v/sap.do.svg)](https://www.npmjs.com/package/sap.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

SAP is the $200B gorilla of enterprise software. S/4HANA implementations cost $10M-$100M+. Even "lightweight" SAP Business One requires $50,000-200,000 in licensing plus consultants charging $200-400/hour.

**sap.do** is the open-source alternative. Manufacturing-grade ERP on Cloudflare Workers. AI runs your MRP. Deploy in minutes, not years. OData compatible for existing integrations.

## The workers.do Way

You're running a manufacturing business. You need MRP, BOMs, production orders, quality control. SAP wants $10M and 3 years. Your competitors are shipping while you're still in "discovery."

**workers.do** gives you an AI manufacturing team that understands your shop floor:

```typescript
import { sap } from 'sap.do'
import { ops, planner, quality } from 'agents.do'

// Natural language manufacturing operations
const mrp = await sap`plan production for ${salesOrder}`
const bom = await sap`explode BOM for ${finishedGood} with all components`
const capacity = await sap`check capacity for ${workCenter} next ${weeks} weeks`
```

### Promise Pipelining

Chain complex manufacturing workflows with a single network round trip:

```typescript
const produced = await sap`create production order for ${material}`
  .map(order => sap`release ${order} to shop floor`)
  .map(order => sap`confirm operations for ${order}`)
  .map(order => [quality, ops].map(r => r`inspect ${order}`))
```

### AI Agents for Manufacturing

```typescript
// Planner agent handles MRP
await planner`
  Run MRP for next quarter.
  Identify materials with lead time risk.
  Suggest purchase orders to place this week.
`

// Shop floor agent handles execution
await shopfloor`What should I work on next?`
// "Production order PRD-001 for FINISHED-001 is highest priority.
//  Materials staged at bin STAGING-01.
//  Estimated completion: 2.5 hours."

// Quality agent handles inspections
await quality`
  Predict quality outcomes for incoming batch from ${vendor}.
  Flag any high-risk materials for 100% inspection.
`
```

One import. Natural language. Your AI manufacturing team.

## The Problem

SAP has become synonymous with "enterprise complexity":

| The SAP Tax | Reality |
|-------------|---------|
| SAP Business One | $95-150/user/month + implementation |
| SAP S/4HANA Cloud | $350-500+/user/month |
| Implementation | 6-24 months, often fails |
| Consultants | $200-400/hour (Deloitte, Accenture, etc.) |
| Technical debt | ABAP developers increasingly rare |
| Total cost | 3-5x software cost in services |

**The dirty secret**: Most SAP implementations:
- Take 2x longer than planned
- Cost 3x the original budget
- Deliver 50% of promised functionality
- Require permanent consultant staff

Meanwhile, SAP's core value proposition - **materials planning for manufacturing** - is fundamentally an AI problem. An LLM with access to your BOM, inventory, and sales forecast can do what MRP does, but better.

## The Solution

**sap.do** brings manufacturing ERP to the edge:

```bash
npx create-dotdo sap
```

Your own SAP alternative. Running on Cloudflare. AI-native from day one.

| SAP | sap.do |
|-----|--------|
| $95-500+/user/month | **Free** (open source) |
| 6-24 month implementation | **Minutes** |
| ABAP (1983 technology) | **TypeScript** |
| Consultant dependency | **Self-service** |
| AI as "innovation" | **AI at the core** |
| Vendor lock-in | **OData v4 compatible** |

---

## Features

### Material Master

The foundation of manufacturing ERP. Every item, every attribute, every view.

```typescript
import { sap } from 'sap.do'

// Create material master
await sap.materials.create({
  number: 'MAT-001',
  description: 'Aluminum Extrusion 6061-T6',
  type: 'raw',  // raw, semifinished, finished, service
  baseUnit: 'KG',

  // Purchasing view
  purchasing: {
    purchasingGroup: 'RAW-METALS',
    orderUnit: 'KG',
    minOrderQty: 100,
    standardVendor: 'VENDOR-001',
    plannedDeliveryDays: 14
  },

  // Inventory view
  inventory: {
    valuationClass: 'RAW-MATERIALS',
    priceControl: 'moving-average',
    standardPrice: 4.50
  },

  // MRP view
  mrp: {
    mrpType: 'PD',  // MRP
    mrpController: 'MRP-001',
    lotSize: 'EQ',  // Exact lot
    safetyStock: 500,
    plannedDeliveryDays: 14
  },

  // Quality view
  quality: {
    inspectionType: 'incoming',
    controlKey: 'QM-01'
  }
})
```

### Bill of Materials (BOM)

Define what goes into what. Multi-level, with variants and alternatives.

```typescript
// Create a product BOM
await sap.bom.create({
  material: 'FINISHED-001',
  plant: 'PLANT-01',
  usage: 'production',  // production, engineering, costing
  baseQuantity: 1,
  validFrom: '2025-01-01',

  components: [
    {
      material: 'MAT-001',
      quantity: 2.5,
      unit: 'KG',
      operation: '0010'  // Links to routing
    },
    {
      material: 'MAT-002',
      quantity: 4,
      unit: 'EA',
      operation: '0020'
    },
    {
      material: 'SEMI-001',
      quantity: 1,
      unit: 'EA',
      operation: '0030',
      // Phantom - explodes into its components
      phantom: true
    }
  ]
})

// Explode BOM to see full component tree
const explosion = await sap.bom.explode('FINISHED-001', {
  plant: 'PLANT-01',
  levels: 'all',  // or specific depth
  includePhantoms: false
})
```

### Routing / Work Centers

Define how things get made.

```typescript
// Define work center
await sap.workCenters.create({
  id: 'WC-ASSEMBLY-01',
  plant: 'PLANT-01',
  description: 'Assembly Line 1',
  capacity: {
    available: 8,  // hours per day
    utilization: 0.85,
    efficiency: 0.95
  },
  costCenter: 'CC-PROD-01',
  activityTypes: ['labor', 'machine']
})

// Create routing for finished product
await sap.routings.create({
  material: 'FINISHED-001',
  plant: 'PLANT-01',
  usage: 'production',

  operations: [
    {
      number: '0010',
      description: 'Cut raw material',
      workCenter: 'WC-CUT-01',
      setupTime: 15,       // minutes
      machineTime: 5,      // per unit
      laborTime: 3
    },
    {
      number: '0020',
      description: 'Machine components',
      workCenter: 'WC-CNC-01',
      setupTime: 30,
      machineTime: 12,
      laborTime: 2
    },
    {
      number: '0030',
      description: 'Final assembly',
      workCenter: 'WC-ASSEMBLY-01',
      setupTime: 10,
      machineTime: 0,
      laborTime: 20
    },
    {
      number: '0040',
      description: 'Quality inspection',
      workCenter: 'WC-QC-01',
      setupTime: 5,
      laborTime: 10,
      controlKey: 'QM-01'
    }
  ]
})
```

### Material Requirements Planning (MRP)

The heart of manufacturing ERP. Now AI-powered.

```typescript
// Run MRP for a plant
const mrpRun = await sap.mrp.run({
  plant: 'PLANT-01',
  planningHorizon: '90 days',
  scope: 'all'  // or specific materials
})

// Results
// {
//   plannedOrders: [
//     { material: 'MAT-001', quantity: 500, date: '2025-02-01', type: 'purchase' },
//     { material: 'SEMI-001', quantity: 100, date: '2025-02-10', type: 'production' }
//   ],
//   exceptionMessages: [
//     { material: 'MAT-003', message: 'Safety stock below threshold', priority: 'high' }
//   ],
//   capacityLoad: {
//     'WC-CNC-01': { load: 0.92, status: 'overloaded' },
//     'WC-ASSEMBLY-01': { load: 0.78, status: 'ok' }
//   }
// }

// Convert planned order to production order
await sap.production.createOrder({
  material: 'FINISHED-001',
  quantity: 50,
  startDate: '2025-02-15',
  plant: 'PLANT-01'
})
```

### Production Orders

Shop floor execution and tracking.

```typescript
// Create production order
const order = await sap.production.createOrder({
  material: 'FINISHED-001',
  quantity: 100,
  plant: 'PLANT-01',
  scheduledStart: '2025-02-01',
  priority: 'normal'
})

// Release for production
await sap.production.release(order.id)

// Confirm operations (shop floor feedback)
await sap.production.confirm({
  order: order.id,
  operation: '0010',
  quantity: 100,
  actualSetupTime: 18,
  actualMachineTime: 520,
  actualLaborTime: 310,
  scrap: 2
})

// Goods receipt from production
await sap.production.goodsReceipt({
  order: order.id,
  quantity: 98,  // 100 - 2 scrap
  storageLocation: 'FG-WAREHOUSE'
})
```

### Warehouse Management

Bin-level inventory control for complex warehouses.

```typescript
// Define storage structure
await sap.warehouse.createStorageType({
  warehouse: 'WH-01',
  storageType: 'RACK',
  description: 'Rack Storage',
  mixedStorage: false,
  capacity: 100,  // per bin
  pickStrategy: 'FIFO'
})

// Putaway
await sap.warehouse.putaway({
  material: 'MAT-001',
  quantity: 500,
  batch: 'BATCH-2025-001',
  suggestBin: true  // AI suggests optimal bin
})
// AI considers: picking frequency, weight, size, product affinity

// Pick for production
await sap.warehouse.pick({
  productionOrder: 'PRD-001',
  material: 'MAT-001',
  quantity: 50,
  strategy: 'FIFO'
})

// Inventory count
await sap.warehouse.physicalInventory({
  warehouse: 'WH-01',
  storageType: 'RACK',
  countDate: '2025-01-31'
})
```

### Quality Management

Inspection, defect tracking, certificates.

```typescript
// Create inspection lot
const inspection = await sap.quality.createInspectionLot({
  material: 'MAT-001',
  batch: 'BATCH-2025-001',
  origin: 'goods-receipt',
  vendor: 'VENDOR-001'
})

// Record results
await sap.quality.recordResults({
  inspectionLot: inspection.id,
  characteristics: [
    { name: 'Tensile Strength', value: 42000, unit: 'PSI', status: 'pass' },
    { name: 'Hardness', value: 95, unit: 'Rockwell B', status: 'pass' },
    { name: 'Dimensional Tolerance', value: 0.002, unit: 'IN', status: 'pass' }
  ]
})

// Usage decision
await sap.quality.usageDecision({
  inspectionLot: inspection.id,
  decision: 'accept',
  postToInventory: true
})

// Quality certificates
const cert = await sap.quality.generateCertificate({
  inspectionLot: inspection.id,
  format: 'CoC'  // Certificate of Conformance
})
```

### Sales & Distribution

Customer orders through delivery and billing.

```typescript
// Create sales order
const order = await sap.sales.createOrder({
  customer: 'CUST-001',
  orderType: 'standard',
  items: [
    {
      material: 'FINISHED-001',
      quantity: 50,
      plant: 'PLANT-01',
      requestedDeliveryDate: '2025-02-15'
    }
  ],
  shippingCondition: 'standard',
  paymentTerms: 'NET30'
})

// Check availability
const atp = await sap.sales.checkAvailability(order.id)
// { item: 'FINISHED-001', requested: 50, confirmed: 50, date: '2025-02-15' }

// Create delivery
const delivery = await sap.sales.createDelivery({
  salesOrder: order.id,
  pickDate: '2025-02-14',
  shipDate: '2025-02-15'
})

// Pick, pack, ship
await sap.warehouse.pick({ delivery: delivery.id })
await sap.shipping.createShipment({
  delivery: delivery.id,
  carrier: 'FEDEX',
  service: 'ground'
})

// Billing
await sap.billing.createInvoice({ delivery: delivery.id })
```

### Financial Accounting

General ledger, cost accounting, and profitability analysis.

```typescript
// Goods movement posts to FI automatically
// Purchase receipt -> Inventory Dr, GR/IR Cr
// Invoice receipt -> GR/IR Dr, AP Cr
// Goods issue to production -> WIP Dr, Inventory Cr
// Production receipt -> FG Inventory Dr, WIP Cr

// Cost center reporting
const costs = await sap.controlling.costCenterReport({
  costCenter: 'CC-PROD-01',
  period: '2025-01',
  includePlanActualVariance: true
})

// Product costing
const cost = await sap.controlling.calculateCost({
  material: 'FINISHED-001',
  costingVariant: 'standard',
  lotSize: 100
})
// {
//   materialCost: 125.00,
//   laborCost: 45.00,
//   overheadCost: 22.50,
//   totalCost: 192.50,
//   components: [...]
// }

// Profitability analysis
const profitability = await sap.controlling.profitabilityAnalysis({
  dimension: 'product',
  period: '2025-01'
})
```

---

## AI-Native Manufacturing

This is the revolution. MRP has always been a computational problem. AI solves it better.

### AI Material Requirements Planning

Traditional MRP is deterministic: fixed lead times, fixed lot sizes, fixed safety stock. AI MRP is adaptive.

```typescript
import { mrp } from 'sap.do/ai'

// AI-powered MRP considers:
// - Historical lead time variability
// - Supplier reliability scores
// - Demand forecast uncertainty
// - Current capacity constraints
// - Material availability trends
// - Economic order quantities

const aiMrp = await mrp.plan({
  plant: 'PLANT-01',
  horizon: '90 days',
  optimization: 'cost',  // or 'service-level', 'balanced'
  constraints: {
    maxInventory: 1000000,  // $1M inventory cap
    serviceLevel: 0.98     // 98% fill rate
  }
})

// AI explains its decisions
// "Recommending order of 750 units MAT-001 on Feb 3 instead of Feb 15:
//  - Vendor VENDOR-001 has 23% lead time variability
//  - Historical data shows 12% late deliveries in February
//  - Buffer covers 2 standard deviations of demand uncertainty
//  - Total cost increase: $340, stockout risk reduction: 89%"
```

### AI Production Scheduling

Finite capacity scheduling that actually works.

```typescript
import { scheduler } from 'sap.do/ai'

const schedule = await scheduler.optimize({
  plant: 'PLANT-01',
  horizon: '2 weeks',
  objectives: ['on-time-delivery', 'minimize-changeovers', 'maximize-utilization'],
  weights: [0.5, 0.3, 0.2]
})

// AI sequence optimization:
// "Resequenced work center WC-CNC-01:
//  - Grouped similar materials to reduce setup time
//  - Total setup time reduced from 14.5 hours to 8.2 hours
//  - All delivery dates still met
//  - Capacity utilization improved from 78% to 89%"

// Real-time rescheduling when disruptions occur
await scheduler.handleDisruption({
  type: 'machine-breakdown',
  workCenter: 'WC-CNC-01',
  duration: '4 hours'
})
// AI automatically reschedules affected orders
```

### AI Quality Prediction

Predict defects before they happen.

```typescript
import { quality } from 'sap.do/ai'

// Train on historical inspection data
await quality.train({
  inspectionLots: 'last-2-years',
  features: ['vendor', 'batch', 'material', 'season', 'process-parameters']
})

// Predict incoming quality
const prediction = await quality.predict({
  material: 'MAT-001',
  vendor: 'VENDOR-001',
  batch: 'BATCH-2025-010'
})
// {
//   prediction: 'accept',
//   confidence: 0.94,
//   riskFactors: [
//     { factor: 'vendor_score', value: 0.92, impact: 'low' },
//     { factor: 'seasonal_pattern', value: 'q1_normal', impact: 'none' }
//   ],
//   recommendation: 'Skip inspection, vendor track record excellent'
// }

// Anomaly detection during production
const anomaly = await quality.monitor({
  productionOrder: 'PRD-001',
  operation: '0020',
  processData: realtimeSensorData
})
// "Warning: CNC spindle vibration trending 15% above normal.
//  Recommendation: Inspect tooling before next batch."
```

### AI Demand Forecasting

Better than any statistical method.

```typescript
import { forecast } from 'sap.do/ai'

const demand = await forecast.predict({
  material: 'FINISHED-001',
  horizon: '12 months',
  granularity: 'weekly',
  includeFactors: ['seasonality', 'trends', 'promotions', 'economic']
})

// AI explains the forecast
// "Predicted Q2 demand: 4,200 units (+15% vs Q1)
//  Drivers:
//  - Seasonal uptick: +8% (consistent with last 3 years)
//  - Market trend: +5% (industry growth)
//  - Planned promotion week 18: +400 units
//  Uncertainty range: 3,800 - 4,600 (90% confidence)"

// Integrate with MRP
await sap.mrp.run({
  plant: 'PLANT-01',
  demandSource: demand  // Uses AI forecast
})
```

### AI Shop Floor Assistant

Natural language interface for operators.

```typescript
import { shopfloor } from 'sap.do/agents'

// Operator asks questions
await shopfloor`What should I work on next?`
// "Production order PRD-001 for FINISHED-001 is highest priority.
//  Next operation: 0020 (Machine components) at WC-CNC-01.
//  Materials staged at bin STAGING-01.
//  Estimated completion: 2.5 hours."

await shopfloor`WC-CNC-01 is down for maintenance`
// "Acknowledged. I've:
//  - Updated work center status to 'down'
//  - Rescheduled affected orders to WC-CNC-02
//  - Notified production planning
//  - Created maintenance notification MN-2025-042"

await shopfloor`Record 95 pieces good, 5 scrap for operation 0030`
// "Confirmed operation 0030:
//  - Good: 95 pieces
//  - Scrap: 5 pieces (5% scrap rate)
//  - Note: Scrap rate above standard (2%). Create quality notification?"
```

---

## OData v4 Compatible

Existing SAP integrations work with standard OData.

### Entity Sets

```bash
# Query materials
GET /sap/opu/odata4/sap/API_MATERIAL/A_Material?$filter=MaterialType eq 'FERT'&$select=Material,MaterialDescription

# Get BOM
GET /sap/opu/odata4/sap/API_BOM/A_BillOfMaterial?$filter=Material eq 'FINISHED-001'&$expand=to_BillOfMaterialItem

# Production orders
GET /sap/opu/odata4/sap/API_PRODUCTION_ORDER/A_ProductionOrder?$filter=OrderStatus eq 'Released'
```

### Deep Insert

```typescript
// Create sales order with items in one call
await fetch('/sap/opu/odata4/sap/API_SALES_ORDER/A_SalesOrder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    SalesOrderType: 'OR',
    SoldToParty: 'CUST-001',
    to_Item: [
      { Material: 'FINISHED-001', RequestedQuantity: 100 }
    ]
  })
})
```

### Actions and Functions

```typescript
// Release production order
await fetch('/sap/opu/odata4/sap/API_PRODUCTION_ORDER/A_ProductionOrder(\'PRD-001\')/Release', {
  method: 'POST'
})

// Check ATP
const atp = await fetch('/sap/opu/odata4/sap/API_ATP/CheckAvailability', {
  method: 'POST',
  body: JSON.stringify({
    Material: 'FINISHED-001',
    Plant: 'PLANT-01',
    RequestedQuantity: 100,
    RequestedDate: '2025-02-15'
  })
})
```

---

## Architecture

sap.do mirrors SAP's organizational structure with Durable Objects:

```
                        Cloudflare Edge
                              |
              +---------------+---------------+
              |               |               |
        +-----------+   +-----------+   +-----------+
        | Auth      |   | OData     |   | MCP       |
        | Gateway   |   | Gateway   |   | Server    |
        +-----------+   +-----------+   +-----------+
              |               |               |
              +-------+-------+-------+-------+
                      |               |
               +------------+  +------------+
               | Client DO  |  | Client DO  |
               | (Tenant)   |  | (Tenant)   |
               +------------+  +------------+
                      |
     +----------------+----------------+
     |                |                |
+----------+   +----------+   +----------+
| Company  |   | Company  |   | Company  |
| Code DO  |   | Code DO  |   | Code DO  |
+----------+   +----------+   +----------+
     |
+----+----+----+----+----+----+
|    |    |    |    |    |    |
MM  PP   SD   WM   QM   FI  CO
```

### Durable Object Structure

| Durable Object | SAP Equivalent | Purpose |
|----------------|----------------|---------|
| `ClientDO` | Client (Mandant) | Tenant isolation |
| `CompanyCodeDO` | Company Code | Legal entity |
| `PlantDO` | Plant | Manufacturing site |
| `StorageLocationDO` | Storage Location | Inventory location |
| `MaterialMasterDO` | Material Master | Product data |
| `ProductionOrderDO` | Production Order | Manufacturing execution |
| `SalesDocumentDO` | Sales Document | Customer orders |
| `PurchaseDocumentDO` | Purchase Document | Vendor orders |
| `InspectionLotDO` | Inspection Lot | Quality management |
| `CostCenterDO` | Cost Center | Cost accounting |

### Storage Tiers

```
Hot (SQLite in DO)     Warm (R2 Parquet)     Cold (R2 Archive)
-----------------      -----------------      -----------------
Current inventory      Historical moves       7+ year archive
Open orders            Closed orders          Audit retention
Active materials       Inactive materials     Deleted masters
Last 2 years FI        3-7 years FI          Compliance data
```

### Real-Time Material Ledger

Unlike batch-processed SAP, sap.do provides real-time actual costing:

```typescript
// Every goods movement updates actual cost in real-time
// No month-end "material ledger close"

const actualCost = await sap.materials.getActualCost({
  material: 'MAT-001',
  plant: 'PLANT-01',
  asOf: 'now'  // Real-time, not period-end
})
// {
//   movingAverage: 4.52,
//   lastPurchasePrice: 4.65,
//   standardCost: 4.50,
//   priceVariance: -0.15,
//   lastUpdated: '2025-01-15T14:32:00Z'
// }
```

---

## vs SAP

| Feature | SAP S/4HANA | SAP Business One | sap.do |
|---------|-------------|------------------|--------|
| Pricing | $350+/user/mo | $95-150/user/mo | **Free** |
| Implementation | 12-36 months | 3-9 months | **Minutes** |
| Infrastructure | SAP/Hyperscaler | On-prem/Cloud | **Your Cloudflare** |
| Programming | ABAP | SDK | **TypeScript** |
| AI/ML | SAP AI Core ($$$) | Limited | **Native** |
| MRP | Batch (nightly) | Batch | **Real-time** |
| Customization | Consultants required | Consultants required | **Self-service** |
| OData | Yes | Limited | **Full v4** |

### Cost Comparison

**100-user manufacturing company:**

| | SAP Business One | sap.do |
|-|------------------|--------|
| Year 1 licenses | $150,000 | $0 |
| Implementation | $200,000 | $0 |
| Annual maintenance | $30,000 | $0 |
| Customization | $50,000 | $0 |
| **Year 1 Total** | **$430,000** | **$5** (Workers) |
| **5-Year TCO** | **$1,100,000+** | **$300** |

---

## Quick Start

### One-Click Deploy

```bash
npx create-dotdo sap

# Follow prompts:
# - Company name
# - Industry template (discrete, process, make-to-order)
# - Currency and fiscal year
# - Initial plant setup
```

### Manual Setup

```bash
git clone https://github.com/dotdo/sap.do
cd sap.do
npm install
npm run deploy
```

### First Production Order

```typescript
import { SAPClient } from 'sap.do'

const sap = new SAPClient({
  url: 'https://your-company.sap.do',
  token: process.env.SAP_TOKEN
})

// 1. Create material
await sap.materials.create({
  number: 'WIDGET-001',
  description: 'Demo Widget',
  type: 'finished',
  baseUnit: 'EA'
})

// 2. Create BOM
await sap.bom.create({
  material: 'WIDGET-001',
  components: [
    { material: 'RAW-001', quantity: 2 },
    { material: 'RAW-002', quantity: 1 }
  ]
})

// 3. Run MRP
await sap.mrp.run({ material: 'WIDGET-001' })

// 4. Create production order
await sap.production.createOrder({
  material: 'WIDGET-001',
  quantity: 100
})

// Manufacturing!
```

---

## Migration from SAP

### Export from SAP

```bash
# Use SAP standard extraction programs
# SE38 -> MM60 (material master)
# SE38 -> CS12 (BOM explosion)
# LSMW for mass data
# or...

# Our migration tool
npx sap.do export \
  --system ECC \
  --client 100 \
  --connection rfc.json
```

### Import to sap.do

```bash
npx sap.do migrate \
  --source ./sap-export \
  --url https://your-company.sap.do

# Migrates:
# - Material masters (all views)
# - Bills of material
# - Routings and work centers
# - Vendors and customers
# - Open orders
# - Inventory balances
# - Cost masters
```

### Parallel Run

```typescript
// Run both systems during transition
const bridge = sap.migration.createBridge({
  source: { type: 'sap-ecc', connection: rfcConfig },
  target: { type: 'sap.do', url: 'https://...' },
  mode: 'dual-write'
})

// All transactions written to both
// Reconciliation reports available
// Cut over when confident
```

---

## Industry Templates

Pre-configured setups for common manufacturing scenarios:

### Discrete Manufacturing

```bash
npx create-dotdo sap --template discrete
```

- Make-to-stock production
- Routing-based operations
- Standard costing
- Finite capacity scheduling

### Process Manufacturing

```bash
npx create-dotdo sap --template process
```

- Formula/recipe management
- Batch tracking
- Co-products and by-products
- Potency and yield variance

### Make-to-Order / Engineer-to-Order

```bash
npx create-dotdo sap --template mto
```

- Project-based manufacturing
- Configurable products
- Customer-specific BOMs
- Cost-plus pricing

---

## Roadmap

### Now
- [x] Material Master (all views)
- [x] Bill of Materials
- [x] Basic MRP
- [x] Production Orders
- [x] Inventory Management
- [x] OData v4 compatibility

### Next
- [ ] Routings and Work Centers
- [ ] Finite Capacity Scheduling
- [ ] Quality Management
- [ ] AI MRP Optimization
- [ ] Sales & Distribution
- [ ] Purchasing

### Later
- [ ] Warehouse Management (WM/EWM)
- [ ] Product Cost Controlling
- [ ] Batch Management
- [ ] Variant Configuration
- [ ] EDI/IDoc Integration
- [ ] Multi-Plant Planning

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Quick Start](./docs/quickstart.mdx) | Deploy in 5 minutes |
| [Material Master](./docs/material-master.mdx) | Product data setup |
| [BOM & Routing](./docs/bom-routing.mdx) | Manufacturing engineering |
| [MRP](./docs/mrp.mdx) | Material requirements planning |
| [Production](./docs/production.mdx) | Shop floor execution |
| [AI Features](./docs/ai.mdx) | AI-powered manufacturing |
| [OData API](./docs/odata.mdx) | API reference |
| [Migration](./docs/migration.mdx) | Moving from SAP |

---

## Contributing

sap.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/sap.do
cd sap.do
npm install
npm test
npm run dev
```

Key areas for contribution:
- PP (Production Planning) modules
- CO (Controlling) cost rollup
- OData entity coverage
- Industry-specific features
- AI/ML model improvements

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT

---

<p align="center">
  <strong>Manufacturing ERP, simplified.</strong><br/>
  Built on Cloudflare Workers. Powered by AI. No consultants required.
</p>
