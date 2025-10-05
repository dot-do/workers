# schedule

# Schedule Service

Comprehensive cron job and task scheduling microservice for the dot-do platform, providing automated task execution, retry logic with exponential backoff, and execution history tracking.

## Overview

The **Schedule Service** is a core infrastructure service that handles ALL scheduled tasks and automated jobs for the platform. It provides reliable, timezone-aware cron scheduling with comprehensive retry logic and monitoring.

**Design Philosophy**: Single responsibility - task scheduling and execution only. No business logic beyond task orchestration. Pure infrastructure service.

## Features

### 1. Cron Scheduling

**Cloudflare Cron Triggers**:
- Multiple cron schedules (every 5 minutes, hourly, daily, weekly)
- Timezone support with automatic DST handling
- Named schedules: `@hourly`, `@daily`, `@weekly`, `@monthly`
- Custom cron expressions (standard 5-field format)
- Zero-drift execution (always on schedule)

**Cron Patterns**:
```
*/5 * * * *    - Every 5 minutes
0 * * * *      - Every hour (at minute 0)
0 0 * * *      - Every day at midnight
0 0 * * 0      - Every Sunday at midnight
0 2 * * *      - Every day at 2am
```

### 2. Built-in Tasks (13 Default Tasks)

**Cleanup Tasks** (3):
- **cleanup-expired-sessions** - Delete expired user sessions (hourly)
- **cleanup-expired-api-keys** - Delete expired API keys (daily)
- **cleanup-old-generations** - Delete AI generations older than 30 days (weekly)

**AI Tasks** (2):
- **generate-missing-embeddings** - Generate embeddings for entities without them (daily)
- **generate-missing-chunk-embeddings** - Generate embeddings for document chunks (daily)

**Analytics Tasks** (2):
- **update-analytics** - Compute and store platform analytics (hourly)
- **backup-database** - Backup database to external storage (daily)

**Monitoring Tasks** (2):
- **health-check-services** - Ping all services and alert if down (every 5 minutes)
- **check-rate-limits** - Monitor API rate limit usage (hourly)

**Import Tasks** (4):
- **import-mcp-servers** - Import MCP servers from registry (daily at 2am)
- **import-public-apis** - Import public APIs from directories (daily at 3am)
- **import-all-sources** - Comprehensive import of all data sources (weekly on Sunday at 4am)
- **verify-imported-data** - Verify data integrity after imports (daily at 5am)

### 3. Task Management

**Registration**:
- Dynamic task registration via RPC or HTTP API
- Named task handlers with metadata
- Enable/disable tasks without deletion
- Automatic initialization of default tasks

**Execution Control**:
- Manual task execution (run immediately)
- Automatic execution based on cron schedule
- Task enable/disable (soft deletion)
- Task unregistration (hard deletion)

**Metadata**:
- Task description and category
- Custom metadata fields
- Creation and update timestamps
- Last run and next run timestamps

### 4. Execution History

**Tracking**:
- Complete execution history per task
- Start time, end time, duration (ms)
- Execution status: `running`, `success`, `failed`
- Error messages for failed executions
- Result data for successful executions

**Queries**:
- Get execution history for specific task
- Get recent executions across all tasks
- Filter by task name, status, date range
- Pagination support (limit parameter)

### 5. Retry Logic with Exponential Backoff

**Automatic Retries**:
- Failed tasks are automatically retried
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum 5 retry attempts per execution
- Configurable retry delays per task

**Error Handling**:
- Detailed error logging with stack traces
- Error categorization (timeout, network, logic)
- Automatic alerting for critical failures
- Dead letter queue for permanently failed tasks

### 6. Multi-Interface Support

**RPC Interface** (Service-to-Service):
- Direct method calls via service binding
- Low latency (<5ms)
- Type-safe TypeScript interfaces
- No HTTP overhead

**HTTP API** (External Clients):
- REST API with JSON responses
- Task management endpoints
- Execution history queries
- Manual task triggering

**Cron Handler** (Cloudflare Triggers):
- Automatic execution on cron schedule
- Multiple cron patterns supported
- Timezone-aware scheduling
- Zero-drift execution

## Architecture

```
Cron Trigger (Cloudflare)
        ↓
┌──────────────────┐
│ Schedule Service │
│                  │
│  ┌────────────┐  │
│  │ Scheduler  │  │ ◄── Task registration and management
│  └────────────┘  │
│                  │
│  ┌────────────┐  │
│  │  Executor  │  │ ◄── Task execution and retry logic
│  └────────────┘  │
│                  │
│  ┌────────────┐  │
│  │Task Registry│ │ ◄── 13 built-in task handlers
│  └────────────┘  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌────────┐
│   DB    │ │ EMAIL  │
│(Tasks,  │ │(Alerts)│
│History) │ │        │
└─────────┘ └────────┘
```

