# procore.do

> Construction Management. AI-native. Built for the jobsite.

Procore built a $12B+ company managing construction chaos - RFIs, submittals, drawings, schedules, budgets. At $500-1000+ per project per month, with field workers often locked out of "premium" features, the industry pays a fortune for software that should be commodity.

**procore.do** is the open-source alternative. One-click deploy your own construction management platform. AI that actually understands blueprints. Field-first, not afterthought.

## The workers.do Way

You're a superintendent standing in a muddy trailer at 6 AM, trying to figure out why steel delivery is late and whether you can pour concrete tomorrow. Your field crew needs answers, not software licenses.

**workers.do** gives you AI that speaks construction.

## AI-Native API

```typescript
import { procore, ada, ralph } from 'procore.do'

// Natural language construction queries
const rfis = await procore`open RFIs for Building A`
const punchlist = await procore`incomplete punch items by trade`
const impact = await procore`what activities are impacted if concrete slips 2 days`
```

### Promise Pipelining for Field Workflows

One network round trip from photo to resolution:

```typescript
// Field issue → RFI → Engineer response → Drawing update → Schedule impact
const resolved = await procore`photograph structural issue at grid B-7`
  .map(photos => procore`create RFI with ${photos}`)
  .map(rfi => ada`analyze engineer response when received`)
  .map(spec => procore`update drawing markup`)
  .map(markup => priya`calculate schedule impact`)
```

### Daily Log with AI

```typescript
const log = await procore`create daily log for ${date}`
  .then(log => ada`flag safety concerns from ${log}`)
  .then(concerns => procore`notify superintendent if critical`)
```

### AI Agents That Understand Construction

```typescript
import { priya, ralph, tom, ada, quinn } from 'agents.do'

// Project intelligence - each agent has construction expertise
await priya`analyze punch list and prioritize by trade for ${project}`
await ralph`compare change order ${pco} against original bid quantities`
await tom`review ${drawing} rev 3 against rev 2 - flag coordination issues`
await ada`extract quantities from architectural floor plans`
await quinn`verify all RFI responses are incorporated into drawings`
```

### Tree-Shakable Imports

```typescript
// Full package - all features
import { procore } from 'procore.do'

// Tiny - minimal core for field devices
import { procore } from 'procore.do/tiny'

// RPC only - expects service binding
import { procore } from 'procore.do/rpc'

// With offline sync
import { procore, sync } from 'procore.do/offline'

// Agent-specific packages
import { ada } from 'ada.do'  // Construction AI specialist
```

### MCP Tools for Voice-Activated Field Work

Every feature exposes MCP tools for AI assistants:

```typescript
// Voice-activated daily logging (works offline)
"Hey Ada, log my daily report. We had 8 electricians on site,
worked on rough-in for floors 2 and 3, passed the underground inspection."

// Photo-to-punch-item pipeline
"Create a punch item for this photo - ceiling tile is damaged in room 305"
// → Uploads photo → Creates punch item → Assigns to trade → Notifies super

// Quick lookups from the field
"What's the status of the storefront submittal?"
"Who's the contact for the steel subcontractor?"
"When is the concrete pour scheduled?"

// Safety alerts
"Ada, review today's work permits and flag any conflicts"
```

## The Problem

Construction is the least digitized major industry. And the software that exists?

- **$500-1000+ per project/month** - A GC with 20 active projects? $120K-240K annually
- **Per-user restrictions** - Field workers get crippled "basic" access
- **Offline is broken** - Most construction happens where there's no signal
- **AI is marketing** - "AI-powered" but can't read a drawing
- **Integration tax** - Accounting, estimating, scheduling all require expensive connectors

The irony: Construction generates more documents than almost any industry, yet most of it ends up in filing cabinets, email attachments, and text messages.

## The Solution

**procore.do** is construction management for the AI era:

```
Procore                         procore.do
-----------------------------------------------------------------
$500-1000+/project/month        $0 - run your own
Limited user seats              Unlimited users
Offline "coming soon"           Offline-first architecture
AI marketing fluff              AI that reads drawings
Closed integrations             Open APIs, MCP tools
Field as afterthought           Field-first design
```

## One-Click Deploy

```bash
npx create-dotdo procore
```

Your own construction management platform. Every user. Every project. No per-seat nonsense.

## Features

### Project Management

The command center for your jobsite:

```typescript
import { procore } from 'procore.do'

// Create a project
const project = await procore.projects.create({
  name: 'Downtown Medical Center',
  number: 'DMC-2025',
  type: 'Healthcare',
  address: '123 Main St, San Francisco, CA',
  owner: 'Memorial Health System',
  contract: {
    type: 'GMP',
    value: 45000000,
    startDate: '2025-03-01',
    duration: 18, // months
  },
  team: {
    projectManager: 'user-001',
    superintendent: 'user-002',
    projectEngineer: 'user-003',
  },
})
```

### RFIs (Requests for Information)

The lifeblood of construction communication - now with AI-native workflows:

```typescript
// Natural language RFI creation
const rfi = await procore`create RFI for bolt spec at grid B-7 referencing S-201 and S-501`

// Or full pipeline from field observation to resolution
const resolved = await procore`photograph connection at grid B-7`
  .map(photo => procore`create RFI: bolt spec unclear in ${photo}`)
  .map(rfi => procore`route to Structural Engineer of Record`)
  .map(response => procore`incorporate into ASI and close`)

// AI-assisted RFI drafting
const rfi = await ada`
  Draft RFI: Drawing S-201 shows W12x26 beam at grid B-7.
  Connection detail 4/S-501 doesn't specify bolt size.
  Reference our structural specs and similar past projects.
`.then(draft => procore`create RFI from ${draft}`)

// Programmatic access when needed
const rfi = await procore.rfis.create({
  project: 'DMC-2025',
  subject: 'Structural steel connection detail at grid B-7',
  referenceDrawings: ['S-201', 'S-501'],
  assignedTo: 'Structural Engineer of Record',
})
```

### Submittals

Track every material and shop drawing with AI-assisted review:

```typescript
// Natural language submittal queries
const pending = await procore`pending submittals blocking steel erection`
const overdue = await procore`submittals past due date this week`

// Full submittal workflow with AI review
const approved = await procore`receive storefront shop drawings from ABC Glazing`
  .map(drawings => ada`review against spec 08 41 13 and flag conflicts`)
  .map(review => procore`route to architect with ${review.notes}`)
  .map(response => procore`process architect comments`)
  .map(final => procore`distribute approved submittal to field`)

// AI catches coordination issues before architect review
const reviewed = await ada`
  Review submittal SUB-103 aluminum storefront framing.
  Check frame depth against ceiling soffit in reflected ceiling plan.
  Verify hardware spec matches door schedule.
`.then(analysis => procore`attach AI review to submittal`)

// Programmatic access when needed
const submittal = await procore.submittals.create({
  project: 'DMC-2025',
  specSection: '08 41 13',
  description: 'Aluminum Storefront Framing - Building A Main Entrance',
  subcontractor: 'ABC Glazing Co',
})
```

### Drawings

Living documents, not static PDFs:

```typescript
// Upload drawing set
await procore.drawings.upload({
  project: 'DMC-2025',
  set: 'IFC Set 03',
  date: '2025-01-15',
  drawings: [
    { number: 'A-101', title: 'First Floor Plan', file: 'A-101.pdf' },
    { number: 'A-102', title: 'Second Floor Plan', file: 'A-102.pdf' },
    { number: 'S-201', title: 'Structural Framing Plan', file: 'S-201.pdf' },
    // ...200 more drawings
  ],
})

// Link to RFIs, submittals, photos
await procore.drawings.link('A-101', {
  rfis: ['RFI-047', 'RFI-052'],
  submittals: ['SUB-103'],
  photos: ['PHOTO-2025-01-20-001'],
  punchItems: ['PUNCH-234'],
})

// Markup and distribute
await procore.drawings.markup('A-101', {
  cloudedArea: { x: 100, y: 200, width: 50, height: 30 },
  comment: 'Verify dimension to column centerline',
  assignedTo: 'user-002',
})
```

### Daily Logs

What actually happened on site:

