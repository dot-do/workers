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

## Resilience That Reads Like English

Configure retry and concurrency with fluent methods:

```typescript
// Retry with exponential backoff
const job = trigger`process video ${videoId}`
  .retry(10)
  .backoff('exponential')
  .jitter()

// Concurrency per user
await trigger`sync data for ${userId}`
  .concurrency(5, 'userId')
  .rateLimit(100, '1m')

// Chain them naturally
await trigger`download, encode, upload ${videoId}`
  .retry(3)
  .backoff('exponential')
  .concurrency(10)
  .checkpoint('each-stage')
```

### Full Control, Still Natural

```typescript
// Video processing with checkpoints
const processed = await trigger`process video ${videoId}`
  .retry(3)
  .backoff('exponential')
  .concurrency(10)
  .map(async (video) => {
    const downloaded = await downloadVideo(video.id)
    return { downloaded, size: downloaded.size }
  })
  .checkpoint('downloaded')
  .map(({ downloaded }) => encodeVideo(downloaded))
  .checkpoint('encoded')
  .map(encoded => uploadToStorage(encoded))

// Scheduled cleanup - say it like you mean it
trigger`every day at 3am: cleanup old files, compact database`

// Or with explicit cron
trigger`0 3 * * *: cleanup and compact`
```

### Retry Strategies

```typescript
// Exponential backoff with jitter
trigger`call flaky API for ${customerId}`
  .retry(10)
  .backoff('exponential')
  .initialDelay('1s')
  .maxDelay('1h')
  .jitter()

// Linear backoff for rate limits
trigger`sync to third-party ${service}`
  .retry(5)
  .backoff('linear')
  .initialDelay('30s')

// Fixed delay for retries
trigger`send webhook to ${endpoint}`
  .retry(3)
  .backoff('fixed', '10s')
```

### Concurrency That Makes Sense

```typescript
// Per-org concurrency
trigger`import data for ${orgId}`
  .concurrency(10, 'orgId')

// Global rate limit
trigger`call external API`
  .rateLimit(100, '1m')

// Both together
trigger`sync ${customerId} data to ${service}`
  .concurrency(5, 'customerId')
  .rateLimit(1000, '1h')
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

AI agents manage jobs with natural language:

```typescript
import { trigger } from 'trigger.do'

// List jobs
await trigger`list all running jobs`
await trigger`show failed jobs from yesterday`
await trigger`what's queued for video processing?`

// Monitor jobs
await trigger`status of job ${runId}`
await trigger`logs for ${runId}`
await trigger`why did ${runId} fail?`

// Control jobs
await trigger`cancel ${runId}`
await trigger`retry all failed jobs from today`
await trigger`pause video processing queue`

// Bulk operations
await trigger`failed jobs this week`
  .map(job => trigger`retry ${job}`)

await trigger`stuck jobs older than 1 hour`
  .map(job => trigger`cancel and restart ${job}`)
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
