# Human Service - Human-in-the-Loop Function Execution

Type-safe human-in-the-loop function execution with routing, UI components, and lifecycle hooks.

## Overview

The Human Service enables AI agents and automated systems to seamlessly delegate tasks to humans when needed. It provides a complete type-safe framework for:

- **Function Definitions** - Define what needs human input with Zod schemas
- **Routing** - Route tasks to appropriate humans via multiple channels
- **UI Components** - React components for prompt, form, and review interfaces
- **Lifecycle Hooks** - Handle timeouts, escalations, and completions
- **Task Management** - Create, track, respond to, and monitor tasks

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Human Function Definition                 │
│  - Name, description                                         │
│  - Input/output schemas (Zod)                               │
│  - Routing config (channels, assignees, SLA)                │
│  - UI components (React)                                     │
│  - Lifecycle hooks (onTimeout, onComplete, etc.)            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Human Service RPC                       │
│  - createTask()     - Create new human task                 │
│  - getTask()        - Get task by ID                         │
│  - listTasks()      - List tasks with filters                │
│  - respondToTask()  - Submit response                        │
│  - cancelTask()     - Cancel pending task                    │
│  - getStats()       - Task statistics                        │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │  Slack  │      │   Web   │      │  Voice  │
    │ Channel │      │ Channel │      │ Channel │
    └─────────┘      └─────────┘      └─────────┘
```

## Core Types

### HumanFunction

```typescript
import { z } from 'zod'
import type { HumanFunction } from '@do/human'

// Define input/output schemas
const ExpenseInputSchema = z.object({
  amount: z.number(),
  category: z.string(),
  receipt: z.string().url()
})

const ExpenseOutputSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional()
})

// Define the human function
const approveExpense: HumanFunction<ExpenseInput, ExpenseOutput> = {
  name: 'approve-expense',
  description: 'Approve or reject expense claims',

  // Validation schemas
  schema: {
    input: ExpenseInputSchema,
    output: ExpenseOutputSchema,
  },

  // Routing configuration
  routing: {
    channels: ['slack', 'web'],
    assignees: ['manager-team'],
    timeout: 86400000, // 24 hours
    sla: {
      warning: 43200000,  // 12 hours
      critical: 86400000  // 24 hours
    },
    priority: 1,
    tags: ['expense', 'approval']
  },

  // UI components
  ui: {
    prompt: ExpensePrompt,        // Show to assignee
    form: ExpenseApprovalForm,    // Form for response
    review: ExpenseReview          // Review completed task
  },

  // Lifecycle hooks
  onTimeout: async (ctx) => ({
    approved: false,
    reason: 'Timed out - auto-rejected'
  }),

  onComplete: async (result) => {
    await notifyUser(result)
  }
}
```

### Task Management

```typescript
import { HumanService } from '@do/human'

// Create a task
const taskId = await humanService.createTask(
  'approve-expense',
  'Please review this expense claim',
  [
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'category', label: 'Category', type: 'select', options: [...] }
  ],
  {
    priority: 'high',
    timeoutMs: 86400000,
    assignedTo: 'manager@company.com',
    context: { userId: '123', receiptUrl: '...' }
  }
)

// Get task status
const task = await humanService.getTask(taskId)

// List pending tasks
const { tasks, total } = await humanService.listTasks({
  status: 'pending',
  assignedTo: 'manager@company.com',
  sortBy: 'priority',
  sortOrder: 'desc'
})

// Respond to task
const completedTask = await humanService.respondToTask(
  taskId,
  { approved: true, notes: 'Looks good' },
  'manager@company.com'
)

// Get statistics
const stats = await humanService.getStats()
// { total, pending, completed, avgResponseTimeMs, completionRate, ... }
```

## Type System

### Core Types

```typescript
// Channels
type HumanChannel = 'slack' | 'web' | 'voice' | 'email'

// Task Status
type TaskStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'timeout'

// Priority
type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

// Routing Config
interface RoutingConfig<TInput> {
  channels: HumanChannel[]
  assignees?: string[] | ((input: TInput) => string[] | Promise<string[]>)
  timeout?: number
  sla?: { warning: number; critical: number }
  priority?: 1 | 2 | 3 | 4 | 5
  tags?: string[]
}

