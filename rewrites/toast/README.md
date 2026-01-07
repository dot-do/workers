# toast.do

> Restaurant POS + Management. AI-native. No hardware lock-in.

Toast built a $14B company by giving away POS hardware and charging 2.99% + $0.15 on every transaction. Forever. Add payment processing fees, monthly software fees, and you're paying $10K-50K annually for a system you don't own.

**toast.do** is the open-source alternative. Run your own POS. Choose your own payment processor. AI that actually runs your restaurant.

## AI-Native API

```typescript
import { toast, ada } from 'toast.do'

// Natural language POS
const order = await toast`
  Ring up table T12:
  - 2x Ribeye (Medium Rare)
  - 1x Calamari
`

// Promise pipelining for service - one network round trip
const served = await order
  .map(o => toast`fire appetizers, 12 min estimate`)
  .map(ready => toast`notify server when ready`)
  .map(served => toast`fire mains when guest ready`)

// AI forecasting with chained prep
const forecast = await ada`
  Forecast covers tomorrow considering:
  - ${historicalData}
  - weather: ${weather}
  - local events: ${events}
`.map(f => toast`set prep levels to ${f.recommended}`)
```

### Tree-Shakable Imports

```typescript
import { toast } from 'toast.do'           // Full client
import { toast } from 'toast.do/tiny'      // Minimal, no deps
import { toast } from 'toast.do/rpc'       // Service binding only
import { ada } from 'toast.do/agents'      // Restaurant AI agent
```

## The workers.do Way

You're a restaurant owner who pours your heart into every plate. But 3% of every sale goes to your POS company - that's $30K a year on a million in sales. That's a line cook's salary. That's your kid's college fund.

**workers.do** gives you AI that runs front and back of house:

```typescript
import { toast, ada, mark } from 'toast.do'

// Natural language for the dinner rush
const covers = await toast`show tonight's reservations`
const prep = await toast`what should we 86 based on inventory`
const labor = await ada`are we overstaffed for ${covers} projected covers`
```

Promise pipelining for service workflows - one network round trip:

```typescript
// Online order through delivery
const delivered = await toast`new online order from ${customer}`
  .map(order => toast`fire to kitchen with 25 min estimate`)
  .map(ready => toast`assign to ${driver} for delivery`)
  .map(delivered => mark`send thank you with feedback link to ${customer}`)
```

AI agents that understand hospitality:

```typescript
import { priya, ralph, tom } from 'agents.do'

// Restaurant intelligence
await priya`forecast covers for Saturday given weather and local events`
await ralph`optimize next week's schedule within 28% labor target`
await tom`analyze menu engineering - which items are dogs vs stars`
```

## The Problem

Restaurants operate on 3-5% margins. Yet POS companies extract:

- **2.99% + $0.15 per transaction** - On a $50 check, that's $1.65. Times 200 covers/day = $330/day = $120K/year
- **$69-165/month per terminal** - For software that runs on commodity hardware
- **Locked-in payment processing** - Can't shop for better rates
- **Hardware ownership myth** - "Free" hardware comes with 2-year contracts
- **AI as upsell** - Demand forecasting, scheduling optimization = premium tiers

A restaurant doing $1M/year in sales pays Toast **$35K-50K annually**. That's an entire employee.

## The Solution

**toast.do** breaks the model:

```
Toast                           toast.do
-----------------------------------------------------------------
2.99% + $0.15/transaction       Your processor, your rates
$69-165/terminal/month          $0 - run on any hardware
Locked payment processing       Stripe, Square, Adyen, or your bank
"Free" hardware trap            Use iPads you already own
AI premium tier                 AI-native from day one
Vendor owns your data           You own everything
```

## One-Click Deploy

```bash
npx create-dotdo toast
```

Your own restaurant management platform. Running on your hardware. With your payment processor.

## Features

### Point of Sale

Fast, intuitive, built for the rush:

```typescript
import { toast } from 'toast.do'

// Natural language order entry
const order = await toast`
  Table T12, 4 guests:
  - 1x Crispy Calamari, extra sauce
  - 1x Burrata
  - 2x Ribeye Steak, medium rare
`

