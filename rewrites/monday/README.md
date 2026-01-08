# monday.do

> Work OS. Open source. AI-orchestrated. Natural language.

Monday.com built a $10B+ company on colorful boards and "work operating system" marketing. At $12-24/user/month, with core features locked behind higher tiers and AI as yet another add-on, it's a lot of money for project visualization.

**monday.do** is the Work OS reimagined. Visual project management with AI that actually manages work. Automations that write themselves. Cross-team visibility without cross-team pricing.

## AI-Native API

```typescript
import { monday } from 'monday.do'           // Full SDK
import { monday } from 'monday.do/tiny'      // Minimal client
import { monday } from 'monday.do/boards'    // Boards-only operations
```

Natural language for work management:

```typescript
import { monday } from 'monday.do'

// Talk to it like a project manager
const stuck = await monday`what items are stuck and why?`
const overdue = await monday`overdue tasks for marketing team`
const capacity = await monday`who has bandwidth for more work?`

// Chain like sentences
await monday`all items due this week`
  .notify(`Reminder: due this week`)

// Boards that build themselves
await monday`board for Product Development with Status, Owner, Priority columns`
  .addGroup(`Q1 Features`)
  .addItem(`Authentication Revamp`)
```

## The Problem

Monday.com's pricing strategy:

| Plan | Price | Reality |
|------|-------|---------|
| Free | $0/2 users | Severely limited |
| Basic | $12/user/month | No automations, no integrations |
| Standard | $14/user/month | Basic automations (250/month) |
| Pro | $24/user/month | Advanced features, more automations |
| Enterprise | Custom | Everything, unlimited price |

**100-person company on Pro?** That's **$28,800/year**.

The hidden costs:
- **Seat minimums** - 3 seats minimum on paid plans
- **Automation limits** - 250-25k/month depending on tier
- **Integration limits** - Key integrations locked to higher tiers
- **AI costs** - monday AI is (of course) an add-on
- **Guest pricing** - Collaborators count toward seat limits

## The Solution

**monday.do** is Work OS done right:

```
Traditional monday.com        monday.do
-----------------------------------------------------------------
$12-24/user/month             $0 - run your own
Automation limits             Unlimited automations
AI as add-on                  AI-native operations
Seat minimums                 Use what you need
Their servers                 Your Cloudflare account
Proprietary formulas          TypeScript logic
Limited API calls             Unlimited API
```

## One-Click Deploy

```bash
npx create-dotdo monday
```

Your own Work OS. Running on Cloudflare. AI-orchestrated.

```bash
# Or add to existing workers.do project
npx dotdo add monday
```

## The workers.do Way

You're building a product. Your team needs work management. Monday.com wants $29k/year with automation limits and AI as an add-on. Colorful boards, but your work still doesn't manage itself. There's a better way.

**Natural language. Tagged templates. AI agents that work.**

```typescript
import { monday } from 'monday.do'
import { priya, ralph, quinn, mark } from 'agents.do'

// Talk to your work OS like a human
const stuck = await monday`what items are stuck and why?`
const capacity = await monday`who has bandwidth for more work?`
const forecast = await monday`will we hit the Q1 deadline?`
```

**Promise pipelining - chain work without Promise.all:**

```typescript
// Sprint planning pipeline
const sprint = await monday`current sprint`
const planned = await monday`backlog items ready for sprint`
  .map(item => priya`prioritize ${item} for sprint`)
  .map(item => ralph`estimate ${item}`)
  .map(item => monday`add ${item} to ${sprint}`)

// Status update pipeline
const updated = await monday`items completed this week`
  .map(item => mark`write status update for ${item}`)
  .map(update => monday`post ${update} to board`)

// Review pipeline
const reviewed = await monday`items ready for review`
  .map(item => [priya, quinn].map(r => r`review ${item}`))
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Boards & Items

The foundation of work management:

```typescript
// Create boards naturally
const board = await monday`board for Product Development with Status, Owner, Priority columns`
const hiring = await monday`hiring pipeline board with stages: Phone Screen, Technical, Team, Offer`
const bugs = await monday`bug tracking board with Severity, Reporter, Assignee`

