# tasks.do

**Tasks that manage themselves.**

```bash
npm install tasks.do
```

---

## Your Tasks Are Scattered Everywhere

You have work that needs to get done. Customer requests. Bug fixes. Content creation. Approvals.

But managing tasks across teams and tools means:
- Task sprawl across Slack, email, Jira, spreadsheets
- Unclear assignments - who owns what?
- Deadlines missed because nobody was watching
- AI can't help because it has no access to your task system
- Context lost every time a task changes hands

**Your work deserves better than chaos and confusion.**

## What If Tasks Just Got Done?

```typescript
import { tasks } from 'tasks.do'

// Describe what you want in plain English
const task = await tasks.do`
  Review the Q4 marketing report,
  extract key metrics,
  then schedule a follow-up meeting with stakeholders
`

// Or create with full control
const review = await tasks.create({
  title: 'Review Q4 Report',
  description: 'Summarize key findings from quarterly data',
  assignee: 'ai:analyst',
  priority: 'high',
  dueAt: '2024-12-31'
})

// Assign to AI or human
await tasks.assign(review.id, { to: 'ai:analyst' })
await tasks.assign(review.id, { to: 'user:alice@example.com' })

// Track and complete
await tasks.complete(review.id, {
  output: { summary: 'Revenue up 15%, costs down 8%' }
})
```

**tasks.do** gives you:
- Unified task management for AI and humans
- Intelligent assignment to the right entity
- Automatic tracking, reminders, and escalation
- Full context preserved across handoffs
- Dependencies that actually work

## Manage Tasks in 3 Steps

### 1. Create Your Task

```typescript
import { tasks } from 'tasks.do'

// Natural language for quick tasks
const task = await tasks.do`
  Analyze customer feedback from last month
  and identify top 3 pain points
`

// Full control for complex work
const complex = await tasks.create({
  title: 'Quarterly Business Review',
  description: 'Prepare QBR presentation for enterprise accounts',
  priority: 'high',
  dueAt: new Date('2024-12-15'),
  labels: ['enterprise', 'quarterly'],
  metadata: {
    accounts: ['acme-corp', 'globex'],
    template: 'qbr-2024'
  }
})
```

### 2. Assign to AI or Human

```typescript
// Assign to an AI agent
await tasks.assign(task.id, { to: 'ai:analyst' })

// Assign to a human
await tasks.assign(task.id, { to: 'user:alice@example.com' })

// Assign to a team (routes to first available)
await tasks.assign(task.id, { to: 'team:customer-success' })

// Reassign with context
await tasks.assign(task.id, {
  to: 'user:bob@example.com',
  notes: 'Alice is OOO, Bob to take over'
})
```

### 3. Track and Complete

```typescript
// Check status anytime
const status = await tasks.get(task.id)
console.log(status.status) // 'in_progress'
console.log(status.assignee) // { type: 'ai', id: 'analyst' }

// Add comments for context
await tasks.comment(task.id, 'Started analysis, 47 reviews to process')

// Complete with output
await tasks.complete(task.id, {
  output: {
    summary: 'Analysis complete',
    painPoints: ['Slow onboarding', 'Missing features', 'Price concerns'],
    recommendations: ['Streamline signup', 'Build feature X', 'Add starter tier']
  }
})
```

## The Difference

**Without tasks.do:**
- Tasks lost in Slack threads
- "Who's working on this?"
- AI can't see or manage work
- Context lost on every handoff
- Deadlines silently missed
- Manual status updates everywhere

**With tasks.do:**
- One source of truth for all work
- Clear ownership always
- AI and humans work together
- Full context preserved
- Automatic tracking and alerts
- Status updates in real-time

## Everything You Need

```typescript
// Subtasks for complex work
const subtasks = await tasks.subtasks(task.id)
await tasks.subtasks(task.id, {
  create: { title: 'Review section 1', assignee: 'ai:reviewer' }
})

// Dependencies that work
await tasks.dependencies(task.id, {
  add: { blockedBy: 'task_456', type: 'blocks' }
})

// Find ready work
const ready = await tasks.ready({ assignee: 'ai:*' })

// See what's blocked
const blocked = await tasks.blocked()

// Catch overdue items
const overdue = await tasks.overdue({ priority: ['critical', 'high'] })

// Workflow integration
await tasks.start(task.id)    // Begin work
await tasks.block(task.id, 'Waiting for approval')
await tasks.unblock(task.id)
await tasks.cancel(task.id, 'No longer needed')
await tasks.reopen(task.id)   // Changed our mind
```

## Task States

| Status | Description |
|--------|-------------|
| `pending` | Task created, not yet assigned |
| `assigned` | Task assigned, work not started |
| `in_progress` | Actively being worked on |
| `blocked` | Work paused due to dependency or issue |
| `review` | Work complete, awaiting review |
| `completed` | Task finished successfully |
| `cancelled` | Task cancelled, no longer needed |

## Priority Levels

| Priority | Use For |
|----------|---------|
| `critical` | Outages, security issues, revenue impact |
| `high` | Important deadlines, customer-facing |
| `medium` | Standard work, planned features |
| `low` | Nice to have, when time permits |

## Installation

```bash
npm install tasks.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { tasks } from 'tasks.do'

// Or use the factory for custom config
import { Tasks } from 'tasks.do'
const tasks = Tasks({ baseURL: 'https://custom.example.com' })

// Default import also works
import tasks from 'tasks.do'
```

## Configuration

Set `DO_API_KEY` or `ORG_AI_API_KEY` in your environment for authentication.

## Stop Losing Track of Work

Tasks don't have to fall through the cracks. Create them once, assign them intelligently, track them automatically.

**Your work should get done, not get lost.**

```bash
npm install tasks.do
```

[Start managing at tasks.do](https://tasks.do)

---

MIT License