// Course firing with natural language
await toast`fire apps for ${order}`
// ...guests finish apps...
await toast`fire mains for ${order}`

// Or use promise pipelining for the full service flow
const served = await toast`seat party of 4 at T12`
  .map(table => toast`take drink order: 2 martinis, 2 waters`)
  .map(drinks => toast`ring up ${order}`)
  .map(o => toast`fire apps, notify when ready`)
  .map(ready => toast`fire mains when guest signals`)
```

For programmatic access, the structured API is also available:

```typescript
import { pos } from 'toast.do'

// Ring up an order programmatically
const order = await pos.orders.create({
  table: 'T12',
  guests: 4,
  items: [
    { item: 'Crispy Calamari', modifiers: ['Extra Sauce'], quantity: 1 },
    { item: 'Ribeye Steak', modifiers: ['Medium Rare'], quantity: 2 },
  ],
})

await order.fire('appetizers')
await order.fire('mains')
```

### Kitchen Display System

Orders flow to the right station:

```typescript
// Configure kitchen stations
await pos.kitchen.configure({
  stations: [
    { name: 'grill-station', display: 'GRILL-KDS-01', expeditor: false },
    { name: 'fry-station', display: 'FRY-KDS-01', expeditor: false },
    { name: 'cold-station', display: 'COLD-KDS-01', expeditor: false },
    { name: 'expo', display: 'EXPO-KDS-01', expeditor: true },
  ],
  routing: {
    // Items route to their station
    // All items consolidate at expo
  },
})

// KDS shows:
// GRILL-KDS-01:
// [T12] 2x Ribeye Steak - MR | Timer: 0:00 | FIRE

// Kitchen marks complete
await pos.kitchen.complete({
  station: 'grill-station',
  order: 'ORD-001',
  items: ['Ribeye Steak', 'Ribeye Steak'],
})
// Routes to expo for final plate-up
```

### Reservations

Natural language reservation management:

```typescript
import { toast, ada } from 'toast.do'

// Take a reservation
const reso = await toast`
  Book Saturday 7pm, party of 6:
  - Name: Johnson
  - Phone: 555-0123
  - Notes: Anniversary dinner, quiet table
`

// AI manages the book intelligently
const tonight = await ada`
  Tonight's reservations with:
  - Current waitlist
  - Available walk-in slots
  - VIP guests to recognize
`

// Automated confirmation flow
const confirmed = await reso
  .map(r => toast`send confirmation text to ${r.phone}`)
  .map(sent => toast`add reminder for day-before callback`)
  .map(reminder => toast`update covers forecast`)

// Walk-in management
await toast`add walk-in party of 2, quote 25 minute wait`
  .map(wait => toast`text ${phone} when table ready`)
```

### Online Ordering

Direct orders, no third-party fees:

```typescript
import { toast } from 'toast.do'

// Natural language online order
const online = await toast`
  Online order for pickup:
  - 2x Margherita Pizza
  - 1x Caesar Salad
  - Customer: ${customer}
  - Ready in 20 min
`

// Promise pipelining for delivery
const delivered = await toast`new delivery order from ${customer}`
  .map(order => toast`fire to kitchen, 25 min estimate`)
  .map(ready => toast`assign driver ${nearestDriver}`)
  .map(out => toast`notify customer: out for delivery`)
  .map(delivered => toast`send feedback request`)

// Your customer, your data
// No 30% DoorDash fee
// No Uber Eats commission
```

### Tableside Ordering

QR code to order, server-optional:

```typescript
// Generate QR codes for tables
const qrCodes = await pos.tables.generateQR({
  tables: ['T1', 'T2', 'T3', /* ... */ 'T30'],
  menuUrl: 'menu.yourrestaurant.com',
})

// Guest scans, orders, pays
// Server focuses on hospitality, not order-taking

