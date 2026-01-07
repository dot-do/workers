# toast.do

> Restaurant POS + Management. AI-native. No hardware lock-in.

Toast built a $14B company by giving away POS hardware and charging 2.99% + $0.15 on every transaction. Forever. Add payment processing fees, monthly software fees, and you're paying $10K-50K annually for a system you don't own.

**toast.do** is the open-source alternative. Run your own POS. Choose your own payment processor. AI that actually runs your restaurant.

## AI-Native API

```typescript
import { toast } from 'toast.do'

// Server shorthand - exactly what you'd call out
await toast`T12: 2 ribeye MR, 1 cali`
await toast`fire apps`
await toast`fire mains`

// Or flowing service - one network round trip
await toast`T12`.seat(4).drinks(`2 martini, 2 water`).order(`2 ribeye MR`).fire()

// Forecasting
await toast`prep for tomorrow`  // AI considers weather, events, history
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
import { toast } from 'toast.do'

// Dinner rush - server shorthand
await toast`tonight's book`       // reservations
await toast`what's 86'd`          // sold out items
await toast`labor check`          // staffing vs covers

// Online order through delivery - one round trip
await toast`online order`.fire().dispatch().thank()

// Intelligence
await toast`saturday forecast`    // covers by hour
await toast`schedule next week`   // within labor target
await toast`menu stars and dogs`  // engineering analysis
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

Built for the rush. Server shorthand, not software menus.

```typescript
import { toast } from 'toast.do'

// Ring in orders like you call them
await toast`T12: cali xtra sauce, burrata, 2 ribeye MR`

// Fire courses
await toast`fire apps T12`
await toast`fire mains T12`

// Full service flow - one round trip
await toast`T12`
  .seat(4)
  .drinks(`2 martini, 2 water`)
  .apps(`cali, burrata`)
  .mains(`2 ribeye MR`)
  .fire()
```

### Kitchen Display System

Orders route to stations automatically.

```typescript
// Setup once
await toast`stations: grill, fry, cold, expo`

// KDS shows:
// [GRILL] T12: 2 ribeye MR | 0:00 | FIRE

// Kitchen bumps when done
await toast`bump T12 grill`    // routes to expo
await toast`T12 up`            // ready for pickup
```

### Reservations

```typescript
// Book it
await toast`reso: Johnson 6 Sat 7pm, anniversary, quiet`

// Check the book
await toast`tonight's book`
await toast`waitlist`
await toast`vips tonight`

// Walk-ins
await toast`walk-in 2, 25 min`
await toast`text Johnson table ready`
```

### Online Ordering

Direct orders. No 30% DoorDash fee.

```typescript
// Pickup
await toast`online: 2 marg, 1 caesar, pickup 20 min`

// Delivery - full flow
await toast`delivery order`.fire().dispatch().notify().thank()

// Your customer. Your data.
```

### Tableside Ordering

QR to menu. Guest orders. Server focuses on hospitality.

```typescript
// Setup
await toast`qr codes T1-T30`

// Hybrid mode - alcohol needs server
await toast`tableside on, alcohol needs approval`
```

### Payments

Your processor. Your rates.

```typescript
// Close out
await toast`close T12`
await toast`close T12 + 20%`       // auto-tip

// Splits
await toast`split T12 2 ways`
await toast`split T12: ribeye, ribeye + apps`

// Configuration (once)
await toast`use stripe`            // or square, adyen, heartland
```

### Staff Management

```typescript
// Clock
await toast`John in`
await toast`John out`

// Schedule
await toast`schedule next week`   // AI: 28% labor, fair shifts
await toast`swap John Jane Sat`

// Tips
await toast`pool tips FOH`

// Queries
await toast`overtime watch`
await toast`coverage Sat`
```

### Inventory Management

```typescript
// Queries
await toast`low stock`
await toast`ribeye count`
await toast`food cost this week`

// 86 board
await toast`86 halibut`
await toast`back: cali`

// Ordering
await toast`order for tomorrow`   // AI generates PO

// Receiving
await toast`receiving Sysco`.count().stock().flag()
```

### Reporting

```typescript
// Quick checks
await toast`how'd we do`          // today's summary
await toast`vs last week`         // comparison
await toast`labor this month`

// Performance
await toast`top server`
await toast`dogs on menu`         // underperformers
await toast`food cost check`

// Close out
await toast`EOD`.reconcile().email().prep()
```

## AI-Native

The AI is always on. Just ask.

```typescript
// Forecasting - considers weather, events, history automatically
await toast`tomorrow's forecast`
// → "215-240 covers. Concert at 10pm = 40 late covers.
//    Add server 7pm-close, +50% ribeye prep."

// Menu engineering
await toast`menu analysis Q4`
// → "Stars: ribeye, cali. Dogs: lamb chops. 86 the lamb."

// Scheduling
await toast`schedule next week`
// → Generates within 28% labor, honors requests, balances fairly

// Voice ordering - just enable it
await toast`voice on`
// Customer: "Large pep extra cheese"
// AI: "Large pepperoni extra cheese. Anything else?"
```

### AI Answering Service

```typescript
await toast`phone on`
// "Thanks for calling Bella Italia. How can I help?"
// Takes resos, answers questions, handles to-go orders
```

## Hardware Freedom

Use any hardware. iPads. Any printer. Any card reader.

```typescript
await toast`add terminal iPad-001`
await toast`add printer kitchen 192.168.1.100`
await toast`add reader stripe-m2`
```

### Offline Mode

Internet down during rush? Keep serving.

```typescript
await toast`offline mode on`
// POS works. Payments queue. Syncs when back.
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

Card data never touches your servers. Tokenization by default.

```typescript
await toast`pci report 2024`  // SAQ-A, minimal scope
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
await toast`hybrid: local orders+kds+payments, cloud reporting+backups`
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
