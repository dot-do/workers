# sap.do

> Enterprise ERP for Manufacturing. Edge-Native. Open by Default. AI-First.

SAP is the $200B gorilla of enterprise software. S/4HANA implementations cost $10M-$100M+. Even "lightweight" SAP Business One requires $50,000-200,000 in licensing plus consultants charging $200-400/hour. ABAP developers are increasingly rare. Customization means vendor lock-in.

**sap.do** is the open-source alternative. Manufacturing-grade ERP on Cloudflare Workers. AI runs your MRP. Deploy in minutes, not years. OData compatible for existing integrations.

## AI-Native API

```typescript
import { sap } from 'sap.do'             // Full SDK
import { sap } from 'sap.do/tiny'        // Minimal client
import { sap } from 'sap.do/mrp'         // MRP-only operations
```

Natural language for manufacturing workflows:

```typescript
import { sap } from 'sap.do'

// Talk to it like a planner
const gaps = await sap`materials below safety stock`
const overdue = await sap`open purchase orders over $10k`
const critical = await sap`production orders late this week`

// Chain like sentences
await sap`raw materials expiring in 30 days`
  .notify(`Expedite usage or dispose`)

// Production that runs itself
await sap`create production order for 100 FINISHED-001`
  .release()         // to shop floor
  .confirm()         // operations complete
  .receipt()         // goods to inventory
```

## The Problem

SAP has become synonymous with "enterprise complexity":

| What SAP Charges | The Reality |
|------------------|-------------|
| **SAP Business One** | $95-150/user/month + implementation |
| **SAP S/4HANA Cloud** | $350-500+/user/month |
| **Implementation** | 6-24 months, often fails |
| **Consultants** | $200-400/hour (Deloitte, Accenture, etc.) |
| **Technical debt** | ABAP developers increasingly rare |
| **Total cost** | 3-5x software cost in services |

### The SAP Tax

Most SAP implementations:
- Take 2x longer than planned
- Cost 3x the original budget
- Deliver 50% of promised functionality
- Require permanent consultant staff

Meanwhile, SAP's core value proposition - **materials planning for manufacturing** - is fundamentally an AI problem. An LLM with access to your BOM, inventory, and sales forecast can do what MRP does, but better.

## The Solution

**sap.do** reimagines manufacturing ERP for the edge:

```
SAP S/4HANA                         sap.do
-----------------------------------------------------------------
$10M-100M implementation            Deploy in minutes
$1-5M/year maintenance              $0 - run your own
ABAP (1983 technology)              TypeScript
Consultant dependency               Self-service
AI as "innovation"                  AI at the core
Batch MRP (nightly)                 Real-time MRP
Vendor lock-in                      Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo sap
```

A manufacturing ERP. Running on infrastructure you control. AI-native from day one.

```typescript
import { SAP } from 'sap.do'

export default SAP({
  name: 'acme-manufacturing',
  domain: 'erp.acme-mfg.com',
  modules: ['mm', 'pp', 'sd', 'qm'],
})
```

## Features

### Material Master

```typescript
// Create materials naturally
await sap`create material MAT-001: Aluminum Extrusion 6061-T6, raw, KG, $4.50`
await sap`create material FINISHED-001: Widget Assembly, finished, EA, $45.00`

// AI infers what you need
await sap`MAT-001`                          // returns material
await sap`MAT-001 inventory`                // returns stock levels
await sap`MAT-001 where used`               // returns BOM usage
await sap`materials below safety stock`      // returns shortage list
```

### Bill of Materials

```typescript
// Define BOMs naturally
await sap`
  FINISHED-001 BOM:
  - 2.5 KG MAT-001 at operation 10
  - 4 EA MAT-002 at operation 20
  - 1 EA SEMI-001 at operation 30 phantom
`

// Explode to see full component tree
await sap`explode BOM for FINISHED-001 at PLANT-01 all levels`

// What-if analysis
await sap`cost impact if MAT-001 price increases 10%`
```

### Work Centers and Routing