// AI infers what you need
await monday`Product Development board`         // returns existing board
await monday`create Sprint 23 board`            // creates new board
await monday`duplicate Q4 board as Q1`          // duplicates with updates

// Add groups and items naturally
await monday`add Q1 Features group to Product Development`
await monday`add Authentication Revamp to Q1 Features, high priority, assign to Alice`

// Bulk operations read like instructions
await monday`
  Product Development board:
  - Q1 Features group:
    - Authentication Revamp, high priority, Alice
    - Payment Integration, critical priority, Bob
    - Dashboard Redesign, medium priority, Carol
`
```

### Column Types

All the column types you need:

| Type | Description | Natural Language |
|------|-------------|------------------|
| **Status** | Customizable status labels with colors | `with Status column` |
| **Person** | Assign team members | `with Owner column` |
| **Timeline** | Date ranges with Gantt visualization | `with Timeline column` |
| **Date** | Single date picker | `with Due Date column` |
| **Numbers** | Numeric values with units | `with Budget column in dollars` |
| **Text** | Free-form text | `with Notes column` |
| **Long Text** | Rich text editor | `with Description column` |
| **Tags** | Multi-select tags | `with Tags column` |
| **Dropdown** | Single select dropdown | `with Category dropdown` |
| **Files** | File attachments | `with Attachments column` |
| **Link** | URLs with preview | `with Link column` |
| **Checkbox** | Boolean checkbox | `with Completed checkbox` |
| **Progress** | Progress tracking (0-100%) | `with Progress column` |
| **Rating** | Star ratings | `with Rating column` |
| **Dependency** | Item dependencies | `with Dependencies column` |
| **Formula** | Calculated columns | `with Total formula` |

### Views

Same data, different perspectives:

```typescript
// Switch views naturally
await monday`show Product Development as kanban`
await monday`show Q1 roadmap as timeline`
await monday`show team workload for January`
await monday`show sprint burndown chart`

// Create views with natural descriptions
await monday`create view: active items sorted by priority`
await monday`create kanban view grouped by Status`
await monday`create timeline view colored by Priority`
await monday`create calendar view for due dates`

// Filter naturally
await monday`show items not done, sorted by priority descending`
await monday`show Alice's items due this week`
await monday`show stuck items with high priority`
```

### Dashboards

Aggregate data across boards:

```typescript
// Create dashboards naturally
await monday`executive dashboard showing all projects`
await monday`team dashboard for Engineering with velocity and burndown`
await monday`Q1 goals dashboard with progress bars`

// Query dashboards
await monday`how are we tracking on Q1 goals?`
await monday`show project status across all teams`
await monday`what's the total budget across all projects?`

// Dashboard widgets from descriptions
await monday`
  Executive Overview dashboard:
  - total project count across all boards
  - status breakdown pie chart
  - all projects timeline
  - Q1 goals progress
  - at-risk items table
`
```

### Subitems

Break work into smaller pieces:

```typescript
// Add subitems naturally
await monday`break down User Dashboard into subitems`
await monday`add subitem Design Mockups to User Dashboard, assign to designer`
await monday`add subitem Backend API to User Dashboard, in progress`
await monday`add subitem Frontend to User Dashboard, not started`

// Or let AI break it down
await monday`decompose Authentication Revamp into implementation tasks`
  // AI creates: Database schema, API endpoints, UI components, Tests

// Query subitems
await monday`subitems for User Dashboard`
await monday`incomplete subitems for Q1 Features`

