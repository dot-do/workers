# @dotdo/execution

Execution orchestration with retry logic and rate limiting for Cloudflare Durable Objects.

## Features

- **Automatic Retry**: Failed tasks automatically retry with exponential backoff
- **Rate Limiting**: Control execution rate per time window
- **Timeout Handling**: Configurable timeouts for task execution
- **Status Tracking**: Monitor task status and execution history
- **Priority Queue**: Execute higher priority tasks first
- **Idempotency**: Prevent duplicate task submissions
- **Metrics**: Track execution performance and success rates

## Installation

```bash
npm install @dotdo/execution
```

## Usage

### Basic Example

```typescript
import { Execution } from '@dotdo/execution'

// Extend Execution to implement your task handlers
class MyExecution extends Execution {
  protected async handleTask(record) {
    const { name, input } = record

    if (name === 'sendEmail') {
      await this.sendEmail(input)
      return { sent: true }
    }

    throw new Error(`Unknown task: ${name}`)
  }

  private async sendEmail(input: any) {
    // Your email sending logic
  }
}

// Use in a Durable Object
export class MyExecutionDO {
  private execution: MyExecution

  constructor(state: DurableObjectState, env: Env) {
    this.execution = new MyExecution(state, env)
  }

  async fetch(request: Request) {
    // Submit a task
    const task = await this.execution.submit({
      id: crypto.randomUUID(),
      name: 'sendEmail',
      input: {
        to: 'user@example.com',
        subject: 'Hello',
        body: 'World'
      },
      config: {
        maxRetries: 3,
        timeout: 5000
      }
    })

    return Response.json(task)
  }
}
```

### Configuration

```typescript
// Configure default settings
execution.configure({
  maxRetries: 3,              // Maximum retry attempts
  initialRetryDelay: 1000,    // Initial retry delay (1 second)
  maxRetryDelay: 60000,       // Maximum retry delay (60 seconds)
  backoffMultiplier: 2,       // Exponential backoff multiplier
  timeout: 30000,             // Task timeout (30 seconds)
})

// Override per task
await execution.submit({
  id: 'task-1',
  name: 'myTask',
  input: { data: 'value' },
  config: {
    maxRetries: 5,            // Override default
    initialRetryDelay: 2000,
  }
})
```

### Rate Limiting

```typescript
await execution.submit({
  id: 'task-1',
  name: 'apiCall',
  input: { url: 'https://api.example.com' },
  config: {
    rateLimit: {
      maxExecutions: 10,      // Max 10 executions
      windowMs: 60000,        // Per 60 seconds (1 minute)
    }
  }
})
```

### Priority Queue

```typescript
// Higher priority tasks execute first
await execution.submit({
  id: 'urgent',
  name: 'criticalTask',
  input: {},
  priority: 10              // High priority
})

await execution.submit({
  id: 'normal',
  name: 'normalTask',
  input: {},
  priority: 5               // Normal priority
})

await execution.submit({
  id: 'low',
  name: 'backgroundTask',
  input: {},
  priority: 1               // Low priority
})
```

### Idempotency

```typescript
// Prevent duplicate submissions
await execution.submit({
  id: 'task-1',
  name: 'processPayment',
  input: { amount: 100 },
  idempotencyKey: 'payment-abc123'
})

// Submitting again with same key returns the original task
await execution.submit({
  id: 'task-2',
  name: 'processPayment',
  input: { amount: 100 },
  idempotencyKey: 'payment-abc123'  // Returns task-1
})
```

### Task Management

```typescript
// Get task status
const status = await execution.getStatus('task-1')
console.log(status.status)        // 'completed' | 'failed' | 'pending' | etc
console.log(status.result?.output)

// Cancel a pending task
await execution.cancel('task-2')

// Manually retry a failed task
await execution.retry('task-3')

// List tasks with filters
const pending = await execution.listRecords({ status: 'pending' })
const byName = await execution.listRecords({ name: 'sendEmail' })
const limited = await execution.listRecords({ limit: 10 })
```

### Metrics

```typescript
const metrics = await execution.getMetrics()

console.log(metrics.total)           // Total tasks
console.log(metrics.completed)       // Completed tasks
console.log(metrics.failed)          // Failed tasks
console.log(metrics.averageDuration) // Average execution time (ms)
console.log(metrics.averageRetries)  // Average retry count
```

## Retry Logic

The ExecutionDO implements exponential backoff with jitter:

1. **First retry**: `initialRetryDelay` (default: 1s)
2. **Second retry**: `initialRetryDelay * backoffMultiplier` (default: 2s)
3. **Third retry**: `initialRetryDelay * backoffMultiplier^2` (default: 4s)
4. **Nth retry**: `min(initialRetryDelay * backoffMultiplier^(n-1), maxRetryDelay)`

Jitter adds 0-25% random variance to prevent thundering herd.

## Task Status

A task can be in one of these states:

- `pending`: Waiting to execute
- `running`: Currently executing
- `completed`: Successfully completed
- `failed`: Failed after all retries
- `rate_limited`: Blocked by rate limit
- `cancelled`: Cancelled by user

## Timeouts

Tasks are automatically terminated if they exceed the timeout:

```typescript
await execution.submit({
  id: 'task-1',
  name: 'slowTask',
  input: {},
  config: {
    timeout: 5000  // 5 seconds
  }
})
```

## Scheduled Retries

Failed tasks are automatically scheduled for retry using Durable Object alarms:

```typescript
// In your Durable Object class
async alarm() {
  // ExecutionDO handles retry scheduling
  await this.execution.alarm()
}
```

## Types

```typescript
interface ExecutionTask<TInput, TOutput> {
  id: string
  name: string
  input: TInput
  config?: ExecutionConfig
  priority?: number
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

interface ExecutionConfig {
  maxRetries?: number
  initialRetryDelay?: number
  maxRetryDelay?: number
  backoffMultiplier?: number
  timeout?: number
  rateLimit?: {
    maxExecutions: number
    windowMs: number
  }
}

interface ExecutionResult<TOutput> {
  taskId: string
  status: ExecutionStatus
  output?: TOutput
  error?: string
  stack?: string
  retries: number
  startedAt: number
  completedAt?: number
  duration?: number
  wasRateLimited?: boolean
  nextRetryAt?: number
}
```

## Best Practices

1. **Set appropriate timeouts** to prevent long-running tasks from blocking
2. **Use idempotency keys** for critical operations like payments
3. **Configure rate limits** when calling external APIs
4. **Implement custom handlers** by extending the Execution class
5. **Monitor metrics** to track system health and performance
6. **Use priority** to ensure critical tasks execute first
7. **Handle alarms** in your Durable Object to process scheduled retries

## License

MIT
