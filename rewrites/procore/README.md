# procore.do

> Talk to your jobsite like you'd talk to your super.

```typescript
await procore`where's my steel?`
await procore`RFI this crack`
await procore`punch the ceiling in 305`
await procore`can we pour Friday?`
```

No project IDs. No config objects. No software training.

Just construction.

---

## The Vision

You're a superintendent standing in a muddy trailer at 6 AM. Steel is late. Owner wants to pour Friday. Your field crew needs answers.

**procore.do** - Construction management that understands how you actually work.

## The Minimal API

```typescript
import { procore } from 'procore.do'

// Voice-natural commands - what a super would actually yell
await procore`open RFIs Building A`
await procore`punch list by trade`
await procore`what if concrete slips 2 days`
```

### One Command, Everything Automatic

```typescript
// OLD: Too many steps
const photos = await procore`photograph issue at grid B-7`
const rfi = await procore`create RFI with ${photos}`
const response = await ada`analyze engineer response`

// NEW: One command does it all
await procore`RFI this crack at B-7`
// → Takes photos → Creates RFI → Routes to engineer → Tracks response → Updates drawings

await procore`punch list the ceiling in 305`
// → Creates item → Assigns trade → Adds photo → Notifies super

await procore`log today: 8 electricians, rough-in floors 2-3, passed underground`
// → Weather auto-filled → Manpower tracked → Inspection recorded → Photos linked
```

### The Trailer Test

If you can't yell it from the trailer, it's too complicated:

```typescript
// Pass
await procore`where's my steel?`
await procore`who's on site tomorrow`
await procore`close out room 203`

// Fail - too verbose
await procore`query submittal status for structural steel delivery from vendor`
```

### AI Agents That Understand Construction

```typescript
import { priya, ralph, tom, ada, quinn } from 'agents.do'

// Same minimal style - agents infer context from your current project
await priya`prioritize the punch list`
await ralph`is change order 17 reasonable?`
await tom`what changed in the structural revs?`
await ada`how much drywall do we need?`
await quinn`any RFIs not in the drawings?`
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

### Voice from the Field

Every feature works with natural voice:

```
"Log today - 8 electricians, floors 2-3, passed underground"

"Punch this ceiling, room 305"

"Where's my storefront submittal?"

"Who's the steel guy?"

"When's the pour?"

"Any permit conflicts today?"
```

No project IDs. No config. Just talk.

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

```typescript
// OLD: Config object hell
const project = await procore.projects.create({
  name: 'Downtown Medical Center',
  number: 'DMC-2025',
  type: 'Healthcare',
  address: '123 Main St, San Francisco, CA',
  owner: 'Memorial Health System',
  contract: { type: 'GMP', value: 45000000 },
  team: { projectManager: 'user-001' },
})

// NEW: Natural language setup
await procore`new project: Downtown Medical Center, 123 Main St`
// → Type inferred from name → Contract imported from bid → Team from org
```

### RFIs (Requests for Information)

```typescript
// OLD: Too many steps
const rfi = await procore`create RFI for bolt spec at grid B-7 referencing S-201 and S-501`
const resolved = await procore`photograph connection at grid B-7`
  .map(photo => procore`create RFI: bolt spec unclear in ${photo}`)
  .map(rfi => procore`route to Structural Engineer of Record`)

// NEW: Just say it
await procore`RFI the bolt spec at B-7`
// → Photos taken → Drawings auto-referenced → Routed to engineer → Tracked

// Even simpler from the field
await procore`RFI this`  // While looking at the issue
// → Uses your location → Takes photo → Infers discipline → Routes automatically
```

### Submittals

```typescript
// OLD: Workflow soup
const approved = await procore`receive storefront shop drawings from ABC Glazing`
  .map(drawings => ada`review against spec 08 41 13 and flag conflicts`)
  .map(review => procore`route to architect with ${review.notes}`)
  .map(response => procore`process architect comments`)

// NEW: Just ask
await procore`what's holding up steel?`
// → Shows blocking submittals → Lead times → Vendor contacts

await procore`submittal status`
// → Pending, overdue, approved this week

await procore`approve the storefront`
// → Routes to architect → Tracks response → Distributes when approved
```

### Drawings

```typescript
// OLD: Upload config object
await procore.drawings.upload({
  project: 'DMC-2025',
  set: 'IFC Set 03',
  date: '2025-01-15',
  drawings: [
    { number: 'A-101', title: 'First Floor Plan', file: 'A-101.pdf' },
    // ...200 more
  ],
})