// Execution Context
interface ExecutionContext<TInput> {
  executionId: string
  functionName: string
  input: TInput
  startedAt: Date
  channel: HumanChannel
  assignee?: string
  metadata?: Record<string, unknown>
}

// Execution Result
interface ExecutionResult<TOutput> {
  executionId: string
  output: TOutput
  completedAt: Date
  duration: number
  assignee?: string
  metadata?: Record<string, unknown>
}
```

## Validation

All types are validated at runtime using Zod schemas:

```typescript
import {
  validateExecutionRequest,
  validateExecutionResult,
  safeValidateExecutionRequest,
  validateWithError,
  validateBatch
} from '@do/human'

// Validate and throw on error
const request = validateExecutionRequest(data)

// Safe validation (returns result object)
const result = safeValidateExecutionRequest(data)
if (!result.success) {
  console.error(result.error)
}

// Validate with custom error context
const validated = validateWithError(schema, data, 'user input')

// Batch validation
const { valid, errors } = validateBatch(schema, items)
```

## Error Handling

```typescript
import {
  HumanFunctionError,
  ValidationError,
  TimeoutError,
  NotFoundError,
  RoutingError
} from '@do/human'

try {
  await humanService.respondToTask(taskId, response, user)
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
  } else if (error instanceof TimeoutError) {
    // Handle timeout
  } else if (error instanceof NotFoundError) {
    // Task not found
  }
}
```

## HTTP API

All functions are available via HTTP endpoints:

```bash
# Create task
POST /tasks
{
  "name": "approve-expense",
  "description": "Review expense claim",
  "formFields": [...],
  "priority": "high",
  "timeoutMs": 86400000
}

# Get task
GET /tasks/:id

# List tasks
GET /tasks?status=pending&assignedTo=user@example.com

# Respond to task
POST /tasks/:id/respond
{
  "response": { "approved": true },
  "respondedBy": "manager@example.com"
}

# Cancel task
DELETE /tasks/:id?reason=No+longer+needed

# Get statistics
GET /stats
```

## Testing

Comprehensive test suite with 95+ test cases:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

Test coverage includes:
- ✅ All type schemas validation
- ✅ Execution request/result validation
- ✅ Routing configuration validation
- ✅ Error classes
- ✅ Type guards
- ✅ Batch validation
- ✅ Safe validation helpers
- ✅ Type safety enforcement

## Development

```bash
# Install dependencies
pnpm install

# Run type check
pnpm typecheck

# Run tests
pnpm test

# Start dev server
pnpm dev

# Deploy
pnpm deploy
```

## Files

```
workers/human/
├── src/
│   ├── index.ts          # Main service + HTTP API
│   ├── types.ts          # TypeScript type definitions
│   └── schemas.ts        # Zod validation schemas
├── tests/
│   └── types.test.ts     # Comprehensive type tests
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Test configuration
└── README.md            # This file
```

## Key Features

### Type Safety
- Full TypeScript support with strict mode
- Runtime validation via Zod schemas
- Generic types for input/output

### Routing Flexibility
- Multiple channels (Slack, web, voice, email)
- Static or dynamic assignee selection
- Priority levels and SLA thresholds
- Tag-based categorization

### UI Components
- React components for all interactions
- Custom prompt displays
- Structured forms for responses
- Review components for completed tasks

### Lifecycle Hooks
- `onTimeout` - Handle timeout scenarios
- `onEscalate` - Escalation logic
- `onComplete` - Post-completion actions
- `onCancel` - Cancellation handling
- `onError` - Error recovery

### Task Management
- Create tasks with rich metadata
- List and filter tasks
- Update task status
- Track response times
- Generate statistics

## Examples

See `tests/types.test.ts` for comprehensive usage examples including:
- Function definitions
- Execution requests
- Result handling
- Error scenarios
- Type safety enforcement

## Related Services

- **@db/** - Database storage for tasks
- **@schedule/** - Timeout scheduling
- **@webhooks/** - Callback notifications
- **@ai/** - AI agent integration

## License

Proprietary - dot-do organization

---

**Status:** Type system complete, ready for RPC implementation
**LOC:** ~1,200 (types + schemas + tests)
**Test Coverage:** 95+ test cases
**Last Updated:** 2025-10-03
