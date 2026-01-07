# trigger.do

Background jobs that just work. No infrastructure. No timeouts. No limits.

## For AI Startups

Your 30-second function timeout kills long-running AI inference. Video processing times out. Document analysis fails mid-stream. Every dropped job is lost revenue.

**40% of engineering time goes to infrastructure instead of product.**

trigger.do fixes this.

```typescript
import { trigger } from 'trigger.do'

trigger`process video ${videoId} with encoding ${format}`
trigger`send ${template} email to ${recipients}`
trigger`every day at 3am, run cleanup`
```

Natural language. Tagged templates. Jobs that run forever.

## Promise Pipelining

Chain operations without waterfall round-trips:

```typescript
const processed = await trigger`download ${url}`
  .map(file => trigger`process ${file}`)
  .map(result => trigger`upload ${result} to CDN`)
// One network round trip!
```

Fan out to parallel workers:

```typescript
const results = await trigger`fetch all user uploads for ${userId}`
  .map(uploads => uploads.map(u => trigger`generate thumbnail for ${u}`))
  .map(thumbnails => trigger`create gallery from ${thumbnails}`)
```

## Agent Integration

Let your AI agents manage background jobs:

```typescript
import { ralph } from 'agents.do'

ralph`set up background job to process uploaded videos`
ralph`schedule daily cleanup at 3am`
ralph`retry all failed jobs from yesterday`
```

Agents can create, monitor, and manage jobs using natural language.

## Installation

```bash
npm install trigger.do
```

## Quick Start

### Natural Language Jobs

```typescript
import { trigger } from 'trigger.do'

// Simple jobs
const result = await trigger`send welcome email to ${user.email}`
const video = await trigger`transcode ${videoId} to 1080p`

// Scheduled jobs
trigger`every hour, check inventory levels`
trigger`at 9am on weekdays, send daily digest`
trigger`on the first of each month, generate reports`

// Event-driven jobs
trigger`when ${userId} uploads a file, scan for viruses`
trigger`when payment fails, notify ${adminEmail}`
```

### Checkpointing Long-Running Jobs

Jobs automatically checkpoint progress and resume after failures:

```typescript
const result = await trigger`process large dataset ${datasetId}`
  .checkpoint('downloaded')
  .map(data => trigger`transform ${data}`)
  .checkpoint('transformed')
  .map(transformed => trigger`upload ${transformed}`)
// Survives restarts at each checkpoint
```

### Real-time Progress

```typescript
const job = trigger`encode ${videoId} to all formats`

for await (const update of job.progress()) {
  console.log(`${update.stage}: ${update.percent}%`)
}
```

## When You Need Control

For complex retry policies, concurrency limits, and precise configuration:

```typescript
import { task, schedules } from 'trigger.do'

// Define a task with full control
export const processVideo = task({
  id: 'process-video',
  retry: { maxAttempts: 3, backoff: 'exponential' },
  concurrency: { limit: 10, key: 'payload.userId' },
  run: async (payload: { videoId: string }) => {
    const video = await downloadVideo(payload.videoId)
    await checkpoint('downloaded', { size: video.size })

    const encoded = await encodeVideo(video)
    await checkpoint('encoded', { format: encoded.format })

    const uploaded = await uploadToStorage(encoded)
    return { url: uploaded.url }
  }
})

// Scheduled job with cron
export const dailyCleanup = schedules.task({
  id: 'daily-cleanup',
  cron: '0 3 * * *', // 3am daily
  run: async () => {
    await cleanupOldFiles()
    await compactDatabase()
  }
})

// Trigger programmatically
await processVideo.trigger({ videoId: 'abc123' })
```

### Retry Policies

```typescript
task({
  id: 'resilient-task',
  retry: {
    maxAttempts: 10,        // Max retry attempts
    backoff: 'exponential', // 'exponential' | 'linear' | 'fixed'
    initialDelay: '1s',     // First retry delay
    maxDelay: '1h',         // Maximum delay between retries
    factor: 2,              // Backoff multiplier
    jitter: true            // Prevent thundering herd
  },
  run: handler
})
```

### Concurrency Control

```typescript
task({
  id: 'rate-limited',
  concurrency: { limit: 10, key: 'payload.orgId' },
  rateLimit: { limit: 100, period: '1m' },
  run: handler
})
```