// Or hybrid mode
await pos.tables.setMode('hybrid', {
  guestCanOrder: true,
  serverApprovalRequired: ['alcohol'], // Server confirms 21+
  guestCanPay: true,
  serverCanOverride: true,
})
```

### Payments

Your processor, your rates:

```typescript
// Configure payment processing
await pos.payments.configure({
  processor: 'stripe', // or 'square', 'adyen', 'heartland', 'your-bank'
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    // Stripe rates: 2.6% + $0.10 online, 2.7% + $0.05 in-person
    // Better than Toast's 2.99% + $0.15
  },
})

// Process payment
await pos.payments.charge({
  order: 'ORD-001',
  amount: 142.85,
  tip: 28.57,
  method: 'card_present', // Tap, dip, or swipe
})

// Split checks
await pos.payments.split({
  order: 'ORD-001',
  splits: [
    { guest: 1, items: ['Ribeye Steak'], amount: 52.50 },
    { guest: 2, items: ['Ribeye Steak', 'Calamari', 'Burrata'], amount: 90.35 },
  ],
})
```

### Staff Management

Scheduling that doesn't suck:

```typescript
import { toast, ralph } from 'toast.do'

// AI-powered scheduling
const schedule = await ralph`
  Create next week's schedule:
  - Stay within 28% labor target
  - Honor time-off requests
  - Match staffing to projected ${covers}
  - Balance shifts fairly
`

// Natural language shift management
await toast`John clocked in as Server`
await toast`John clocked out`
await toast`swap John and Jane shifts on Saturday`

// AI handles tip distribution
await toast`distribute tonight's tips using FOH pool rules`

// Quick queries
const overtime = await toast`who's approaching overtime this week`
const coverage = await toast`do we have enough coverage for Saturday's event`
```

For programmatic access:

```typescript
import { pos } from 'toast.do'

await pos.timecard.clockIn({ staff: 'john', role: 'Server' })
await pos.tips.distribute({
  date: '2025-01-20',
  pool: 'foh',
  total: 2847.50,
})
```

### Inventory Management

Know what you have, order what you need:

```typescript
import { toast, ada } from 'toast.do'

// Natural language inventory queries
const low = await toast`what items are below par level`
const ribeye = await toast`how many ribeyes do we have`
const cost = await toast`what's our food cost percentage this week`

// AI-powered ordering
const po = await ada`
  Generate purchase order based on:
  - Items below par: ${low}
  - Projected covers: ${forecast}
  - Current vendor pricing
`.map(po => toast`send PO to ${po.vendor}`)

// Quick 86 management
await toast`86 the halibut, sold out`
await toast`un-86 calamari, delivery arrived`

// Promise pipeline for receiving
const received = await toast`receiving delivery from Sysco`
  .map(d => toast`count and verify items against PO`)
  .map(counted => toast`update inventory levels`)
  .map(updated => toast`flag any discrepancies for manager`)
```

### Reporting

Real-time business intelligence:

```typescript
import { toast, ada } from 'toast.do'

// Natural language reporting
const daily = await toast`how did we do today`
const week = await toast`sales comparison vs last week`
const labor = await toast`labor cost percentage for the month`

// AI insights
const insights = await ada`
  Analyze this week's performance:
  - What's trending up?
  - What's concerning?
  - Recommendations for next week?
`

// Quick owner queries
await toast`who was our top server this week`
await toast`which menu items are underperforming`
await toast`are we hitting our food cost targets`

// Promise pipeline for end-of-day
const closeout = await toast`run end of day closeout`
  .map(report => toast`reconcile cash drawers`)
  .map(cash => toast`email daily summary to owners`)
  .map(sent => toast`prep system for tomorrow`)
```

## AI-Native

### AI Demand Forecasting

```typescript
import { ada } from 'toast.do/agents'

// Predict tomorrow's covers
await ada`
  Based on:
  - Historical sales data
  - Tomorrow's weather forecast
  - Local events (concert at nearby venue)
  - Day of week patterns
  - Reservation book

  Predict tomorrow's covers by hour.
  Recommend prep levels and staffing.
`

// Ada responds:
// "Expecting 215-240 covers tomorrow (+25% vs typical Thursday).
// Concert lets out at 10pm - expect 40 late-night covers.
// Recommend:
// - Additional server 7pm-close
// - 50% more ribeye prep
// - Extra bartender 9pm-close"
```

### AI Menu Engineering

```typescript
import { priya } from 'agents.do'