// Parent progress auto-calculates from subitems
```

## AI-Native Work OS

AI doesn't just assist - it orchestrates.

### AI Automations

Automations as natural language:

```typescript
// Describe automations the way you'd tell a colleague
await monday`automate: when Status = Done, notify Owner on Slack`
await monday`automate: when all subitems done, move parent to Completed`
await monday`automate: when item stuck for 3 days, escalate to manager`
await monday`automate: when due date passes, mark as overdue and notify`

// Complex automations read like rules
await monday`
  automate:
  - when Priority = Critical and Status = Stuck, notify #leadership on Slack
  - when all dependencies done, set Status = Ready
  - every Monday at 9am, send weekly digest to team
`

// Query automations
await monday`what automations are on Product Development board?`
await monday`disable the overdue notification automation`
```

### AI Work Assignment

Let AI assign work intelligently:

```typescript
// Just ask who should do it
const who = await monday`who should work on Payment Integration?`
// AI considers: expertise, workload, availability, history

// Auto-assign with reasoning
await monday`assign Payment Integration to best available person`
  // Returns: Assigned to Alice - 12 similar tasks completed, 65% capacity, available all week

// Balance workload across team
await monday`balance Q1 Features across engineering team`
await monday`who has capacity for more work?`
await monday`redistribute stuck items from Bob who's overloaded`
```

### AI Status Updates

AI writes status updates from activity:

```typescript
// Generate updates naturally
const update = await monday`write weekly status update for Product Development`
const standup = await monday`what did engineering complete yesterday?`
const exec = await monday`executive summary of Q1 progress`

// Scheduled updates
await monday`automate: every Friday at 4pm, send weekly status to team@company.com`
await monday`automate: every morning, post standup summary to #engineering`

// Query for reporting
await monday`what shipped this week?`
await monday`what's at risk for Q1 deadline?`
await monday`velocity trend for last 4 sprints`
```

### AI Project Planning

Let AI break down projects:

```typescript
// Plan projects from descriptions
await monday`plan customer feedback system, deadline March 1, team: Alice Bob Carol`
  // AI creates: Phases, tasks, estimates, dependencies, resource allocation

// Let AI manage sprints
await monday`plan next sprint from backlog`
await monday`what can we realistically deliver by March 1?`
await monday`create release plan for v2.0`

// Risk identification
await monday`what are the risks for Q1 delivery?`
await monday`which items are blocking the most work?`
```

### AI Board Creation

Create boards from descriptions:

```typescript
// Just describe what you need
const board = await monday`
  hiring pipeline board:
  - stages: Phone Screen, Technical, Team Interview, Offer
  - track: Recruiter, Hiring Manager, Salary Expectations, Start Date
  - automate: notify hiring manager when candidate advances
`

// AI creates board with appropriate column types, status labels, groups, and automations
```

### Natural Language Queries

Query your boards conversationally:

```typescript
// Just ask
const stuck = await monday`what items are stuck and why?`
const capacity = await monday`who has bandwidth for more work?`
const forecast = await monday`will we hit the Q1 deadline?`
const blockers = await monday`what's blocking the mobile app project?`
const trends = await monday`how has velocity changed over the last month?`
```

## Automations

Powerful automation engine without limits:

```typescript
// Simple automations
await monday`automate: when Status = Done, notify Owner`
await monday`automate: when Priority = Critical, add to Critical Items board`
await monday`automate: when assigned, send welcome email to Owner`

// Complex automations with conditions
await monday`automate: when Status = Stuck and Priority = Critical, escalate to manager and notify #leadership`

// Time-based automations
await monday`automate: every Monday at 9am, send weekly digest to team@company.com`
await monday`automate: every day at 5pm, remind owners of items due tomorrow`

// Dependency automations
await monday`automate: when all dependencies done, set Status = Ready and notify Owner`
await monday`automate: when blocked, find and notify blocking item owners`
```

### Integration Recipes

Pre-built integrations as natural language:

```typescript
// Slack integration
await monday`automate: when Status changes, post to #project-updates`
await monday`automate: when item stuck for 2 days, alert #engineering`