```typescript
// Superintendent's daily log
await procore.dailyLogs.create({
  project: 'DMC-2025',
  date: '2025-01-20',

  weather: {
    conditions: 'Partly Cloudy',
    tempHigh: 62,
    tempLow: 48,
    precipitation: 0,
    wind: 'Light',
    workImpact: 'None',
  },

  workforce: {
    prime: { workers: 12, hours: 96 },
    subs: [
      { company: 'ABC Electrical', workers: 8, hours: 64, trade: 'Electrical' },
      { company: 'XYZ Plumbing', workers: 6, hours: 48, trade: 'Plumbing' },
      { company: 'Steel Erectors Inc', workers: 4, hours: 32, trade: 'Structural Steel' },
    ],
  },

  workPerformed: [
    'Continued second floor steel erection at grids A-D',
    'Rough electrical in first floor tenant spaces',
    'Underground plumbing inspection - PASSED',
    'Received and staged curtain wall panels',
  ],

  visitors: [
    { name: 'Jane Smith', company: 'Owner Rep', purpose: 'Monthly progress meeting' },
    { name: 'City Inspector', company: 'Building Dept', purpose: 'Underground plumbing inspection' },
  ],

  equipment: [
    { type: 'Tower Crane', hours: 8, status: 'Operating' },
    { type: 'Concrete Pump', hours: 0, status: 'Standby' },
  ],

  safetyNotes: 'Toolbox talk: Fall protection review. No incidents.',

  photos: ['PHOTO-2025-01-20-001', 'PHOTO-2025-01-20-002'],
})
```

### Budget & Cost

Real-time financial visibility:

```typescript
// Set up budget
await procore.budget.create({
  project: 'DMC-2025',
  originalContract: 45000000,
  costCodes: [
    { code: '03-30-00', description: 'Cast-in-Place Concrete', budget: 4500000 },
    { code: '05-12-00', description: 'Structural Steel', budget: 6200000 },
    { code: '08-41-00', description: 'Aluminum Storefront', budget: 890000 },
    // ...hundreds of cost codes
  ],
})

// Track change orders
await procore.changes.create({
  project: 'DMC-2025',
  number: 'PCO-017',
  title: 'Owner Requested Lobby Upgrade',
  scope: 'Upgrade lobby flooring from VCT to terrazzo per owner request',
  costImpact: {
    labor: 45000,
    material: 120000,
    equipment: 5000,
    markup: 17000,
    total: 187000,
  },
  scheduleImpact: 5, // days
  status: 'Pending Owner Approval',
  attachments: ['terrazzo-quote.pdf', 'schedule-impact.pdf'],
})

// Real-time cost report
const costReport = await procore.budget.report('DMC-2025')
// {
//   originalContract: 45000000,
//   approvedChanges: 890000,
//   pendingChanges: 187000,
//   revisedContract: 45890000,
//   costToDate: 12340000,
//   projectedFinal: 46100000,
//   variance: -210000
// }
```

### Schedule

Integrated scheduling with field updates:

```typescript
// Import schedule
await procore.schedule.import({
  project: 'DMC-2025',
  source: 'primavera', // or 'ms-project', 'asta', 'procore-native'
  file: 'DMC-Master-Schedule.xer',
})

// Update from field
await procore.schedule.update({
  activity: 'A1040',
  actualStart: '2025-01-15',
  percentComplete: 75,
  notes: 'Steel delivery delayed 2 days, working overtime to recover',
  updatedBy: 'user-002',
})

// Three-week lookahead
const lookahead = await procore.schedule.lookahead('DMC-2025', {
  weeks: 3,
  includeManpower: true,
  includeDeliveries: true,
})
```

### Punch List

Close out without the chaos:

```typescript
// Create punch items
await procore.punch.create({
  project: 'DMC-2025',
  location: 'Room 203 - Conference Room B',
  items: [
    { description: 'Touch up paint at door frame', trade: 'Painting', assignee: 'ABC Painting' },
    { description: 'Adjust door closer - closes too fast', trade: 'Doors', assignee: 'Hardware Inc' },
    { description: 'HVAC diffuser misaligned with ceiling grid', trade: 'HVAC', assignee: 'XYZ Mechanical' },
  ],
  photos: ['punch-203-001.jpg', 'punch-203-002.jpg'],
  dueDate: '2025-03-01',
})

// Track completion
await procore.punch.complete({
  item: 'PUNCH-234',
  completedBy: 'ABC Painting',
  completedDate: '2025-02-20',
  verifiedBy: 'user-003',
  photos: ['punch-234-complete.jpg'],
})

// Punch list dashboard
const punchStatus = await procore.punch.summary('DMC-2025')
// {
//   total: 847,
//   open: 234,
//   completed: 489,
//   verified: 124,
//   byTrade: { Painting: 89, Electrical: 67, ... }
// }
```

## Offline-First

Construction happens where the wifi isn't:

```typescript
import { procore, sync } from 'procore.do'

// Configure offline cache
await procore.offline.configure({
  project: 'DMC-2025',
  cache: {
    drawings: 'all', // Cache all drawings
    rfis: 'open',    // Only open RFIs
    photos: 'last7days',
    forms: 'all',
  },
  autoSync: {
    onConnect: true,
    interval: '5min',
  },
})

// Work offline
await procore.dailyLogs.create({ /* ... */ }) // Queued locally

// Sync when connected
await sync()
// Resolves conflicts intelligently
// Merges concurrent edits
// Preserves audit trail
```

