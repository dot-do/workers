# trigger.do

Trigger.dev on Cloudflare - Background jobs with great developer experience.

## The Problem

Modern applications need reliable background job processing:
- Execute long-running tasks outside request lifecycle
- Schedule recurring jobs with cron expressions
- Handle retries with exponential backoff
- Pause and resume execution across boundaries
- Monitor job progress in real-time

Traditional solutions require:
- Managing job queue infrastructure
- Building state persistence
- Implementing retry logic
- Operating separate monitoring systems
- Dealing with cold starts and timeouts

## The Vision

Drop-in Trigger.dev replacement running entirely on Cloudflare.

```typescript
import { task, schedules } from 'trigger.do'

// Define a long-running task
export const processVideo = task({
  id: 'process-video',
  retry: { maxAttempts: 3, backoff: 'exponential' },
  run: async (payload: { videoId: string }) => {
    // Long-running work - no timeout limits
    const video = await downloadVideo(payload.videoId)

    // Checkpoint progress - survives restarts
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

// Trigger from your application
await processVideo.trigger({ videoId: 'abc123' })
```

No infrastructure. No timeouts. Just tasks that work.

## Features

- **Long-Running Tasks** - Unlimited execution time via Durable Objects
- **TypeScript First** - Full type safety from definition to trigger
- **Automatic Retries** - Exponential backoff with configurable policies
- **Checkpointing** - Resume from last checkpoint after failures
- **Scheduled Jobs** - Cron expressions for recurring tasks
- **Event Triggers** - React to external events and webhooks
- **Real-time Logs** - Stream execution logs via WebSocket
- **AI-Native** - MCP tools via fsx.do and gitx.do

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

## Installation

```bash
npm install trigger.do
```

## Quick Start

### Define Tasks

```typescript
import { task } from 'trigger.do'

// Simple task
export const sendEmail = task({
  id: 'send-email',
  run: async (payload: { to: string; subject: string; body: string }) => {
    const result = await emailService.send(payload)
    return { messageId: result.id }
  }
})

// Task with retry policy
export const syncData = task({
  id: 'sync-data',
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    initialDelay: '1s',
    maxDelay: '5m'
  },
  run: async (payload: { sourceId: string }) => {
    const data = await fetchFromSource(payload.sourceId)
    await writeToDestination(data)
    return { recordCount: data.length }
  }
})
```

### Checkpointing for Long-Running Tasks

```typescript
export const processLargeFile = task({
  id: 'process-large-file',
  run: async (payload: { fileId: string }, { checkpoint }) => {
    const file = await downloadFile(payload.fileId)
    await checkpoint('downloaded', { size: file.size })

    const chunks = splitIntoChunks(file, 1000)

    for (let i = 0; i < chunks.length; i++) {
      await processChunk(chunks[i])
      await checkpoint(`chunk-${i}`, { processed: i + 1, total: chunks.length })
    }

    const result = await combineResults()
    return { processedChunks: chunks.length }
  }
})
```

### Scheduled Tasks

```typescript
import { schedules } from 'trigger.do'

// Cron-based schedule
export const hourlySummary = schedules.task({
  id: 'hourly-summary',
  cron: '0 * * * *', // Every hour
  run: async () => {
    const stats = await gatherStats()
    await sendSummaryEmail(stats)
  }
})

// Multiple schedules
export const multiSchedule = schedules.task({
  id: 'multi-schedule',
  cron: ['0 9 * * 1-5', '0 10 * * 0,6'], // 9am weekdays, 10am weekends
  run: async () => {
    await dailyReport()
  }
})
```

### Event Triggers

```typescript
import { trigger } from 'trigger.do'

// Webhook trigger
export const onGitHubPush = trigger({
  id: 'github-push',
  source: 'github',
  event: 'push',
  run: async (event) => {
    await runTests(event.repository, event.ref)
  }
})

// Custom event trigger
export const onUserSignup = trigger({
  id: 'user-signup',
  event: 'user.created',
  run: async (event: { userId: string; email: string }) => {
    await sendWelcomeEmail(event.email)
    await createOnboardingTasks(event.userId)
  }
})
```