// GitHub integration
await monday`automate: when PR merged, set Status = Done`
await monday`automate: when commit mentions item, add link to item`

// Calendar integration
await monday`automate: when Timeline set, create calendar event for Owner`
await monday`automate: when due date approaching, send calendar reminder`

// Email integration
await monday`automate: when Status = Done, email stakeholders`
```

## API Compatible

Full monday.com API compatibility:

```typescript
// GraphQL API (like monday.com)
POST /v2

// Queries
query {
  boards(ids: [123]) {
    name
    items {
      name
      column_values {
        id
        value
      }
    }
  }
}

// Mutations
mutation {
  create_item(
    board_id: 123
    item_name: "New Task"
    column_values: "{\"status\": \"Working on it\"}"
  ) {
    id
  }
}
```

Existing monday.com SDK code works:

```typescript
import mondaySdk from 'monday-sdk-js'

const monday = mondaySdk()
monday.setApiVersion('2024-01')
monday.setToken(process.env.MONDAY_TOKEN)

// Just set custom URL
monday.setUrl('https://your-org.monday.do')

const { data } = await monday.api(`
  query {
    boards { id name }
  }
`)
```

## Architecture

### Durable Object per Board

Each board runs independently:

```
WorkspaceDO (users, permissions, global config)
  |
  +-- BoardDO:product-dev (board items, columns, views)
  |     +-- SQLite: items, column_values, subitems
  |     +-- WebSocket: real-time updates
  |
  +-- BoardDO:engineering (another board)
  +-- DashboardDO:exec-overview (aggregated widgets)
  +-- AutomationDO (automation engine, schedules)
```

### Real-Time Updates

Every change syncs instantly:

```typescript
// Subscribe to changes naturally
await monday`watch Product Development board`
  .on('item.created', item => console.log(`New: ${item.name}`))
  .on('status.changed', item => console.log(`${item.name} is now ${item.status}`))

// Presence awareness
await monday`who's viewing Product Development?`
```

### Storage Architecture

```typescript
// Hot: SQLite in Durable Object
// Active boards, recent items, current sprints

// Warm: R2 object storage
// Completed items, attachments, history

// Cold: R2 archive
// Archived boards, compliance data
```

## Migration from monday.com

Import your existing workspace:

```bash
npx monday-do migrate \
  --token=your_monday_api_token \
  --workspace=your_workspace_id
```

Imports:
- All boards and items
- Column configurations
- Groups and ordering
- Views and filters
- Automations
- Dashboards
- Team members and permissions

## Roadmap

- [x] Boards and items with all column types
- [x] Groups and subitems
- [x] All view types
- [x] Automations (unlimited)
- [x] Dashboards
- [x] Real-time collaboration
- [x] GraphQL API compatibility
- [x] AI work assignment and planning
- [ ] Apps marketplace
- [ ] Workdocs (rich documents)
- [ ] Forms
- [ ] Time tracking
- [ ] Resource management
- [ ] monday.com import (full fidelity)

## Why Open Source?

Work management is too critical for vendor lock-in:

1. **Your processes** - How you work is competitive advantage
2. **Your automations** - Business logic encoded in workflows
3. **Your data** - Projects, timelines, and history
4. **Your AI** - Intelligence on your work should be yours

monday.com showed the world what visual work management could be. **monday.do** makes it open, unlimited, and AI-orchestrated.

## Contributing

monday.do is open source under the MIT license.

We especially welcome contributions from:
- Project managers and team leads
- Productivity tool enthusiasts
- Automation engineers
- UI/UX designers

```bash
git clone https://github.com/dotdo/monday.do
cd monday.do
pnpm install
pnpm test
```

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>The $10B valuation ends here.</strong>
  <br />
  Natural language. AI-first. Unlimited automations.
  <br /><br />
  <a href="https://monday.do">Website</a> |
  <a href="https://docs.monday.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/monday.do">GitHub</a>
</p>