### Conflict Resolution

When two people edit the same record offline:

```typescript
await procore.offline.conflictStrategy({
  // Automatic merge when possible
  autoMerge: true,

  // Field-level conflict rules
  rules: {
    'dailyLog.weather': 'lastWrite', // Latest wins
    'rfi.response': 'preserve',       // Never overwrite
    'punch.status': 'mostProgressed', // Can't un-complete
  },

  // Manual resolution for complex conflicts
  onConflict: async (local, remote, field) => {
    // Present to user or AI agent for resolution
  },
})
```

## AI Construction Intelligence

### Ada: The Construction AI Specialist

```typescript
import { ada } from 'procore.do/agents'

// Analyze drawing for issues
await ada`
  Review drawing S-201 structural framing plan.
  Identify any conflicts with M-201 mechanical layout.
  Flag any beam penetrations that might require supplemental steel.
`
// Ada identifies: "W14x30 at grid C-4 conflicts with 24" duct.
// Recommend RFI to structural engineer for penetration reinforcement."

// Extract quantities from drawings
await ada`
  From the architectural floor plans, calculate:
  1. Total square footage by floor
  2. Linear feet of interior partition wall
  3. Count of doors by type
`
```

### Intelligent RFI Pipeline

```typescript
import { ada, ralph, priya } from 'procore.do'

// AI-powered RFI lifecycle with pipelining
const analysis = await procore`get all RFIs for Downtown Medical Center`
  .map(rfis => ada`analyze patterns - which disciplines generate most RFIs?`)
  .map(patterns => priya`recommend process improvements based on ${patterns}`)
  .map(recommendations => procore`create action items from ${recommendations}`)

// Draft responses with historical context
const response = await ada`
  RFI-047 asks about bolt specification at grid B-7.
  Search structural specs and similar past projects.
`.then(research => ralph`draft response using ${research}`)
  .then(draft => procore`attach draft to RFI for engineer review`)
```

### AI Schedule Analysis

```typescript
import { tom, priya } from 'procore.do'

// Schedule risk analysis with pipelining
const risks = await procore`get critical path activities for DMC-2025`
  .map(activities => tom`identify high-risk activities: long lead, pending submittals, weather`)
  .map(risks => priya`prioritize risks and recommend mitigations`)
  .map(register => procore`create risk register with ${register}`)

// Delay impact analysis pipeline
const recovery = await procore`steel erection is 5 days behind`
  .map(delay => tom`analyze downstream impacts on ${delay}`)
  .map(impacts => tom`identify re-sequencing options`)
  .map(options => priya`calculate overtime cost vs schedule benefit`)
  .map(analysis => procore`present recovery options to PM`)
```

### AI Cost Forecasting

```typescript
import { priya, ada } from 'procore.do'

// Cost forecast pipeline
const forecast = await procore`get DMC-2025 cost data with burn rates`
  .map(data => ada`analyze historical trends and pending changes`)
  .map(analysis => priya`forecast final cost with confidence interval`)
  .map(forecast => procore`update project dashboard with ${forecast}`)

// Change order validation pipeline
const validation = await procore`get PCO-017 lobby terrazzo quote`
  .map(quote => ada`compare against RS Means and past projects`)
  .map(analysis => priya`assess reasonableness: ${analysis}`)
  .map(assessment => assessment.reasonable
    ? procore`approve PCO-017`
    : procore`flag PCO-017 for negotiation with notes: ${assessment.issues}`)
```

### MCP Tool Registry

All construction operations are exposed as MCP tools:

```typescript
// Available MCP tools for AI assistants
const tools = {
  // Document management
  'procore.rfis.create': { params: ['subject', 'drawings', 'assignee'] },
  'procore.rfis.query': { params: ['project', 'status', 'discipline'] },
  'procore.submittals.route': { params: ['submittal', 'workflow'] },

  // Field operations
  'procore.dailyLog.create': { params: ['date', 'weather', 'workforce', 'work'] },
  'procore.punch.create': { params: ['location', 'items', 'photos'] },
  'procore.photos.upload': { params: ['location', 'description', 'tags'] },

  // Analysis
  'procore.drawings.analyze': { params: ['drawing', 'extract', 'detectConflicts'] },
  'procore.schedule.impact': { params: ['activity', 'delay'] },
  'procore.budget.forecast': { params: ['project', 'asOfDate'] },
}
```