// NEW: Just drop them
await procore`new drawings`  // Opens file picker or drag-drop
// → Auto-numbers → Links to existing RFIs/submittals → Notifies field

// Find what you need
await procore`show me B-7`
// → Shows all drawings with grid B-7 → Related RFIs → Recent photos

await procore`what changed in the structural set?`
// → Clouds revisions → Lists affected areas → Shows impacted work
```

### Daily Logs

```typescript
// OLD: 40-line config object
await procore.dailyLogs.create({
  project: 'DMC-2025',
  date: '2025-01-20',
  weather: { conditions: 'Partly Cloudy', tempHigh: 62, ... },
  workforce: { prime: { workers: 12 }, subs: [ ... ] },
  workPerformed: [ ... ],
  visitors: [ ... ],
  equipment: [ ... ],
})

// NEW: Just talk
await procore`log today: 8 sparks, 6 plumbers, steel crew
              finished rough-in floor 2, passed underground inspection
              owner rep visited for progress meeting`

// Even easier - voice dictation
await procore`log today`
// → "What happened today?" → You talk → Log created

// Weather, equipment, safety auto-filled from site data
```

### Budget & Cost

```typescript
// OLD: Config hell for change orders
await procore.changes.create({
  project: 'DMC-2025',
  number: 'PCO-017',
  title: 'Owner Requested Lobby Upgrade',
  costImpact: { labor: 45000, material: 120000, ... },
  scheduleImpact: 5,
})

// NEW: Natural questions
await procore`how's the budget?`
// → Contract value → Changes → Projected final → Variance

await procore`change order for lobby terrazzo - owner wants upgrade`
// → Pulls quotes → Calculates impact → Drafts CO → Routes for approval

await procore`are we making money on this job?`
// → Margin analysis → Problem areas → Forecast
```

### Schedule

```typescript
// OLD: Schedule update objects
await procore.schedule.update({
  activity: 'A1040',
  actualStart: '2025-01-15',
  percentComplete: 75,
  notes: 'Steel delivery delayed 2 days',
})

// NEW: Just say what happened
await procore`steel is 2 days behind`
// → Updates activities → Recalculates downstream → Shows impact

await procore`what's the three week look`
// → Lookahead with manpower → Deliveries → Milestones

await procore`can we pour Friday?`
// → Checks weather → Concrete availability → Crew → Prerequisites
```

### Punch List

```typescript
// OLD: Multi-field config
await procore.punch.create({
  project: 'DMC-2025',
  location: 'Room 203',
  items: [
    { description: 'Touch up paint', trade: 'Painting', assignee: 'ABC' },
    { description: 'Adjust door closer', trade: 'Doors', assignee: 'HW Inc' },
  ],
})

// NEW: Voice from the walkthrough
await procore`punch the paint at the door frame, room 203`
await procore`punch this ceiling`  // Uses your location
await procore`door closer too fast`

// Close out
await procore`close out 203`
// → Shows all open items → Confirms completion → Takes verification photos

await procore`how much punch is left?`
// → Total open → By trade → By area → Timeline to close
```

## Offline-First

Construction happens where the wifi isn't. procore.do just works.

```typescript
// No configuration needed - offline is automatic
await procore`punch this ceiling`  // Works offline
await procore`log today`           // Works offline
await procore`RFI this`            // Works offline

// When you're back online, it syncs
// Conflicts resolved automatically
// Audit trail preserved
```

No cache config. No sync buttons. Just works.

## AI Construction Intelligence

AI that speaks construction, not software:

```typescript
// Drawing analysis
await procore`any conflicts in the structural?`
// → Checks against MEP → Flags beam penetrations → Recommends RFIs

// Quantity takeoff
await procore`how much drywall?`
// → Extracts from drawings → Calculates waste factor → Ready to bid

// Schedule risk
await procore`what's at risk?`
// → Long lead items → Weather windows → Permit timing

// Cost validation
await procore`is change order 17 fair?`
// → Compares to RS Means → Checks past projects → Recommends action
```

The AI handles the complexity. You ask questions.

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
// OLD: Config array for analysis
await procore.drawings.analyze('A-101', {
  extract: ['dimensions', 'annotations', 'gridlines'],
  detectConflicts: { against: ['M-101', 'E-101'], tolerance: '2"' },
})

// NEW: Just ask
await procore`check A-101 for conflicts`
await procore`what's different in the new set?`
await procore`count the doors`
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