## API

### RPC Interface (Service-to-Service)

#### Task Registration



Register a new scheduled task.

**Input**:
```ts
{
  name: string
  schedule: string  // Cron expression or named schedule
  handler: string   // Function name to execute
  enabled?: boolean // Default: true
  metadata?: Record<string, any>
}
```

**Response**:
```ts
{
  id: string
  name: string
  schedule: string
  handler: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}
```

**Example**:
```ts
const task = await env.SCHEDULE.registerTask({
  name: 'daily-report',
  schedule: '@daily',
  handler: 'generate-daily-report',
  enabled: true,
  metadata: {
    description: 'Generate daily analytics report',
    category: 'reports',
    recipients: ['admin@example.com']
  }
})
```

#### Task Management



Unregister (delete) a task.



Enable a task.



Disable a task (soft delete).



Get task details by name.



List all registered tasks.

#### Execution



Run a task immediately (manual execution).

**Example**:
```ts
const success = await env.SCHEDULE.runTaskNow('cleanup-expired-sessions')
// Returns true if task executed successfully
```

#### History



Get execution history for a task.

**Response**:
```ts
[
  {
    id: string
    taskId: string
    taskName: string
    startedAt: string
    completedAt: string
    status: 'success' | 'failed' | 'running'
    error?: string
    result?: any
    durationMs: number
  }
]
```



Get recent executions across all tasks.

#### Handlers



Get list of all available task handlers.

**Response**:
```ts
[
  'cleanup-expired-sessions',
  'cleanup-expired-api-keys',
  'cleanup-old-generations',
  'generate-missing-embeddings',
  'generate-missing-chunk-embeddings',
  'update-analytics',
  'backup-database',
  'health-check-services',
  'check-rate-limits',
  'import-mcp-servers',
  'import-public-apis',
  'import-all-sources',
  'verify-imported-data'
]
```



Initialize all 13 default tasks (one-time setup).

### HTTP API Endpoints

#### Service Info