## Architecture

### Durable Object per Project

Each project is isolated with its own storage:

```
ProjectDO (project metadata, team, settings)
  |
  +-- DocumentsDO (drawings, specs, submittals)
  |     |-- SQLite: Metadata, links, markups
  |     +-- R2: PDF storage, versions
  |
  +-- CommunicationsDO (RFIs, correspondence)
  |     |-- SQLite: All records, routing
  |     +-- R2: Attachments
  |
  +-- DailyLogsDO (daily reports, photos)
  |     |-- SQLite: Log data
  |     +-- R2: Photos (optimized)
  |
  +-- FinancialsDO (budget, changes, invoices)
  |     |-- SQLite: All financial data
  |     +-- R2: Backup invoices
  |
  +-- PunchDO (punch lists, closeout)
        |-- SQLite: Items, status
        +-- R2: Photos
```

### Offline Sync Architecture

```
Mobile Device                   Edge                         Origin
     |                            |                            |
     |  [Offline Queue]           |                            |
     |  - Create daily log        |                            |
     |  - Add punch item          |                            |
     |  - Take photos             |                            |
     |                            |                            |
     |------- On Connect -------->|                            |
     |                            |------ Batch Sync --------->|
     |                            |<----- Merge Result --------|
     |<--- Conflict Resolution ---|                            |
     |                            |                            |
     |  [Local Cache Updated]     |                            |
```

### Drawing Intelligence

```typescript
// AI-powered drawing analysis
await procore.drawings.analyze('A-101', {
  extract: [
    'dimensions',
    'annotations',
    'gridlines',
    'roomNames',
    'doorSchedule',
  ],
  detectConflicts: {
    against: ['M-101', 'E-101', 'P-101'], // MEP coordination
    tolerance: '2"',
  },
  generateQuantities: true,
})
```

## Why Open Source for Construction?

Construction is ripe for open source disruption:

**1. Fragmented Market**

Unlike pharma (Veeva) or healthcare (Epic), construction has:
- Thousands of GCs, each with different needs
- No regulatory moat protecting incumbents
- Strong desire for customization

**2. Data Ownership Matters**

Project records are contractual obligations:
- Owners often require data at project close
- Long-term retention requirements
- Litigation discovery needs

**3. Integration Nightmare**

Every contractor uses different:
- Accounting software (Sage, Viewpoint, Foundation)
- Estimating (Bluebeam, On-Screen Takeoff)
- Scheduling (Primavera, MS Project)

Open source enables custom integrations without vendor gatekeeping.

**4. Field Workers Deserve Better**

Procore charges extra for "field" users. That's backwards. The field IS the product. Open source means everyone gets full access.

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo procore
# Deploys globally - fast for every jobsite
```

### Self-Hosted

```bash
# Docker for on-prem
docker run -p 8787:8787 dotdo/procore

# Or behind your firewall
./procore-do-install.sh --on-prem
```

### Hybrid

```typescript
// Sensitive financials on-prem, field data on edge
await procore.config.hybrid({
  edge: ['dailyLogs', 'photos', 'punch', 'rfis'],
  onPrem: ['budget', 'changes', 'invoices'],
})
```

## Roadmap

### Core
- [x] Project Management
- [x] RFIs
- [x] Submittals
- [x] Drawings
- [x] Daily Logs
- [x] Punch Lists
- [x] Budget & Cost
- [x] Schedule Integration
- [ ] Inspections
- [ ] Meetings
- [ ] Correspondence

### Field
- [x] Offline-First Architecture
- [x] Photo Documentation
- [x] Mobile-Optimized UI
- [ ] Voice Input
- [ ] AR Markup
- [ ] BIM Integration

### AI
- [x] Drawing Analysis
- [x] RFI Generation
- [x] Cost Forecasting
- [ ] Automated Quantity Takeoff
- [ ] Schedule Optimization
- [ ] Safety Hazard Detection

## Contributing

procore.do is open source under the MIT license.

We welcome contributions from:
- Construction professionals
- Project managers
- Field superintendents
- Estimators and schedulers

```bash
git clone https://github.com/dotdo/procore.do
cd procore.do
npm install
npm test
```

## License

MIT License - Build. Manage. Own it.

---

<p align="center">
  <strong>procore.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://procore.do">Website</a> | <a href="https://docs.procore.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