// Analyze menu performance
await priya`
  Review our menu performance for Q4 2024:
  - Which items are stars (high profit, high popularity)?
  - Which are dogs (low profit, low popularity)?
  - What's our food cost trend?

  Recommend menu changes for Q1 2025.
`

// Priya analyzes:
// "Stars: Ribeye (23% margin, 45 orders/week), Calamari (68% margin, 62 orders/week)
// Dogs: Lamb Chops (12% margin, 8 orders/week) - recommend removal
// Consider: Burrata costs increased 15% - reprice or swap vendor"
```

### AI Staff Scheduling

```typescript
import { ralph } from 'agents.do'

// Generate optimal schedule
await ralph`
  Create next week's schedule:
  - Stay within 28% labor target
  - Honor staff availability and time-off requests
  - Match coverage to projected demand
  - Ensure adequate breaks and max hour compliance
  - Balance shifts fairly among servers
`

// Ralph creates schedule accounting for:
// - Predicted covers by hour by day
// - Each employee's availability
// - Labor law requirements
// - Overtime avoidance
// - Fair shift distribution
```

### AI Voice Ordering

```typescript
// Drive-thru or phone orders
await pos.voice.configure({
  enabled: true,
  voice: 'conversational',
  menu: await pos.menu.get(),
})

// Customer: "Yeah, can I get a large pepperoni with extra cheese?"
// AI: "Large pepperoni pizza with extra cheese, got it. Anything else?"
// Customer: "Actually make that two. And a 2-liter Coke."
// AI: "Two large pepperoni pizzas with extra cheese and a 2-liter Coke.
//      That's $34.95. Ready in about 20 minutes. Name for the order?"

// Order automatically created in POS, sent to kitchen
```

### AI Answering Service

```typescript
import { ada } from 'toast.do/agents'

// Handle phone calls
await ada`
  Answer restaurant phone calls:
  - Take reservations
  - Answer questions about menu, hours, location
  - Take to-go orders
  - Handle catering inquiries (take message for manager)
  - Politely decline spam

  Our hours are 11am-10pm Mon-Sat, closed Sunday.
  We take reservations for parties of 6+.
`

// Phone rings...
// Ada: "Thanks for calling Bella Italia, this is Ada. How can I help you?"
// Caller: "What time do you close tonight?"
// Ada: "We're open until 10pm tonight. Would you like to make a reservation?"
```

## Hardware Freedom

### Use Any Hardware

```typescript
// iPad as terminal
await pos.hardware.register({
  type: 'tablet',
  platform: 'ios', // or 'android'
  deviceId: 'IPAD-001',
  role: 'server-terminal',
})

// Any receipt printer
await pos.hardware.register({
  type: 'printer',
  model: 'star-tsp143', // or 'epson-tm-t88', etc
  connection: 'network',
  ip: '192.168.1.100',
  role: 'kitchen-printer',
})

// Any card reader
await pos.hardware.register({
  type: 'card-reader',
  model: 'stripe-m2', // or 'square-reader', 'bbpos', etc
  connection: 'bluetooth',
  role: 'payment-terminal',
})
```

### Offline Mode

Because internet goes down during the dinner rush:

```typescript
await pos.offline.configure({
  enabled: true,
  cache: {
    menu: 'full',
    staff: 'active',
    tables: 'all',
    inventory: 'counts',
  },
  payments: {
    offlineLimit: 100, // Max offline transaction
    storeAndForward: true, // Queue for processing
  },
  sync: {
    onReconnect: true,
    interval: '30s',
  },
})