```typescript
// Define work centers
await sap`create work center WC-CNC-01 at PLANT-01, 8 hours daily, 85% utilization`
await sap`create work center WC-ASSEMBLY-01 at PLANT-01, 8 hours daily`

// Define routing
await sap`
  FINISHED-001 routing:
  - Op 10: Cut raw material at WC-CUT-01, 15 min setup, 5 min/unit
  - Op 20: Machine components at WC-CNC-01, 30 min setup, 12 min/unit
  - Op 30: Final assembly at WC-ASSEMBLY-01, 10 min setup, 20 min/unit
  - Op 40: Quality inspection at WC-QC-01, 5 min setup, 10 min/unit
`
```

### Material Requirements Planning

```typescript
// Run MRP naturally
await sap`run MRP for PLANT-01 next 90 days`
await sap`what materials do we need to order this week?`
await sap`which work centers are overloaded next month?`

// AI explains decisions
await sap`why is MRP suggesting 750 units of MAT-001?`
// "Vendor has 23% lead time variability. Buffer covers 2 standard deviations.
//  Total cost increase: $340, stockout risk reduction: 89%"

// Convert planned to production
await sap`convert planned orders to production orders for FINISHED-001`
```

### Production Orders

```typescript
// Production in natural language
await sap`create production order for 100 FINISHED-001, start Feb 1`
await sap`release PRD-001 to shop floor`

// Confirm operations
await sap`confirm PRD-001 op 10: 100 good, 2 scrap, 18 min setup, 520 min machine`

// Complete production
await sap`goods receipt 98 FINISHED-001 from PRD-001 to FG-WAREHOUSE`

// Chain the full cycle
await sap`create production order for 100 FINISHED-001`
  .release()
  .confirm()
  .receipt()
```

### Warehouse Management

```typescript
// Put materials away
await sap`putaway 500 KG MAT-001 batch BATCH-2025-001 suggest bin`
// AI considers: picking frequency, weight, size, product affinity

// Pick for production
await sap`pick materials for PRD-001 FIFO`

// Stock queries
await sap`where is MAT-001?`
await sap`what's in bin RACK-A-01?`
await sap`inventory value by storage location`

// Cycle count
await sap`cycle count warehouse WH-01 rack storage today`
```

### Quality Management

```typescript
// Inspection on receipt
await sap`inspect batch BATCH-2025-001 from VENDOR-001`
  .record(`tensile: 42000 PSI pass, hardness: 95 Rockwell B pass`)
  .accept()

// Quality queries
await sap`batches pending inspection`
await sap`vendor quality scores last 12 months`
await sap`defect trend for MAT-001`

// Certificates
await sap`generate CoC for batch BATCH-2025-001`
```

### Sales & Distribution

```typescript
// Sales orders naturally
await sap`sales order CUST-001: 50 FINISHED-001, deliver Feb 15, NET30`

// Check availability
await sap`can we deliver 50 FINISHED-001 by Feb 15?`
// "Yes. 30 in stock, 20 from PRD-001 completing Feb 10."

// Ship the order
await sap`pick pack ship SO-001 via FedEx Ground`
  .invoice()

// Order to cash in one chain
await sap`sales order CUST-001: 50 FINISHED-001`
  .atp()        // check availability
  .pick()       // pick from warehouse
  .ship()       // create shipment
  .invoice()    // bill customer
```

### Financial Accounting

```typescript
// Goods movements post automatically
// Purchase receipt -> Inventory Dr, GR/IR Cr
// Invoice receipt -> GR/IR Dr, AP Cr
// Production issue -> WIP Dr, Inventory Cr
// Production receipt -> FG Inventory Dr, WIP Cr

// Cost queries
await sap`actual cost FINISHED-001 this month`
await sap`variance analysis PLANT-01 January`
await sap`profitability by product line Q1`

// Product costing
await sap`roll up cost for FINISHED-001 lot size 100`
// {
//   materialCost: 125.00,
//   laborCost: 45.00,
//   overheadCost: 22.50,
//   totalCost: 192.50
// }
```

## AI-Native Manufacturing

MRP has always been a computational problem. AI solves it better.

### AI Material Requirements Planning

```typescript
// AI MRP considers everything
await sap`plan materials for next quarter optimizing cost`
// AI weighs: lead time variability, supplier reliability, demand uncertainty,
// capacity constraints, inventory costs, stockout costs

