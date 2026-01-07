# asana.do

> Work management. AI-coordinated. Open source.

Asana pioneered modern work management. Tasks, projects, portfolios, goals - the whole hierarchy of getting things done. At $10.99-24.99/user/month, with premium features behind higher tiers and AI as another add-on, it's become expensive coordination tax.

**asana.do** is work management reimagined. AI coordinates your work across teams. Goals cascade automatically. Tasks self-organize. The work manages itself.

## The Problem

Asana's tiered pricing:

| Plan | Price | What's Missing |
|------|-------|----------------|
| Basic | Free | Views, timeline, portfolios, goals |
| Premium | $10.99/user/month | Portfolios, goals, resource mgmt |
| Business | $24.99/user/month | AI features, advanced reporting |
| Enterprise | Custom | SSO, advanced security |

**200-person company on Business?** That's **$59,976/year** for work management.

The hidden costs:
- **Goal tracking is Premium** - The whole point of work is locked behind paywall
- **Portfolio views are Premium** - Can't see across projects without upgrading
- **AI is Business-only** - The features that save time cost the most
- **Guest limits** - External collaborators count toward seats
- **Integration limits** - Good integrations require higher tiers

## The Solution

**asana.do** is work management that works for you:

```
Traditional Asana              asana.do
-----------------------------------------------------------------
$10.99-24.99/user/month        $0 - run your own
AI as Business add-on          AI-native everywhere
Goals in Premium only          Goals included, AI-cascaded
Portfolios locked              Portfolios included
Their servers                  Your Cloudflare account
Limited integrations           Unlimited integrations
Proprietary                    Open source
```

## One-Click Deploy

```bash
npx create-dotdo asana
```

Your own Asana. Running on Cloudflare. AI that actually coordinates work.

```bash
# Or add to existing workers.do project
npx dotdo add asana
```

## The workers.do Way

You're building a product. Your team needs work coordination. Asana wants $60k/year with goals and portfolios locked behind premium tiers. AI is an afterthought. There's a better way.

**Natural language. Tagged templates. AI agents that work.**

```typescript
import { asana } from 'asana.do'
import { priya, ralph, quinn } from 'agents.do'

// Talk to your work manager like a human
const blocked = await asana`what's blocking the mobile app?`
const capacity = await asana`does the team have bandwidth?`
const priorities = await asana`what should I focus on today?`
```

**Promise pipelining - chain work without Promise.all:**

```typescript
// Goal tracking pipeline
const tracked = await asana`get Q1 goals`
  .map(goal => priya`analyze progress on ${goal}`)
  .map(goal => asana`update status for ${goal}`)
  .map(status => mark`write executive summary for ${status}`)

// Task delegation pipeline
const delegated = await asana`get new tasks`
  .map(task => priya`analyze requirements for ${task}`)
  .map(task => ralph`estimate ${task}`)
  .map(task => asana`assign ${task} to best fit`)
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Tasks

The atomic unit of work:

```typescript
import { Task, Project, Section } from 'asana.do'

// Create a task
const task = await Task.create({
  name: 'Implement user authentication',
  assignee: '@alice',
  dueDate: '2025-01-20',
  priority: 'high',
  description: `
    Implement OAuth2 authentication flow:
    - Google SSO
    - GitHub SSO
    - Email/password fallback
  `,
  projects: ['backend-q1'],
  tags: ['security', 'authentication'],
})

// Add subtasks
await task.addSubtask({
  name: 'Set up OAuth providers',
  assignee: '@alice',
  dueDate: '2025-01-15',
})

await task.addSubtask({
  name: 'Implement session management',
  assignee: '@alice',
  dueDate: '2025-01-18',
})

// Add dependencies
await task.addDependency(otherTask)
```

### Projects

Organize tasks into projects:

```typescript
const project = await Project.create({
  name: 'Backend Q1 2025',
  team: 'engineering',
  owner: '@alice',
  dueDate: '2025-03-31',
  template: 'software-development',
  defaultView: 'board',
  sections: [
    Section.create({ name: 'Backlog' }),
    Section.create({ name: 'Ready' }),
    Section.create({ name: 'In Progress' }),
    Section.create({ name: 'In Review' }),
    Section.create({ name: 'Done' }),
  ],
  customFields: {
    Priority: Field.dropdown(['Low', 'Medium', 'High', 'Critical']),
    Points: Field.number(),
    Sprint: Field.dropdown(['Sprint 1', 'Sprint 2', 'Sprint 3']),
  },
})
```