## AI-Native Integration

trigger.do integrates with fsx.do and gitx.do for AI agent workflows:

```typescript
import { trigger } from 'trigger.do'
import { fsx } from 'fsx.do'
import { gitx } from 'gitx.do'

// Long-running AI code review
const review = await trigger`review PR ${prNumber} in ${repo}`
  .map(async (pr) => {
    const repo = await gitx.clone(pr.repository)
    const files = await fsx.glob(repo.path, '**/*.ts')
    return { pr, files }
  })
  .map(({ pr, files }) => trigger`analyze ${files.length} files for issues`)
  .map(analysis => trigger`post review comments on ${pr}`)
```

## MCP Tools

Full AI agent access to job management:

```typescript
import { defineTool } from 'trigger.do/mcp'

// List all registered tasks
export const listTasks = defineTool({
  name: 'list_tasks',
  description: 'List all registered background tasks',
  parameters: {},
  execute: async () => {
    return await trigger.tasks.list()
  }
})

// Get task run status
export const getTaskStatus = defineTool({
  name: 'get_task_status',
  description: 'Get the status of a task run',
  parameters: {
    runId: { type: 'string', description: 'The run ID to check' }
  },
  execute: async ({ runId }) => {
    return await trigger.runs.get(runId)
  }
})

// Cancel a running task
export const cancelTask = defineTool({
  name: 'cancel_task',
  description: 'Cancel a running task',
  parameters: {
    runId: { type: 'string', description: 'The run ID to cancel' }
  },
  execute: async ({ runId }) => {
    return await trigger.runs.cancel(runId)
  }
})

// List recent runs
export const listRuns = defineTool({
  name: 'list_runs',
  description: 'List recent task runs with optional filtering',
  parameters: {
    taskId: { type: 'string', description: 'Filter by task ID', optional: true },
    status: { type: 'string', description: 'Filter by status', optional: true },
    limit: { type: 'number', description: 'Max results', optional: true }
  },
  execute: async ({ taskId, status, limit }) => {
    return await trigger.runs.list({ taskId, status, limit })
  }
})

// Get execution logs
export const getLogs = defineTool({
  name: 'get_logs',
  description: 'Get logs for a task run',
  parameters: {
    runId: { type: 'string', description: 'The run ID' },
    tail: { type: 'number', description: 'Last N lines', optional: true }
  },
  execute: async ({ runId, tail }) => {
    return await trigger.runs.logs(runId, { tail })
  }
})

// Trigger a task
export const triggerTask = defineTool({
  name: 'trigger_task',
  description: 'Trigger a background task with payload',
  parameters: {
    taskId: { type: 'string', description: 'Task identifier' },
    payload: { type: 'object', description: 'Task payload' }
  },
  execute: async ({ taskId, payload }) => {
    const handle = await trigger.tasks.trigger(taskId, payload)
    return { runId: handle.id, status: 'triggered' }
  }
})
```

## Architecture

```
                    +----------------------+
                    |     trigger.do       |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |     TaskDO       | |   SchedulerDO    | |    RunDO         |
    | (task registry)  | | (cron triggers)  | | (execution state)|
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
              +---------------+---------------+
              |                               |
    +-------------------+           +-------------------+
    |  Cloudflare Queues |           |   fsx.do / gitx.do |
    |  (job dispatch)    |           |   (AI tools)       |
    +-------------------+           +-------------------+
```

**Key insight**: Durable Objects provide unlimited execution time. Each task run gets its own RunDO for state management and checkpointing. The SchedulerDO handles cron triggers via Alarms.

## Why Cloudflare?

1. **Unlimited Duration** - Durable Objects have no execution timeout
2. **Global Edge** - Tasks run close to users
3. **No Cold Starts** - Durable Objects stay warm
4. **Built-in Queues** - Reliable job dispatch
5. **Hibernation** - Pay only for active execution

## The Rewrites Ecosystem

trigger.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **trigger.do** | Trigger.dev | Background jobs for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

## Related Domains

- **workflows.do** - Workflow orchestration
- **inngest.do** - Event-driven workflows
- **jobs.do** - Simple job queue
- **cron.do** - Scheduled tasks

## License

MIT