// Ask why
await sap`why order MAT-001 on Feb 3 instead of Feb 15?`
// "Vendor has 23% lead time variability. February shows 12% late deliveries
//  historically. Earlier order covers 2 sigma of demand uncertainty.
//  Cost increase: $340. Stockout risk reduction: 89%."

// What-if scenarios
await sap`what if MAT-001 lead time increases to 21 days?`
await sap`impact of losing VENDOR-001 as supplier?`
```

### AI Production Scheduling

```typescript
// Optimize the schedule
await sap`optimize schedule for PLANT-01 next 2 weeks`
// "Resequenced WC-CNC-01: grouped similar materials.
//  Setup time reduced from 14.5 hours to 8.2 hours.
//  All delivery dates still met. Utilization up from 78% to 89%."

// Handle disruptions
await sap`WC-CNC-01 down for 4 hours`
// AI automatically reschedules affected orders

// Capacity queries
await sap`can we add 200 FINISHED-001 to next week's schedule?`
```

### AI Quality Prediction

```typescript
// Predict incoming quality
await sap`predict quality for incoming batch from VENDOR-001`
// "Accept. Confidence: 94%. Vendor score: 0.92. Recommendation: skip inspection."

// Process monitoring
await sap`monitor PRD-001 operation 20 for anomalies`
// "Warning: CNC spindle vibration trending 15% above normal.
//  Recommendation: Inspect tooling before next batch."

// Supplier quality
await sap`which vendors need quality improvement focus?`
```

### AI Demand Forecasting

```typescript
// Forecast demand
await sap`forecast FINISHED-001 next 12 months weekly`
// "Predicted Q2 demand: 4,200 units (+15% vs Q1)
//  Drivers: Seasonal uptick +8%, market trend +5%, promotion week 18 +400
//  Range: 3,800 - 4,600 (90% confidence)"

// Feed into MRP
await sap`run MRP using AI forecast`
```

### Shop Floor Assistant

```typescript
// Operators talk naturally
await sap`what should I work on next?`
// "PRD-001 for FINISHED-001 is highest priority.
//  Operation 20 at WC-CNC-01. Materials at STAGING-01.
//  Estimated completion: 2.5 hours."

await sap`WC-CNC-01 is down for maintenance`
// "Updated status. Rescheduled affected orders to WC-CNC-02.
//  Notified planning. Created maintenance notification MN-2025-042."

await sap`record 95 good 5 scrap for PRD-001 op 30`
// "Confirmed. Scrap rate 5% vs standard 2%. Create quality notification?"
```

## OData v4 Compatible

Existing SAP integrations work unchanged.

```bash
# Query materials
GET /odata/v4/MaterialService/Materials?$filter=MaterialType eq 'FERT'

# Get BOM with components
GET /odata/v4/BOMService/BOMs?$filter=Material eq 'FINISHED-001'&$expand=Components