**GET /**

Get service information.

Response:
```json
{
  "service": "schedule",
  "version": "1.0.0",
  "description": "Cron job and task scheduling service",
  "interfaces": {
    "rpc": "WorkerEntrypoint methods for service-to-service calls",
    "http": "REST API for task management and monitoring",
    "cron": "Cloudflare Cron Triggers for scheduled execution"
  },
  "endpoints": {
    "tasks": {
      "list": "GET /api/tasks",
      "get": "GET /api/tasks/:name",
      "register": "POST /api/tasks",
      "enable": "POST /api/tasks/:name/enable",
      "disable": "POST /api/tasks/:name/disable",
      "delete": "DELETE /api/tasks/:name",
      "run": "POST /api/tasks/:name/run",
      "history": "GET /api/tasks/:name/history"
    },
    "handlers": "GET /api/handlers",
    "executions": "GET /api/executions",
    "health": "GET /api/health"
  }
}
```

#### Task Management

**GET /api/tasks**

List all tasks.

Response:
```json
{
  "success": true,
  "count": 13,
  "tasks": [
    {
      "id": "task-123",
      "name": "cleanup-expired-sessions",
      "schedule": "@hourly",
      "handler": "cleanup-expired-sessions",
      "enabled": true,
      "lastRun": "2025-01-08T12:00:00Z",
      "nextRun": "2025-01-08T13:00:00Z",
      "metadata": {
        "description": "Delete expired user sessions",
        "category": "cleanup"
      },
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-08T12:00:00Z"
    }
  ]
}
```

**GET /api/tasks/:name**

Get task details.

Response:
```json
{
  "success": true,
  "task": {
    "id": "task-123",
    "name": "cleanup-expired-sessions",
    "schedule": "@hourly",
    "handler": "cleanup-expired-sessions",
    "enabled": true,
    "lastRun": "2025-01-08T12:00:00Z",
    "nextRun": "2025-01-08T13:00:00Z",
    "metadata": {
      "description": "Delete expired user sessions",
      "category": "cleanup"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-08T12:00:00Z"
  }
}
```

**POST /api/tasks**

Register new task.

Body:
```json
{
  "name": "daily-report",
  "schedule": "@daily",
  "handler": "generate-daily-report",
  "enabled": true,
  "metadata": {
    "description": "Generate daily analytics report",
    "category": "reports"
  }
}
```

Response:
```json
{
  "success": true,
  "task": {
    "id": "task-456",
    "name": "daily-report",
    "schedule": "@daily",
    "handler": "generate-daily-report",
    "enabled": true,
    "nextRun": "2025-01-09T00:00:00Z",
    "metadata": {
      "description": "Generate daily analytics report",
      "category": "reports"
    },
    "createdAt": "2025-01-08T12:00:00Z",
    "updatedAt": "2025-01-08T12:00:00Z"
  },
  "message": "Task daily-report registered successfully"
}
```

**POST /api/tasks/:name/enable**

Enable task.

Response:
```json
{
  "success": true,
  "message": "Task cleanup-expired-sessions enabled"
}
```

**POST /api/tasks/:name/disable**

Disable task.

Response:
```json
{
  "success": true,
  "message": "Task cleanup-expired-sessions disabled"
}
```

**DELETE /api/tasks/:name**

Unregister task.

Response:
```json
{
  "success": true,
  "message": "Task cleanup-expired-sessions unregistered"
}
```

**POST /api/tasks/:name/run**

Run task immediately.

Response:
```json
{
  "success": true,
  "message": "Task cleanup-expired-sessions executed successfully"
}
```

#### Execution History

**GET /api/tasks/:name/history**

Get execution history for task.

Query parameters:
- `limit` - Maximum number of executions to return (default: 50)

Response:
```json
{
  "success": true,
  "count": 24,
  "history": [
    {
      "id": "exec-789",
      "taskId": "task-123",
      "taskName": "cleanup-expired-sessions",
      "startedAt": "2025-01-08T12:00:00Z",
      "completedAt": "2025-01-08T12:00:05Z",
      "status": "success",
      "result": {
        "deletedSessions": 42
      },
      "durationMs": 5234
    }
  ]
}
```

**GET /api/executions**

Get recent executions (all tasks).

Query parameters:
- `limit` - Maximum number of executions to return (default: 100)

Response:
```json
{
  "success": true,
  "count": 156,
  "executions": [
    {
      "id": "exec-789",
      "taskId": "task-123",
      "taskName": "cleanup-expired-sessions",
      "startedAt": "2025-01-08T12:00:00Z",
      "completedAt": "2025-01-08T12:00:05Z",
      "status": "success",
      "durationMs": 5234
    }
  ]
}
```

#### Task Handlers

**GET /api/handlers**

List available task handlers.

Response:
```json
{
  "success": true,
  "count": 13,
  "handlers": [
    "cleanup-expired-sessions",
    "cleanup-expired-api-keys",
    "cleanup-old-generations",
    "generate-missing-embeddings",
    "generate-missing-chunk-embeddings",
    "update-analytics",
    "backup-database",
    "health-check-services",
    "check-rate-limits",
    "import-mcp-servers",
    "import-public-apis",
    "import-all-sources",
    "verify-imported-data"
  ]
}
```

**POST /api/init**

Initialize default tasks (one-time setup).

Response:
```json
{
  "success": true,
  "message": "Default tasks initialized"
}
```

## Configuration

### Cron Triggers

Configure in `wrangler.jsonc`:

```jsonc
{
  "triggers": {
    "crons": [
      "*/5 * * * *",  // Every 5 minutes (monitoring)
      "0 * * * *",    // Every hour (cleanup, analytics)
      "0 0 * * *"     // Every day at midnight (backups, maintenance)
    ]
  }
}
```

### Database Schema

Required tables (managed by DB service):

```sql
-- Tasks
CREATE TABLE scheduled_tasks (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  schedule TEXT NOT NULL,
  handler TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tasks_name ON scheduled_tasks(name);
CREATE INDEX idx_scheduled_tasks_enabled ON scheduled_tasks(enabled);
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run);

-- Task Executions
CREATE TABLE task_executions (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES scheduled_tasks(id),
  task_name TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status TEXT NOT NULL,  -- 'running', 'success', 'failed'
  error TEXT,
  result JSONB,
  duration_ms INTEGER
);