### Views

Multiple ways to see your work:

```typescript
// List View (default)
const listView = View.list({
  groupBy: 'section',
  sort: [{ field: 'dueDate', direction: 'asc' }],
  filter: { assignee: '@me', completed: false },
})

// Board View (Kanban)
const boardView = View.board({
  columns: 'section',
  cardFields: ['assignee', 'dueDate', 'priority'],
  swimlanes: 'assignee',
})

// Timeline View (Gantt)
const timelineView = View.timeline({
  dateField: 'dueDate',
  color: 'priority',
  showDependencies: true,
})

// Calendar View
const calendarView = View.calendar({
  dateField: 'dueDate',
  color: 'project',
})

// Workload View
const workloadView = View.workload({
  team: 'engineering',
  capacity: { type: 'points', perWeek: 40 },
  dateRange: { start: 'now', end: '+4 weeks' },
})
```

### Portfolios

See across all projects:

```typescript
import { Portfolio } from 'asana.do'

const q1Portfolio = await Portfolio.create({
  name: 'Q1 2025 Initiatives',
  owner: '@cto',
  projects: ['backend-q1', 'frontend-q1', 'mobile-q1', 'infrastructure-q1'],
  fields: [
    Field.status(),      // Project health
    Field.progress(),    // Completion percentage
    Field.date('dueDate'),
    Field.person('owner'),
    Field.custom('priority'),
    Field.custom('budget'),
  ],
})

// Portfolio views
const statusView = portfolio.view('status', {
  groupBy: 'status',
  sort: 'dueDate',
})

const timelineView = portfolio.view('timeline', {
  showMilestones: true,
  color: 'status',
})
```

### Goals

Align work to outcomes:

```typescript
import { Goal } from 'asana.do'

// Company goal
const companyGoal = await Goal.create({
  name: 'Reach $10M ARR by end of 2025',
  owner: '@ceo',
  timeframe: '2025',
  metric: {
    type: 'currency',
    current: 5200000,
    target: 10000000,
  },
})

// Team goal supporting company goal
const teamGoal = await Goal.create({
  name: 'Launch enterprise features',
  owner: '@pm',
  timeframe: 'Q1 2025',
  parent: companyGoal,
  supportingWork: [
    { type: 'project', id: 'enterprise-features' },
    { type: 'portfolio', id: 'q1-initiatives' },
  ],
  metric: {
    type: 'percentage',
    current: 0,
    target: 100,
    autoCalculate: 'from-projects',  // Progress from linked projects
  },
})

// Goals cascade automatically
// When projects complete, goal progress updates
// When goals update, parent goals recalculate
```

## AI-Native Work Management

AI doesn't just help - it coordinates.

### AI Task Creation

Describe work naturally:

```typescript
import { ai } from 'asana.do'

// Create tasks from natural language
const tasks = await ai.createTasks(`
  We need to launch the new pricing page.
  Alice should design the page by Friday.
  Bob needs to implement it, depends on design.
  Carol will write the copy, can start now.
  Dave does QA before launch.
`)

// AI creates structured tasks with:
// - Assignees extracted
// - Dependencies mapped
// - Due dates inferred
// - Subtasks where appropriate
```

### AI Project Planning

Let AI structure your project:

```typescript
const projectPlan = await ai.planProject({
  description: 'Build a customer feedback portal',
  team: ['@alice', '@bob', '@carol'],
  deadline: '2025-03-01',
  style: 'agile',
})

// Returns:
{
  phases: [
    {
      name: 'Discovery',
      duration: '1 week',
      tasks: [
        { name: 'User interviews', assignee: '@carol', points: 3 },
        { name: 'Competitive analysis', assignee: '@alice', points: 2 },
      ],
    },
    {
      name: 'Design',
      duration: '2 weeks',
      tasks: [/* ... */],
    },
    // ...
  ],
  milestones: [
    { name: 'Design Review', date: '2025-01-24' },
    { name: 'Beta Launch', date: '2025-02-14' },
    { name: 'Production Launch', date: '2025-03-01' },
  ],
  risks: [
    { risk: 'Third-party API integration', mitigation: 'Start early, have fallback' },
  ],
}
```