// POS works offline
// Payments queue (with card present verification)
// Syncs when connection restored
```

## Architecture

### Durable Object per Restaurant

Each restaurant is fully isolated:

```
RestaurantDO (config, menu, staff)
  |
  +-- OrdersDO (live orders, tickets)
  |     |-- SQLite: Active orders
  |     +-- R2: Completed orders (archive)
  |
  +-- PaymentsDO (transactions, settlements)
  |     |-- SQLite: Today's transactions
  |     +-- R2: Historical (PCI compliant)
  |
  +-- InventoryDO (stock levels, costs)
  |     |-- SQLite: Current inventory
  |
  +-- ScheduleDO (shifts, timecards)
  |     |-- SQLite: Active schedules
  |     +-- R2: Payroll history
  |
  +-- AnalyticsDO (reporting, forecasting)
        |-- SQLite: Aggregated metrics
        +-- R2: Raw data warehouse
```

### Real-Time Kitchen

WebSocket connections for instant updates:

```
POS Terminal                    Kitchen Display
     |                               |
     |-- [Order Created] -->         |
     |                        [Ticket Appears]
     |                               |
     |                        [Cook Bumps Item]
     |<-- [Item Ready] -----         |
     |                               |
     |-- [Fire Next Course] -->      |
     |                        [Next Course Appears]
```

### PCI Compliance

```typescript
// Card data never touches your servers
await pos.payments.configure({
  tokenization: true, // Card data goes directly to processor
  storage: 'tokens-only', // Only store tokens, not PANs
  encryption: {
    atRest: true,
    inTransit: true,
    keyRotation: '90days',
  },
})

// For audits
await pos.compliance.pciReport({
  period: '2024',
  level: 'SAQ-A', // Minimal scope with tokenization
})
```

## Why Open Source for Restaurants?

**1. Margins Are Everything**

Restaurants operate on 3-5% margins. Every basis point matters. 2.99% payment processing vs 2.6% is the difference between profit and loss.

**2. No Regulatory Moat**

Unlike healthcare or pharma, there's no compliance barrier to entry. POS is commodity software with artificial lock-in.

**3. Hardware Is Generic**

An iPad is an iPad. A receipt printer is a receipt printer. The "hardware" Toast sells is commodity equipment with their software pre-loaded.

**4. Data Is Valuable**

Your sales data, customer data, menu performance - it's YOUR business intelligence. You shouldn't pay rent to access it.

**5. AI Changes Everything**

When AI can:
- Forecast demand
- Optimize schedules
- Take phone orders
- Analyze menus

...the software becomes dramatically more valuable. That value should accrue to restaurant owners, not POS vendors.

## Deployment

### Cloudflare Workers

```bash
npx create-dotdo toast
# Deploys globally
# Fast for every terminal
```

### On-Premises

```bash
# For restaurants that want local control
docker run -p 8787:8787 dotdo/toast
```

### Hybrid

```typescript
// Local for speed, cloud for backup
await pos.config.hybrid({
  local: ['orders', 'kds', 'payments'],
  cloud: ['reporting', 'scheduling', 'backups'],
})
```

## Roadmap

### POS
- [x] Menu Management
- [x] Order Entry
- [x] Table Management
- [x] Check Splitting
- [x] Discount/Comp Handling
- [ ] Gift Cards
- [ ] Loyalty Program

### Kitchen
- [x] Kitchen Display System
- [x] Station Routing
- [x] Course Firing
- [x] Prep Sheets
- [ ] Recipe Costing

### Payments
- [x] Stripe Integration
- [x] Square Integration
- [x] Tip Handling
- [ ] Adyen Integration
- [ ] Heartland Integration

### Operations
- [x] Staff Scheduling
- [x] Time Clock
- [x] Inventory Tracking
- [x] Reporting
- [ ] Payroll Integration
- [ ] Accounting Integration

### AI
- [x] Demand Forecasting
- [x] Menu Engineering
- [x] Voice Ordering
- [ ] Dynamic Pricing
- [ ] Sentiment Analysis

## Contributing

toast.do is open source under the MIT license.

We especially welcome contributions from:
- Restaurant operators
- FOH and BOH managers
- POS technicians
- Payment industry experts

```bash
git clone https://github.com/dotdo/toast.do
cd toast.do
npm install
npm test
```

## License

MIT License - Your restaurant, your rules.

---

<p align="center">
  <strong>toast.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://toast.do">Website</a> | <a href="https://docs.toast.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
