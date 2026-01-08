# @dotdo/humans

Human-in-the-loop for approvals, reviews, and decisions.

## Overview

This worker manages human oversight in AI workflows. It provides task queues, multi-channel delivery, timeout management, and escalation for situations requiring human judgment.

**Binding:** `env.HUMANS`

## Installation

```bash
pnpm add @dotdo/humans
```

## Usage

Access via service binding:

```typescript
// Create an approval task
const task = await env.HUMANS.createTask({
  type: 'approval',
  title: 'Approve budget increase',
  context: { amount: 50000, department: 'Engineering' },
  assignee: 'cfo@company.com',
  priority: 'high',
  timeoutMs: 24 * 60 * 60 * 1000  // 24 hours
})

// Wait for response
const result = await env.HUMANS.getTask(task._id)
if (result.response?.decision === 'approve') {
  // Proceed with budget increase
}
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "HUMANS",
      "service": "worker-humans"
    }
  ]
}
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.HUMANS.createTask(input)` |
| REST | `POST /api/tasks` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'createTask', params: [...] }` |

## Task Types

| Type | Description | Example |
|------|-------------|---------|
| **approval** | Yes/no decisions | Budget approval, access request |
| **review** | Content review | Document review, PR review |
| **decision** | Multiple choice | Select vendor, choose option |
| **input** | Free-form input | Additional information, clarification |
| **escalation** | Escalated from agent | Complex issues, edge cases |

## Core Methods

### Task Creation

```typescript
const task = await env.HUMANS.createTask({
  type: 'approval',
  title: 'Approve expense report',
  description: 'Employee expense report for Q4 travel',
  context: { total: 5000, receipts: [...] },
  assignee: 'manager@company.com',
  priority: 'normal',
  timeoutMs: 48 * 60 * 60 * 1000
})
```

### Task Retrieval

```typescript
// Get single task
const task = await env.HUMANS.getTask(taskId)

// List tasks with filters
const tasks = await env.HUMANS.listTasks({
  status: 'pending',
  assignee: 'user@company.com',
  priority: 'high'
})
```

### Assignment

```typescript
// Assign
await env.HUMANS.assignTask(taskId, 'new-assignee@company.com')

// Unassign
await env.HUMANS.unassignTask(taskId)

// Reassign
await env.HUMANS.reassignTask(taskId, 'other@company.com')

// Bulk assign
await env.HUMANS.assignMultiple([taskId1, taskId2], 'assignee@company.com')
```

### Response Handling

```typescript
// Approve
await env.HUMANS.approve(taskId, 'Looks good', 'approver@company.com')

// Reject
await env.HUMANS.reject(taskId, 'Needs more detail', 'reviewer@company.com')

// Defer
await env.HUMANS.defer(taskId, 'Need more information', 'assignee@company.com')

// Submit input
await env.HUMANS.submitInput(taskId, { answer: 'Custom response' }, 'user@company.com')

// Decision with rationale
await env.HUMANS.decide(taskId, 'option-b', 'Better long-term value', 'decider@company.com')
```

### Queue Operations

```typescript
// Get work queue (sorted by priority + age)
const queue = await env.HUMANS.getQueue('user@company.com')

// Get pending count
const count = await env.HUMANS.getPendingCount('user@company.com')

// Get my assigned tasks
const myTasks = await env.HUMANS.getMyTasks('me@company.com')
```

### Timeout Management

```typescript
// Set timeout
await env.HUMANS.setTaskTimeout(taskId, 24 * 60 * 60 * 1000)

// Extend timeout
await env.HUMANS.extendTimeout(taskId, 12 * 60 * 60 * 1000)

// Clear timeout
await env.HUMANS.clearTaskTimeout(taskId)

// Get expired tasks
const expired = await env.HUMANS.getExpiredTasks()

// Get tasks expiring soon
const expiring = await env.HUMANS.getExpiringTasks(60 * 60 * 1000)  // Within 1 hour
```

### Escalation

```typescript
await env.HUMANS.escalate(taskId, 'supervisor@company.com', 'Needs executive approval')
```

## Task Status

| Status | Description |
|--------|-------------|
| `pending` | Created, awaiting assignment or response |
| `assigned` | Assigned to a human |
| `in_progress` | Human is actively working |
| `completed` | Approved or input received |
| `rejected` | Rejected by human |
| `expired` | Timeout exceeded |

## Priority Levels

| Priority | Description |
|----------|-------------|
| `urgent` | Immediate attention required |
| `high` | Important, respond within hours |
| `normal` | Standard priority |
| `low` | Handle when convenient |

## Architecture

`workers/humans` is one of four function execution backends:

```
workers/functions (umbrella)
    ├── workers/eval     → Code functions
    ├── workers/ai       → Generative functions
    ├── workers/agents   → Agentic functions
    └── workers/humans   → Human functions (this worker)
```

## Channels (Future)

Human tasks will be delivered via multiple channels:

- **Slack** - Interactive messages with buttons
- **Email** - Structured emails with action links
- **SMS** - For urgent approvals
- **Web** - Dashboard interface
- **Teams** - Microsoft Teams integration

## Testing

```bash
pnpm test
```

## License

MIT
