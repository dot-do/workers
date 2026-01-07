# monday.do

> Work OS. Open source. AI-orchestrated.

Monday.com built a $10B+ company on colorful boards and "work operating system" marketing. At $12-24/user/month, with core features locked behind higher tiers and AI as yet another add-on, it's a lot of money for project visualization.

**monday.do** is the Work OS reimagined. Visual project management with AI that actually manages work. Automations that write themselves. Cross-team visibility without cross-team pricing.

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
import { priya, ralph, quinn } from 'agents.do'

// Talk to your work OS like a human
const stuck = await monday`what items are stuck and why?`
const capacity = await monday`who has bandwidth for more work?`
const forecast = await monday`will we hit the Q1 deadline?`
```

**Promise pipelining - chain work without Promise.all:**

```typescript
// Sprint planning pipeline
const planned = await monday`get backlog items`
  .map(item => priya`prioritize ${item} for sprint`)
  .map(item => ralph`estimate ${item}`)
  .map(item => monday`add ${item} to ${sprint}`)

// Status update pipeline
const updated = await monday`get items completed this week`
  .map(item => mark`write status update for ${item}`)
  .map(update => monday`post ${update} to board`)
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Boards & Items

The foundation of work management:

```typescript
import { Board, Item, Group } from 'monday.do'

// Create a board
const projectBoard = Board.create({
  name: 'Product Development',
  type: 'items',  // or 'projects', 'docs'
  columns: {
    Status: Column.status({
      labels: ['Not Started', 'Working on it', 'Stuck', 'Done'],
      colors: ['gray', 'blue', 'red', 'green'],
    }),
    Owner: Column.person(),
    Priority: Column.status({
      labels: ['Low', 'Medium', 'High', 'Critical'],
      colors: ['gray', 'yellow', 'orange', 'red'],
    }),
    Timeline: Column.timeline(),
    Budget: Column.numbers({ unit: '$' }),
    Progress: Column.progress(),
    Tags: Column.tags(),
    Dependency: Column.dependency(),
    LastUpdated: Column.lastUpdated(),
  },
})

// Add groups and items
const q1Features = Group.create(projectBoard, {
  title: 'Q1 Features',
  color: '#0086c0',
})

await Item.create(projectBoard, {
  group: q1Features,
  name: 'Authentication Revamp',
  Status: 'Working on it',
  Owner: ['@alice'],
  Priority: 'High',
  Timeline: { start: '2025-01-15', end: '2025-02-15' },
  Budget: 50000,
})
```

### Column Types

All the column types you need:

| Type | Description |
|------|-------------|
| **Status** | Customizable status labels with colors |
| **Person** | Assign team members |
| **Timeline** | Date ranges with Gantt visualization |
| **Date** | Single date picker |
| **Numbers** | Numeric values with units |
| **Text** | Free-form text |
| **Long Text** | Rich text editor |
| **Tags** | Multi-select tags |
| **Dropdown** | Single select dropdown |
| **Files** | File attachments |
| **Link** | URLs with preview |
| **Checkbox** | Boolean checkbox |
| **Progress** | Progress tracking (0-100%) |
| **Rating** | Star ratings |
| **Vote** | Voting mechanism |
| **World Clock** | Timezone display |
| **Location** | Geographic locations |
| **Dependency** | Item dependencies |
| **Mirror** | Mirror data from connected boards |
| **Formula** | Calculated columns |
| **Auto Number** | Auto-incrementing IDs |
| **Creation Log** | Who created when |
| **Last Updated** | Last modification time |

### Views

Same data, different perspectives:

```typescript
// Main Table View (default)
const tableView = View.table({
  columns: ['Name', 'Status', 'Owner', 'Priority', 'Timeline'],
  sort: [{ column: 'Priority', order: 'desc' }],
  filter: { Status: { not: 'Done' } },
})

// Timeline View (Gantt)
const timelineView = View.timeline({
  dateColumn: 'Timeline',
  groupBy: 'Owner',
  color: 'Priority',
})

// Kanban View
const kanbanView = View.kanban({
  groupBy: 'Status',
  subItems: true,
})

// Calendar View
const calendarView = View.calendar({
  dateColumn: 'Timeline',
  color: 'Priority',
})

// Chart View
const chartView = View.chart({
  type: 'bar',
  xAxis: 'Status',
  yAxis: { type: 'count' },
  groupBy: 'Priority',
})

// Workload View
const workloadView = View.workload({
  personColumn: 'Owner',
  effortColumn: 'Effort',
  dateColumn: 'Timeline',
  capacity: 40,  // hours per week
})

// Dashboard View
const dashboardView = View.dashboard({
  widgets: [
    Widget.numbers({ column: 'Budget', aggregate: 'sum' }),
    Widget.chart({ column: 'Status', type: 'pie' }),
    Widget.battery({ column: 'Progress' }),
    Widget.timeline({ column: 'Timeline' }),
  ],
})
```

