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

## AI-Native API

```typescript
import { asana } from 'asana.do'           // Full SDK
import { asana } from 'asana.do/tiny'      // Minimal client
import { asana } from 'asana.do/goals'     // Goals-focused operations
```

Natural language for work management:

```typescript
import { asana } from 'asana.do'

// Talk to it like a colleague
const blocked = await asana`what's blocking the mobile app?`
const capacity = await asana`does engineering have bandwidth?`
const priorities = await asana`what should I focus on today?`

// Chain like sentences
await asana`overdue tasks in Q1 Launch`
  .map(task => asana`notify assignee of ${task}`)

// Tasks that delegate themselves
await asana`new feature requests this week`
  .analyze()         // AI categorizes and estimates
  .assign()          // best-fit team members
  .schedule()        // realistic timelines
```

**Promise pipelining - chain work without Promise.all:**

```typescript
// Goal tracking pipeline
await asana`Q1 goals`
  .map(goal => asana`analyze progress on ${goal}`)
  .map(goal => asana`update status for ${goal}`)
  .notify(`Q1 goal status updated`)

// Task delegation pipeline
await asana`new tasks in backlog`
  .map(task => asana`estimate ${task}`)
  .map(task => asana`assign ${task} to best fit`)
  .map(task => asana`add ${task} to current sprint`)
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Tasks

The atomic unit of work:

```typescript
// Create tasks naturally
await asana`create "Implement user authentication" for Alice due Jan 20`
await asana`add OAuth2 flow task - Google SSO, GitHub SSO, email fallback`

// Subtasks just work
await asana`add subtask "Set up OAuth providers" due Jan 15 to auth task`
await asana`add subtask "Implement session management" due Jan 18 to auth task`

// Dependencies read like speech
await asana`session management depends on OAuth setup`
await asana`payment integration blocked by legal review`
```

### Projects

Organize tasks into projects:

```typescript
// Create projects naturally
await asana`create project "Backend Q1 2025" for engineering owned by Alice`
await asana`add sections Backlog, Ready, In Progress, In Review, Done to Backend Q1`

// Set up custom fields
await asana`add priority field to Backend Q1 with Low, Medium, High, Critical`
await asana`add points field to Backend Q1`
await asana`add sprint field to Backend Q1 with Sprint 1, Sprint 2, Sprint 3`
```

### Views

Multiple ways to see your work:

```typescript
// Query views naturally
await asana`my incomplete tasks sorted by due date`
await asana`Backend Q1 board view`
await asana`Backend Q1 timeline with dependencies`
await asana`my calendar for this month`
await asana`engineering workload next 4 weeks`
```

### Portfolios

See across all projects:

```typescript
// Create portfolios naturally
await asana`create portfolio "Q1 2025 Initiatives" for CTO`
await asana`add Backend Q1, Frontend Q1, Mobile Q1, Infrastructure Q1 to Q1 portfolio`

// Query portfolio views
await asana`Q1 portfolio by status`
await asana`Q1 portfolio timeline with milestones`
await asana`projects at risk in Q1 portfolio`
```

### Goals

Align work to outcomes:

```typescript
// Create goals naturally
await asana`create goal "Reach $10M ARR" for 2025 owned by CEO`
await asana`current ARR is $5.2M target is $10M`

// Team goals cascade automatically
await asana`create goal "Launch enterprise features" for Q1 supporting $10M ARR`
await asana`link Backend Q1 to enterprise features goal`

// Check goal progress
await asana`Q1 goals progress`
await asana`goals at risk`
await asana`how are we tracking to $10M ARR?`
```

## AI-Native Work Management

AI doesn't just help - it coordinates.

### AI Task Creation

Describe work naturally:

```typescript
// Just describe the work - AI creates the tasks
await asana`
  We need to launch the new pricing page.
  Alice should design the page by Friday.
  Bob needs to implement it, depends on design.
  Carol will write the copy, can start now.
  Dave does QA before launch.
`

// AI extracts assignees, maps dependencies, infers due dates
```

### AI Project Planning

Let AI structure your project:

```typescript
// Describe what you need - get a full plan
await asana`plan customer feedback portal for Alice Bob Carol by March 1`
  .breakdown()   // phases, milestones, dependencies
  .assign()      // best-fit team members
  .schedule()    // realistic timelines
```

### AI Task Assignment

Smart work distribution:

```typescript
// AI assigns based on expertise, workload, availability
await asana`assign new auth task to best fit on engineering`

// Or let AI rebalance the team
await asana`rebalance engineering workload`

// Check capacity before assigning
await asana`who can take the payment integration?`
```

### AI Goal Tracking

AI monitors and reports on goals:

```typescript
// Check goal health
await asana`how is $10M ARR goal tracking?`
await asana`goals at risk this quarter`
await asana`what's impacting enterprise features goal?`

// Get recommendations
await asana`recommendations for Q1 goals`
```

### AI Status Updates

Never write another status update:

```typescript
// Generate updates from work activity
await asana`Backend Q1 status update for stakeholders`
await asana`weekly summary for engineering`
await asana`Q1 portfolio executive summary`

// AI writes the narrative from actual work data
```

### Natural Language Queries

Query your work naturally:

```typescript
await asana`what's blocking the mobile app?`
await asana`does engineering have bandwidth?`
await asana`will we hit the Q1 launch date?`
await asana`what should I focus on today?`
```

## Inbox & My Tasks

Personal work management:

```typescript
// Your inbox
await asana`my unread notifications`
await asana`tasks assigned to me this week`
await asana`mentions and comments`

// My Tasks sections
await asana`my tasks for today`
await asana`upcoming tasks`
await asana`move auth task to Today`
await asana`snooze payment task until Monday`
```

## Rules (Automations)

Automate repetitive work:

```typescript
// Set up rules naturally
await asana`when task completed move to Done section`
await asana`when due date is tomorrow notify assignee`
await asana`when task added to Urgent set priority Critical and notify #support-urgent`

// Chain automations with pipelining
await asana`overdue tasks in support-queue`
  .map(task => asana`escalate ${task} to manager`)
  .map(task => asana`notify customer about ${task}`)
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
await asana`watch Backend Q1 for changes`
  .on('task:created', task => console.log('New task:', task))
  .on('task:completed', task => console.log('Done:', task))
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