### Triggering Tasks

```typescript
// From your application
import { sendEmail, syncData } from './tasks'

// Trigger and wait for result
const result = await sendEmail.triggerAndWait({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'Welcome!'
})

// Trigger and get handle (don't wait)
const handle = await syncData.trigger({ sourceId: 'src-123' })

// Check status later
const status = await handle.status()
console.log(status) // { state: 'running', progress: 0.5 }

// Wait for completion
const finalResult = await handle.result()
```

### Real-time Logs

```typescript
const handle = await processVideo.trigger({ videoId: 'abc' })

// Stream logs
for await (const log of handle.logs()) {
  console.log(`[${log.level}] ${log.message}`)
}
```

### Serve with Hono

```typescript
import { Hono } from 'hono'
import { serve } from 'trigger.do/hono'
import * as tasks from './tasks'

const app = new Hono()

app.all('/api/trigger/*', serve({ tasks }))

export default app
```

## AI-Native Integration

trigger.do integrates with fsx.do and gitx.do for AI agent workflows:

```typescript
import { task } from 'trigger.do'
import { fsx } from 'fsx.do'
import { gitx } from 'gitx.do'

export const aiCodeReview = task({
  id: 'ai-code-review',
  run: async (payload: { repo: string; pr: number }) => {
    // Clone repo using gitx.do
    const repo = await gitx.clone(payload.repo)

    // Read files using fsx.do
    const files = await fsx.readDir(repo.path)
    const changedFiles = await repo.diff(`origin/main...HEAD`)

    // Analyze with AI
    const review = await analyzeCode(changedFiles)

    // Write review comments
    await repo.comment(payload.pr, review)

    return { reviewed: changedFiles.length }
  }
})
```

### MCP Tool Definitions

```typescript
import { defineTool } from 'trigger.do/mcp'

export const triggerTask = defineTool({
  name: 'trigger_task',
  description: 'Trigger a background task',
  parameters: {
    taskId: { type: 'string', description: 'Task identifier' },
    payload: { type: 'object', description: 'Task payload' }
  },
  execute: async ({ taskId, payload }) => {
    const handle = await tasks[taskId].trigger(payload)
    return { runId: handle.id, status: 'triggered' }
  }
})
```

## Retry Policies

```typescript
task({
  id: 'with-retries',
  retry: {
    maxAttempts: 10,        // Max retry attempts
    backoff: 'exponential', // 'exponential' | 'linear' | 'fixed'
    initialDelay: '1s',     // First retry delay
    maxDelay: '1h',         // Maximum delay between retries
    factor: 2,              // Backoff multiplier (exponential)
    jitter: true            // Add randomness to prevent thundering herd
  },
  run: handler
})
```

Default retry policy:
- 3 attempts
- Exponential backoff: 1s, 2s, 4s, 8s...
- Max delay: 1 hour
- Jitter enabled

## Concurrency Control

```typescript
task({
  id: 'limited-concurrency',
  concurrency: {
    limit: 10,                    // Max concurrent runs
    key: 'payload.organizationId' // Per-key limits
  },
  run: handler
})

task({
  id: 'rate-limited',
  rateLimit: {
    limit: 100,
    period: '1m' // 100 per minute
  },
  run: handler
})
```

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

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Unlimited Duration** - Durable Objects have no execution timeout
2. **Global Edge** - Tasks run close to users
3. **No Cold Starts** - Durable Objects stay warm
4. **Built-in Queues** - Reliable job dispatch
5. **Hibernation** - Pay only for active execution

## Related Domains

- **workflows.do** - Workflow orchestration
- **inngest.do** - Event-driven workflows
- **jobs.do** - Simple job queue
- **cron.do** - Scheduled tasks

## License

MIT