### Dashboards

Aggregate data across boards:

```typescript
import { Dashboard, Widget } from 'monday.do'

const executiveDashboard = Dashboard.create({
  name: 'Executive Overview',
  widgets: [
    Widget.numbers({
      title: 'Total Projects',
      boards: ['product-dev', 'engineering', 'marketing'],
      value: 'count',
    }),
    Widget.chart({
      title: 'Status Breakdown',
      boards: ['product-dev', 'engineering'],
      type: 'pie',
      groupBy: 'Status',
    }),
    Widget.timeline({
      title: 'All Projects Timeline',
      boards: ['product-dev'],
      dateColumn: 'Timeline',
    }),
    Widget.battery({
      title: 'Overall Progress',
      boards: ['q1-goals'],
      column: 'Progress',
    }),
    Widget.table({
      title: 'At Risk Items',
      boards: ['product-dev', 'engineering'],
      filter: { Status: 'Stuck' },
      columns: ['Name', 'Owner', 'Status', 'Timeline'],
    }),
  ],
})
```

### Subitems

Break work into smaller pieces:

```typescript
const feature = await Item.create(board, {
  name: 'User Dashboard',
  Status: 'Working on it',
})

// Add subitems
await feature.addSubitem({
  name: 'Design mockups',
  Status: 'Done',
  Owner: ['@designer'],
})

await feature.addSubitem({
  name: 'Backend API',
  Status: 'Working on it',
  Owner: ['@backend'],
})

await feature.addSubitem({
  name: 'Frontend implementation',
  Status: 'Not Started',
  Owner: ['@frontend'],
})

// Parent progress auto-calculates from subitems
```

## AI-Native Work OS

AI doesn't just assist - it orchestrates.

### AI Automations

Automations that write themselves:

```typescript
import { ai, Automation } from 'monday.do'

// Describe what you want in natural language
const automation = await ai.createAutomation(`
  When an item's status changes to "Done",
  notify the item owner on Slack,
  and if all subitems are also done,
  move the parent item to the "Completed" group.
`)

// AI generates:
Automation.create({
  trigger: Trigger.columnChange('Status', 'Done'),
  actions: [
    Action.notify({
      channel: 'slack',
      to: '{Owner}',
      message: '{Item Name} has been completed!',
    }),
    Action.conditional({
      if: 'all subitems.Status = Done',
      then: Action.moveToGroup('Completed'),
    }),
  ],
})
```

### AI Work Assignment

Let AI assign work intelligently:

```typescript
const assignment = await ai.assignWork({
  item: newFeature,
  considerations: {
    expertise: true,      // Match skills to task
    workload: true,       // Consider current load
    availability: true,   // Check calendar/PTO
    history: true,        // Past performance on similar tasks
  },
})

// Returns:
{
  recommendation: '@alice',
  confidence: 0.89,
  reasoning: 'Alice has completed 12 similar frontend tasks with average 2-day lead time. Current workload is 65% capacity. Available all week.',
  alternatives: [
    { person: '@bob', score: 0.72, note: 'Good fit but at 85% capacity' },
  ],
}
```

### AI Status Updates

AI writes status updates from activity:

```typescript
// Generate weekly status update from board activity
const statusUpdate = await ai.generateStatusUpdate({
  board: 'product-dev',
  period: 'last 7 days',
  format: 'executive',  // or 'detailed', 'bullet-points'
})

// Returns:
`
## Product Development - Week of Jan 13

### Completed (5 items)
- Authentication revamp shipped to production
- Payment integration testing complete
- 3 bug fixes deployed

### In Progress (8 items)
- User dashboard at 60% (on track for Jan 24)
- API rate limiting implementation started

### At Risk (2 items)
- Mobile app redesign blocked on design approval
- Third-party integration waiting on vendor response

