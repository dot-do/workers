# Schedule Service

Cron job and task scheduling service for the dot-do platform. Manages scheduled tasks, executes on cron triggers, and tracks execution history.

## Features

- **Cron Expressions**: Support for standard cron syntax and named schedules
- **Task Management**: Register, enable/disable, and run tasks on-demand
- **Execution History**: Track all task executions with status, duration, and errors
- **Retry Logic**: Automatic retry with exponential backoff for failed tasks
- **Multiple Interfaces**: RPC, HTTP, and Cron trigger support

## Architecture

```
┌─────────────────┐
│ Cron Triggers   │  ◄── Cloudflare scheduled events
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Schedule Service│
│                 │
│ - Task Registry │  ◄── Built-in task handlers
│ - Scheduler     │      (cleanup, embeddings, analytics, monitoring)
│ - Executor      │
│ - History       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DB Service      │  ◄── Store tasks & execution history
└─────────────────┘
```

## Cron Schedule

The service runs on 4 different cron triggers:

| Trigger | Schedule | Purpose |
|---------|----------|---------|
| Every 5 minutes | `*/5 * * * *` | Monitoring tasks |
| Every hour | `0 * * * *` | Cleanup, analytics |
| Daily (midnight) | `0 0 * * *` | Backups, maintenance |
| Weekly (Sunday) | `0 0 * * 0` | Weekly cleanup |

## Built-in Tasks

### Cleanup Tasks

#### 1. cleanup-expired-sessions
- **Schedule**: `@hourly`
- **Purpose**: Delete expired user sessions from database
- **Category**: Cleanup

#### 2. cleanup-expired-api-keys
- **Schedule**: `@daily`
- **Purpose**: Delete expired API keys
- **Category**: Cleanup

#### 3. cleanup-old-generations
- **Schedule**: `@weekly`
- **Purpose**: Delete AI generations older than 30 days
- **Category**: Cleanup

### AI Tasks

#### 4. generate-missing-embeddings
- **Schedule**: `@daily`
- **Purpose**: Find entities without embeddings and queue them for generation
- **Category**: AI
- **Batch Size**: 100 entities per run

### Analytics Tasks

#### 5. update-analytics
- **Schedule**: `@hourly`
- **Purpose**: Compute and store platform usage statistics
- **Category**: Analytics

#### 6. backup-database
- **Schedule**: `@daily`
- **Purpose**: Trigger database backup to external storage
- **Category**: Maintenance

### Monitoring Tasks

#### 7. health-check-services
- **Schedule**: `every 5 minutes`
- **Purpose**: Ping all services and alert if any are down
- **Category**: Monitoring
- **Services Checked**: DB, AI, Queue

#### 8. check-rate-limits
- **Schedule**: `@hourly`
- **Purpose**: Monitor API rate limit usage and alert if nearing threshold
- **Category**: Monitoring
- **Threshold**: Alert at 90% of rate limit

## RPC Interface

Use the Schedule service from other workers:

```typescript
// Register a custom task
const task = await env.SCHEDULE.registerTask({
  name: 'custom-cleanup',
  schedule: '@daily',
  handler: 'cleanup-expired-sessions',
  enabled: true,
  metadata: {
    description: 'Custom cleanup task',
  },
})

// List all tasks
const tasks = await env.SCHEDULE.listTasks()

// Get task details
const task = await env.SCHEDULE.getTask('cleanup-expired-sessions')

// Run task immediately
const success = await env.SCHEDULE.runTaskNow('cleanup-expired-sessions')

// Get execution history
const history = await env.SCHEDULE.getTaskHistory('cleanup-expired-sessions', 10)

// Enable/disable tasks
await env.SCHEDULE.enableTask('backup-database')
await env.SCHEDULE.disableTask('cleanup-old-generations')
```

## HTTP Interface

### List Tasks
```bash
curl https://schedule.do/tasks
```

### Get Task Details
```bash
curl https://schedule.do/tasks/cleanup-expired-sessions
```

### Register New Task
```bash
curl -X POST https://schedule.do/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-task",
    "schedule": "@hourly",
    "handler": "cleanup-expired-sessions",
    "enabled": true
  }'
```

### Run Task Immediately
```bash
curl -X POST https://schedule.do/tasks/cleanup-expired-sessions/run
```

### Enable/Disable Task
```bash
curl -X POST https://schedule.do/tasks/backup-database/enable
curl -X POST https://schedule.do/tasks/backup-database/disable
```

### Get Execution History
```bash
curl https://schedule.do/tasks/cleanup-expired-sessions/history?limit=20
```

### Get Recent Executions (All Tasks)
```bash
curl https://schedule.do/executions?limit=50
```

### List Available Handlers
```bash
curl https://schedule.do/handlers
```

### Initialize Default Tasks
```bash
curl -X POST https://schedule.do/init
```

## Schedule Expressions

### Named Schedules
- `@hourly` - Every hour (0 * * * *)
- `@daily` - Every day at midnight (0 0 * * *)
- `@weekly` - Every Sunday at midnight (0 0 * * 0)
- `@monthly` - First day of month at midnight (0 0 1 * *)
- `@yearly` - January 1st at midnight (0 0 1 1 *)