### AI Task Assignment

Smart work distribution:

```typescript
// When new task comes in
const assignment = await ai.assignTask(task, {
  team: 'engineering',
  factors: {
    expertise: true,     // Match skills to task
    workload: true,      // Current capacity
    availability: true,  // Calendar, PTO
    preference: true,    // Historical preferences
    development: true,   // Growth opportunities
  },
})

// Returns:
{
  recommended: '@alice',
  confidence: 0.91,
  reasoning: 'Best expertise match for auth work. Current load at 70%. No conflicts in timeline.',
  alternatives: [
    { person: '@bob', score: 0.78, note: 'Good skills, but already on 2 auth tasks' },
  ],
  considerations: [
    'Alice completed 8 similar tasks with 95% on-time rate',
    'Task aligns with her Q1 growth goal: security expertise',
  ],
}
```

### AI Goal Tracking

AI monitors and reports on goals:

```typescript
// AI analyzes goal progress
const goalAnalysis = await ai.analyzeGoal(revenueGoal, {
  depth: 'full',
  forecast: true,
  recommendations: true,
})

// Returns:
{
  status: 'at_risk',
  progress: 0.52,  // 52% to target
  timeElapsed: 0.75,  // 75% through timeframe
  forecast: {
    predicted: 8500000,  // Predicted end value
    probability: 0.65,   // 65% chance of hitting target
    trend: 'slowing',
  },
  contributing: [
    { project: 'enterprise-sales', impact: 'high', status: 'on_track' },
    { project: 'pricing-update', impact: 'medium', status: 'delayed' },
  ],
  recommendations: [
    'Pricing update is 2 weeks behind - consider adding resources',
    'Enterprise sales pipeline strong - accelerate onboarding',
  ],
  narrative: 'Revenue goal is at risk. While enterprise sales are performing well, the pricing page delay impacts our ability to capture mid-market customers. Recommend prioritizing pricing page launch.',
}
```

### AI Status Updates

Never write another status update:

```typescript
// Generate status update from work activity
const update = await ai.generateUpdate({
  scope: 'project',  // or 'portfolio', 'goal', 'team'
  project: 'backend-q1',
  period: 'this week',
  audience: 'stakeholders',
})

// Returns:
`
## Backend Q1 - Weekly Update (Jan 13-17)

### Summary
Strong progress this week with 12 tasks completed. Authentication module shipped to staging.

### Completed
- User authentication flow (shipped to staging)
- Database migration scripts
- API rate limiting implementation

### In Progress
- Payment integration (60% complete, on track)
- Admin dashboard backend

### Blockers
- Waiting on legal review for payment terms

### Next Week
- Complete payment integration
- Start caching layer implementation

### Metrics
- 12 tasks completed (up from 8 last week)
- 3 days average cycle time
- On track for Q1 deadline
`
```

### Natural Language Queries

Query your work naturally:

```typescript
const blocked = await ai.query`what's blocking the mobile app?`
const capacity = await ai.query`does the engineering team have bandwidth?`
const deadline = await ai.query`will we hit the Q1 launch date?`
const priorities = await ai.query`what should I focus on today?`
```

## Inbox & My Tasks

Personal work management:

```typescript
import { Inbox, MyTasks } from 'asana.do'

// Inbox - all notifications
const inbox = await Inbox.get({
  unread: true,
  types: ['assigned', 'mentioned', 'commented', 'liked'],
})

// My Tasks - personal organization
const myTasks = await MyTasks.get({
  sections: ['Recently Assigned', 'Today', 'Upcoming', 'Later'],
  sort: 'dueDate',
})

// Move between sections
await task.moveToSection('Today')

// Set personal due date (different from task due date)
await task.setMyDueDate('2025-01-15')
```

## Rules (Automations)

Automate repetitive work:

```typescript
import { Rule, Trigger, Action } from 'asana.do'

// Move to section based on status
const moveWhenDone = Rule.create({
  name: 'Move completed tasks',
  project: 'backend-q1',
  trigger: Trigger.fieldChange('completed', true),
  actions: [
    Action.moveToSection('Done'),
    Action.addComment('Moved to Done'),
  ],
})