### Key Metrics
- Velocity: 34 story points (up 15% from last week)
- Cycle time: 3.2 days average
- Items blocked: 2 (down from 5)
`
```

### AI Project Planning

Let AI break down projects:

```typescript
const projectPlan = await ai.planProject({
  description: 'Build a customer feedback system',
  constraints: {
    deadline: '2025-03-01',
    team: ['@alice', '@bob', '@carol'],
    budget: 75000,
  },
  style: 'agile',  // or 'waterfall', 'kanban'
})

// Returns structured plan with:
// - Phases and milestones
// - Tasks with estimates
// - Dependencies mapped
// - Resource allocation
// - Risk identification
```

### AI Board Creation

Create boards from descriptions:

```typescript
const board = await ai.createBoard(`
  I need to track our hiring pipeline.
  We interview candidates, they go through phone screen,
  technical interview, team interview, offer stage.
  Need to track recruiter, hiring manager, salary expectations.
`)

// AI creates board with appropriate:
// - Column types
// - Status labels
// - Groups
// - Automations
```

### Natural Language Queries

Query your boards conversationally:

```typescript
import { ai } from 'monday.do'

const stuck = await ai.query`what items are stuck and why?`
const capacity = await ai.query`who has bandwidth to take on more work?`
const forecast = await ai.query`will we hit the Q1 deadline?`
const blockers = await ai.query`what's blocking the mobile app project?`
```

## Automations

Powerful automation engine without limits:

```typescript
import { Automation, Trigger, Action, Condition } from 'monday.do'

// Simple automation
const notifyOnDone = Automation.create({
  name: 'Notify on completion',
  trigger: Trigger.columnChange('Status', 'Done'),
  actions: [
    Action.notify({ to: '{Owner}', message: 'Item completed!' }),
  ],
})

// Complex automation with conditions
const escalateStuck = Automation.create({
  name: 'Escalate stuck items',
  trigger: Trigger.columnChange('Status', 'Stuck'),
  conditions: [
    Condition.column('Priority', 'is', 'Critical'),
  ],
  actions: [
    Action.assignPerson('{Manager}'),
    Action.notify({ to: '#leadership', channel: 'slack' }),
    Action.createItem({
      board: 'escalations',
      name: 'Escalation: {Item Name}',
      link: '{Item Link}',
    }),
  ],
})

// Time-based automation
const weeklyDigest = Automation.create({
  name: 'Weekly digest',
  trigger: Trigger.recurring({ day: 'Monday', time: '09:00' }),
  actions: [
    Action.sendEmail({
      to: 'team@company.com',
      template: 'weekly-digest',
      data: {
        completed: '{{ items where Status = Done and updated_at > 7 days ago }}',
        inProgress: '{{ items where Status = Working on it }}',
        upcoming: '{{ items where Status = Not Started and Timeline starts within 7 days }}',
      },
    }),
  ],
})

// Dependency automation
const startWhenReady = Automation.create({
  name: 'Start when dependencies done',
  trigger: Trigger.allDependenciesDone(),
  actions: [
    Action.setColumn('Status', 'Working on it'),
    Action.notify({ to: '{Owner}', message: 'Dependencies complete - ready to start!' }),
  ],
})
```

### Integration Recipes

Pre-built integrations:

```typescript
// Slack integration
Automation.recipe('slack-notify', {
  trigger: Trigger.columnChange('Status'),
  action: Action.slackMessage({
    channel: '#project-updates',
    message: '{Person} updated {Item Name} to {Status}',
  }),
})

// GitHub integration
Automation.recipe('github-sync', {
  trigger: Trigger.githubPR({ action: 'merged' }),
  action: Action.setColumn('Status', 'Done'),
})

// Calendar integration
Automation.recipe('calendar-sync', {
  trigger: Trigger.columnChange('Timeline'),
  action: Action.createCalendarEvent({
    calendar: '{Owner}',
    title: '{Item Name}',
    dates: '{Timeline}',
  }),
})
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
// Subscribe to board changes
board.subscribe((event) => {
  switch (event.type) {
    case 'item.created':
    case 'item.updated':
    case 'column_value.changed':
    case 'item.moved':
      // Update UI instantly
  }
})

// Presence awareness
board.onPresence((users) => {
  // Show who's viewing the board
})
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

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- Column types and views
- Automation engine
- AI capabilities
- API compatibility
- Integrations

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>monday.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://monday.do">Website</a> | <a href="https://docs.monday.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