CREATE INDEX idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX idx_task_executions_task_name ON task_executions(task_name);
CREATE INDEX idx_task_executions_status ON task_executions(status);
CREATE INDEX idx_task_executions_started_at ON task_executions(started_at);
```

## Task Handlers

All 13 default task handlers are implemented in `src/tasks/`:

- `cleanup.ts` - Cleanup tasks (sessions, API keys, generations)
- `embeddings.ts` - AI embedding generation tasks
- `analytics.ts` - Analytics and backup tasks
- `monitoring.ts` - Health check and rate limit monitoring
- `imports.ts` - Data import tasks (MCP servers, APIs, sources)

### Creating Custom Task Handlers

Add handler to task registry:



Register task via RPC or HTTP:



## Security

### Task Execution Isolation

**Sandboxing**:
- Each task execution runs in isolated context
- No shared state between executions
- Automatic cleanup of resources
- Memory limits enforced

**Error Handling**:
- Failed tasks don't affect other tasks
- Errors are logged but don't crash service
- Automatic retry with exponential backoff
- Dead letter queue for permanent failures

### Access Control

**RPC Access**:
- Only authenticated services can call RPC methods
- Service-to-service authentication required
- No direct external access

**HTTP Access**:
- Task management requires authentication
- Admin-only endpoints for sensitive operations
- Rate limiting on all endpoints

## Implementation

Due to the complexity of this service (~1,925 LOC across 11 files), the implementation is organized into focused modules:

- `src/index.ts` - Main entrypoint with RPC, HTTP, and Cron interfaces (primary)
- `src/scheduler.ts` - Task registration and scheduling logic
- `src/executor.ts` - Task execution engine with retry logic
- `src/types.ts` - TypeScript type definitions
- `src/utils.ts` - Shared utility functions
- `src/tasks/index.ts` - Task registry with 13 default tasks
- `src/tasks/cleanup.ts` - Cleanup task handlers (sessions, API keys, generations)
- `src/tasks/embeddings.ts` - AI embedding generation handlers
- `src/tasks/analytics.ts` - Analytics and backup handlers
- `src/tasks/monitoring.ts` - Health check and rate limit handlers
- `src/tasks/imports.ts` - Data import handlers (MCP servers, APIs, sources)

**Note**: This is a core infrastructure service that must remain stable and reliable. Changes require thorough testing and review.

## Testing

```bash
# Run test suite
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

**Test Coverage**: 39 tests with 92-96% coverage across all modules

**Test Categories**:
- Task registration and management
- Cron schedule parsing
- Task execution engine
- Retry logic with exponential backoff
- Execution history tracking
- Task handler integration
- Error handling and recovery

## Performance

**Target Metrics**:
- RPC latency: <5ms (p95) for task registration
- Task execution: <100ms (p95) for lightweight tasks
- Cron trigger latency: <10ms (p95)
- History queries: <20ms (p95)

**Optimizations**:
- Task registry cached in memory
- Execution history paginated by default
- Database queries optimized with indexes
- Parallel task execution when possible
- Efficient retry logic with exponential backoff

## Monitoring

**Health Check**:
```bash
curl https://schedule.do/api/health
```

**Metrics**:
- Task execution success/failure rate
- Task execution duration (p50, p95, p99)
- Cron trigger reliability
- Retry attempt distribution
- Failed task alerts

**Logging**:
- All task executions logged
- Cron trigger events
- Retry attempts with backoff delay
- Failed tasks with error messages
- Execution history stored in database

## Troubleshooting

### Task not running

1. Check task is enabled: `GET /api/tasks/:name`
2. Verify cron schedule is correct
3. Check execution history for errors: `GET /api/tasks/:name/history`
4. Review task handler implementation

### Task failing repeatedly

1. Check execution history for error messages
2. Verify task handler has proper error handling
3. Check retry logic and backoff delays
4. Review database connection and service bindings
5. Check for resource exhaustion (memory, CPU)

### Cron trigger not firing

1. Verify cron expression is valid
2. Check Cloudflare dashboard for trigger status
3. Review service logs for cron events
4. Ensure service is deployed and running

### Execution history growing too large

1. Implement automatic cleanup of old executions
2. Add database partitioning by date
3. Archive old executions to external storage
4. Adjust retention policy (default: 90 days)

## Related Services

- **DB Service** - Task and execution history storage
- **Email Service** - Alert notifications for failed tasks
- **Analytics Service** - Metrics and monitoring data

## References

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cron Expression Format](https://crontab.guru/)
- [Workers Scheduled Handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)

---

**Service Type**: Core Infrastructure
**LOC**: ~1,925 across 11 files
**Test Coverage**: 39 tests, 92-96% coverage
**Status**: Production Ready
**Last Updated**: 2025-10-04

---

**Generated from:** schedule.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts schedule.mdx`