### Custom Intervals
- `every 5 minutes` - Every 5 minutes
- `every 2 hours` - Every 2 hours
- `every 3 days` - Every 3 days

### Standard Cron Expressions
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday=0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `*/15 * * * *` - Every 15 minutes
- `0 */2 * * *` - Every 2 hours
- `0 9 * * 1-5` - 9 AM weekdays
- `30 2 * * *` - 2:30 AM daily

## Task Execution

### Retry Logic
- Failed tasks are retried up to 3 times
- Exponential backoff between retries (1s, 2s, 4s)
- Maximum backoff: 10 seconds

### Timeout
- Tasks must complete within 29 seconds (Worker limit: 30s)
- Tasks exceeding timeout are marked as failed

### Execution History
All task executions are logged with:
- Execution ID
- Start/completion timestamps
- Status (running, success, failed)
- Duration in milliseconds
- Result or error message

## Adding Custom Tasks

### 1. Create Task Handler

```typescript
// src/tasks/my-task.ts
export async function myCustomTask(env: Env) {
  const startTime = Date.now()

  try {
    // Your task logic here
    const result = await doSomething()

    return {
      success: true,
      result,
      duration: Date.now() - startTime,
      message: 'Task completed successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}
```

### 2. Register in Task Registry

```typescript
// src/tasks/index.ts
import { myCustomTask } from './my-task'

export const taskRegistry: TaskRegistry = {
  // ... existing tasks
  'my-custom-task': myCustomTask,
}
```

### 3. Add to Default Tasks (Optional)

```typescript
// src/tasks/index.ts
export const defaultTasks = [
  // ... existing tasks
  {
    name: 'my-custom-task',
    schedule: '@daily',
    handler: 'my-custom-task',
    enabled: true,
    metadata: {
      description: 'My custom task',
      category: 'custom',
    },
  },
]
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Test cron trigger manually
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Deploy to production
pnpm deploy
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

Current test coverage: **85%+**

## Database Schema

Tasks and executions are stored in the DB service:

### scheduled_tasks
```typescript
{
  id: string              // "task_${name}"
  name: string            // Task name (unique)
  schedule: string        // Cron expression
  handler: string         // Function name
  enabled: boolean        // Active status
  lastRun?: string        // ISO timestamp
  nextRun?: string        // ISO timestamp
  metadata?: object       // Custom metadata
  createdAt: string
  updatedAt: string
}
```

### task_executions
```typescript
{
  id: string              // "exec_${name}_${timestamp}_${random}"
  taskId: string          // Reference to task
  taskName: string        // Task name for quick lookup
  startedAt: string       // ISO timestamp
  completedAt?: string    // ISO timestamp
  status: string          // 'running' | 'success' | 'failed'
  error?: string          // Error message if failed
  result?: any            // Task result if successful
  durationMs?: number     // Execution time in milliseconds
}
```

## Service Bindings

Required bindings in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AI", "service": "do-ai" },
    { "binding": "QUEUE", "service": "do-queue" }
  ]
}
```

## Monitoring

### Health Check
```bash
curl https://schedule.do/health
```

### Recent Executions
```bash
# Last 100 executions across all tasks
curl https://schedule.do/executions?limit=100
```

### Task-Specific History
```bash
# Last 50 executions for specific task
curl https://schedule.do/tasks/cleanup-expired-sessions/history?limit=50
```

### Stats by Task
All executions include:
- Success/failure status
- Duration metrics
- Error details
- Retry attempts

## Error Handling

Tasks should return standardized result objects:

```typescript
// Success
{
  success: true,
  result: any,           // Task-specific result
  duration: number,      // Execution time in ms
  message: string        // Human-readable message
}

// Failure
{
  success: false,
  error: string,         // Error message
  duration: number       // Execution time in ms
}
```

## Best Practices

1. **Keep tasks short**: Aim for <10 second execution time
2. **Make tasks idempotent**: Safe to run multiple times
3. **Handle errors gracefully**: Return structured error objects
4. **Log important events**: Use console.log/error for debugging
5. **Test thoroughly**: Write tests for all task handlers
6. **Use transactions**: When modifying multiple records
7. **Monitor regularly**: Check execution history for failures

## Troubleshooting

### Task not running
1. Check if task is enabled: `GET /tasks/:name`
2. Verify cron schedule is valid
3. Check execution history for errors
4. Review service bindings configuration

### Task timing out
1. Reduce workload per execution
2. Split into smaller tasks
3. Use queue for long-running operations
4. Optimize database queries

### High failure rate
1. Check execution history for error patterns
2. Verify service dependencies are healthy
3. Review task logic for bugs
4. Adjust retry strategy if needed

## Related Services

- **DB Service**: Database operations and storage
- **Queue Service**: Background job processing
- **AI Service**: AI generation and embeddings

## License

Proprietary - dot-do organization

## Contact

For issues or questions, see GitHub issues in dot-do/workers repository.