# Production orders
GET /odata/v4/ProductionService/Orders?$filter=Status eq 'Released'
```

## Architecture

### Durable Object per Company

```
CompanyDO (config, plants, company codes)
  |
  +-- MaterialsDO (material masters, BOMs)
  |     |-- SQLite: Material data
  |     +-- R2: Drawings, specs
  |
  +-- ProductionDO (orders, routings, work centers)
  |     |-- SQLite: Production data
  |     +-- R2: Confirmations, history
  |
  +-- InventoryDO (stock, movements, warehouses)
  |     |-- SQLite: Current stock
  |     +-- R2: Movement history
  |
  +-- SalesDO (orders, deliveries, billing)
  |     |-- SQLite: Open orders
  |     +-- R2: Completed documents
  |
  +-- QualityDO (inspections, certificates)
        |-- SQLite: Active lots
        +-- R2: Certificates, results
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active materials, open orders | <10ms |
| **Warm** | R2 + SQLite Index | Historical transactions (2-7 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

### Real-Time Material Ledger

```typescript
// Every goods movement updates actual cost in real-time
// No month-end "material ledger close"

await sap`actual cost MAT-001 now`
// {
//   movingAverage: 4.52,
//   lastPurchasePrice: 4.65,
//   standardCost: 4.50,
//   priceVariance: -0.15,
//   lastUpdated: '2025-01-15T14:32:00Z'
// }
```

## vs SAP

| Feature | SAP S/4HANA | SAP Business One | sap.do |
|---------|-------------|------------------|--------|
| **Implementation** | $10M-100M+ | $200K-500K | Deploy in minutes |
| **Annual Cost** | $1-5M+ | $50K-150K | ~$100/month |
| **Architecture** | Monolithic, HANA | On-prem/Cloud | Edge-native, global |
| **Programming** | ABAP | SDK | TypeScript |
| **AI** | SAP AI Core ($$$) | Limited | AI-first design |
| **MRP** | Batch (nightly) | Batch | Real-time |
| **Data Location** | SAP's data centers | On-prem/Cloud | Your Cloudflare account |
| **Customization** | $500/hour consultants | $200/hour | Code it yourself |
| **Lock-in** | Decades of migration | Years | MIT licensed |

## Use Cases

### Job Shops

```typescript
// Quote to cash in natural language
await sap`quote CUST-001: 500 custom brackets, aluminum, 2 week lead`
  .approve()
  .convert()          // to sales order
  .plan()             // MRP generates requirements
  .produce()          // create production orders
  .ship()
  .invoice()
```

### Discrete Manufacturing

```typescript
// High-volume production
await sap`schedule FINISHED-001 for 10,000 units next month`
await sap`balance line for ASSEMBLY-LINE-1 takt time 30 seconds`
await sap`kanban replenishment for MAT-001 min 500 max 1500`
```

### Process Manufacturing

```typescript
// Formula management
await sap`
  FORMULA-001 batch 1000 KG:
  - 400 KG ingredient A
  - 350 KG ingredient B
  - 250 KG ingredient C
  yield 95%
`

await sap`create batch BATCH-2025-001 from FORMULA-001`
  .record(`potency 98%, moisture 2.1%`)
  .release()
```

### Multi-Plant Operations

```typescript
// Cross-plant planning
await sap`transfer 500 MAT-001 from PLANT-01 to PLANT-02`
await sap`where should we produce FINISHED-001 for minimum cost?`
await sap`consolidate requirements across all plants`
```

## Migration from SAP

```typescript
// Parallel run both systems
await sap`migrate from SAP ECC client 100`
  .materials()      // material masters
  .boms()           // bills of material
  .routings()       // work centers and routings
  .inventory()      // current stock
  .openOrders()     // sales and production
  .verify()         // reconciliation
```

Natural language migration:

```typescript
await sap`import materials from SAP export file`
await sap`reconcile inventory with SAP as of Jan 31`
await sap`which transactions differ between systems?`
```

## Industry Templates

```bash
npx create-dotdo sap --template discrete   # Make-to-stock, routing-based
npx create-dotdo sap --template process    # Formula/batch, co-products
npx create-dotdo sap --template mto        # Make-to-order, configurable
npx create-dotdo sap --template jobshop    # Quote-to-cash, high-mix low-volume
```

## Roadmap

### Core ERP
- [x] Material Master
- [x] Bill of Materials
- [x] MRP
- [x] Production Orders
- [x] Inventory Management
- [x] Sales & Distribution
- [x] Quality Management
- [x] OData v4 compatibility
- [ ] Warehouse Management (WM/EWM)
- [ ] Product Cost Controlling
- [ ] Variant Configuration

### AI
- [x] Natural Language Interface
- [x] AI MRP Optimization
- [x] Shop Floor Assistant
- [x] Quality Prediction
- [ ] Demand Forecasting
- [ ] Predictive Maintenance
- [ ] Autonomous Scheduling

## Contributing

sap.do is open source under the MIT license.

We especially welcome contributions from:
- Manufacturing engineers
- Supply chain professionals
- SAP consultants ready to escape ABAP
- AI/ML researchers

```bash
git clone https://github.com/dotdo/sap.do
cd sap.do
pnpm install
pnpm test
```

## License

MIT License - For manufacturing everywhere.

---

<p align="center">
  <strong>The $200B gorilla meets its match.</strong>
  <br />
  AI-first. Real-time MRP. No consultants required.
  <br /><br />
  <a href="https://sap.do">Website</a> |
  <a href="https://docs.sap.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/sap.do">GitHub</a>
</p>