// Notify on due date approaching
const dueDateReminder = Rule.create({
  name: 'Due date reminder',
  project: 'backend-q1',
  trigger: Trigger.dueDateApproaching({ days: 1 }),
  conditions: [
    Condition.field('completed', false),
  ],
  actions: [
    Action.notifyAssignee('Task due tomorrow: {task_name}'),
  ],
})

// Auto-assign based on section
const autoAssign = Rule.create({
  name: 'Auto-assign by section',
  project: 'support-queue',
  trigger: Trigger.taskAddedToSection('Urgent'),
  actions: [
    Action.setField('priority', 'Critical'),
    Action.addFollower('@oncall'),
    Action.notify({ channel: 'slack', to: '#support-urgent' }),
  ],
})
```

## API Compatible

Full Asana API compatibility:

```typescript
// REST API endpoints
GET    /api/1.0/tasks
POST   /api/1.0/tasks
GET    /api/1.0/tasks/{task_gid}
PUT    /api/1.0/tasks/{task_gid}
DELETE /api/1.0/tasks/{task_gid}

GET    /api/1.0/projects
GET    /api/1.0/portfolios
GET    /api/1.0/goals
GET    /api/1.0/teams
GET    /api/1.0/users
GET    /api/1.0/workspaces

POST   /api/1.0/webhooks
```

Existing Asana SDK code works:

```typescript
import Asana from 'asana'

const client = Asana.Client.create({
  defaultHeaders: { 'Asana-Enable': 'new_user_task_lists' },
}).useAccessToken(process.env.ASANA_TOKEN)

// Just override the base URL
client.dispatcher.url = 'https://your-org.asana.do'

const tasks = await client.tasks.findByProject(projectId)
```

## Architecture

### Durable Object per Workspace

```
WorkspaceDO (workspace config, teams, users)
  |
  +-- ProjectDO:backend-q1 (tasks, sections, views)
  |     +-- SQLite: tasks, subtasks, comments
  |     +-- WebSocket: real-time updates
  |
  +-- PortfolioDO:q1-initiatives (project aggregation)
  +-- GoalDO:company-2025 (goal hierarchy)
  +-- InboxDO:user-123 (notifications)
  +-- MyTasksDO:user-123 (personal organization)
```

### Real-Time Sync

All changes sync instantly:

```typescript
// Subscribe to project changes
project.subscribe((event) => {
  switch (event.type) {
    case 'task:created':
    case 'task:updated':
    case 'task:moved':
    case 'task:completed':
      // Update UI
  }
})
```

### Storage

```typescript
// Hot: SQLite in Durable Object
// Active tasks, recent activity

// Warm: R2 object storage
// Completed tasks, attachments

// Cold: R2 archive
// Old projects, compliance retention
```

## Migration from Asana

Import your existing Asana workspace:

```bash
npx asana-do migrate \
  --token=your_asana_pat \
  --workspace=your_workspace_gid
```

Imports:
- All projects and tasks
- Sections and custom fields
- Subtasks and dependencies
- Portfolios and goals
- Rules/automations
- Teams and users
- Task history and comments

## Roadmap

- [x] Tasks, subtasks, dependencies
- [x] Projects with sections
- [x] All view types (list, board, timeline, calendar)
- [x] Custom fields
- [x] Portfolios
- [x] Goals with cascading
- [x] Rules (automations)
- [x] REST API compatibility
- [x] AI task creation and assignment
- [ ] Forms
- [ ] Proofing
- [ ] Approvals
- [ ] Resource management
- [ ] Reporting
- [ ] Asana import (full fidelity)

## Why Open Source?

Work coordination is too important for rent-seeking:

1. **Your processes** - How work flows through your org
2. **Your goals** - Strategic alignment data
3. **Your history** - Decisions and outcomes over time
4. **Your AI** - Intelligence on your work should be yours

Asana showed the world what work management could be. **asana.do** makes it open, intelligent, and self-coordinating.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- Views and visualization
- Goal tracking and OKRs
- AI coordination features
- API compatibility
- Integrations

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>asana.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://asana.do">Website</a> | <a href="https://docs.asana.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
