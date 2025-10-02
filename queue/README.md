# Queue Service (WS-104)

Background job processing service using Cloudflare Queues with job tracking in the database.

## Overview

The Queue Service provides a robust background job processing system with the following features:

- **RPC Interface**: Service-to-service job enqueueing via `QueueService` class
- **Job Tracking**: All jobs stored in database with status tracking
- **Retry Logic**: Exponential backoff with configurable max retries
- **Multiple Job Types**: Email, embeddings, crawling, content generation, batch imports, webhooks
- **HTTP API**: Optional REST API for job management
- **Statistics**: Queue health monitoring and metrics

## Architecture

```
┌─────────────┐    RPC Call     ┌─────────────┐
│             │ ────────────────>│             │
│  Service A  │   enqueue(job)   │Queue Service│
│             │<────────────────│             │
└─────────────┘    jobId        └─────────────┘
                                       │
                                       │ 1. Store job in DB
                                       ├──────────────────>┌──────────┐
                                       │                    │    DB    │
                                       │                    └──────────┘
                                       │
                                       │ 2. Send to queue
                                       ├──────────────────>┌──────────┐
                                       │                    │CF Queue  │
                                       │                    └──────────┘
                                       │                         │
                                       │                         │ 3. Batch delivery
                                       │                         v
                                       │                    ┌──────────┐
                                       │                    │Consumer  │
                                       │                    │Worker    │
                                       │                    └──────────┘
                                       │                         │
                                       │ 4. Update job status    │
                                       │<────────────────────────┘
```

## Job Lifecycle

1. **Pending** - Job created and queued
2. **Processing** - Consumer is processing the job
3. **Completed** - Job finished successfully
4. **Failed** - Job failed after max retries

## Usage

### RPC (Service-to-Service)

```typescript
// From another service
const jobId = await env.QUEUE.enqueue({
  type: 'send-email',
  payload: {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thanks for signing up',
  },
  priority: 1,
  maxAttempts: 3,
})

// Check job status
const job = await env.QUEUE.getJob(jobId)
console.log(job.status) // 'pending', 'processing', 'completed', 'failed'

// Retry failed job
await env.QUEUE.retryJob(jobId)

// Get queue statistics
const stats = await env.QUEUE.getStats()
console.log(stats)
// {
//   total: 100,
//   pending: 10,
//   processing: 5,
//   completed: 80,
//   failed: 5,
//   completionRate: '80.00%',
//   failureRate: '5.00%'
// }
```

### HTTP API

```bash
# Enqueue a job
curl -X POST https://queue.workers.dev/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send-email",
    "payload": {
      "to": "user@example.com",
      "subject": "Test",
      "body": "Hello"
    }
  }'

# Get job status
curl https://queue.workers.dev/jobs/{jobId}

# List jobs
curl https://queue.workers.dev/jobs?status=pending&limit=10

# Retry job
curl -X POST https://queue.workers.dev/jobs/{jobId}/retry

# Cancel job
curl -X DELETE https://queue.workers.dev/jobs/{jobId}

# Get statistics
curl https://queue.workers.dev/stats

# Health check
curl https://queue.workers.dev/health
```

## Supported Job Types

### send-email
Send email via email service.

```typescript
{
  type: 'send-email',
  payload: {
    to: 'user@example.com',
    subject: 'Subject',
    body: 'Email body',
    from: 'noreply@example.com' // optional
  }
}
```

### generate-embedding
Generate vector embeddings using AI.

```typescript
{
  type: 'generate-embedding',
  payload: {
    text: 'Text to embed',
    model: '@cf/baai/bge-base-en-v1.5' // optional
  }
}
```

### crawl-website
Crawl and scrape website content.

```typescript
{
  type: 'crawl-website',
  payload: {
    url: 'https://example.com',
    maxPages: 10, // optional
    selectors: { title: 'h1', content: '.article' } // optional
  }
}
```

### generate-content
Generate content using AI.

```typescript
{
  type: 'generate-content',
  payload: {
    prompt: 'Write a blog post about...',
    type: 'article', // optional
    model: '@cf/meta/llama-3.1-8b-instruct' // optional
  }
}
```

### batch-import
Import batch of items to database.

```typescript
{
  type: 'batch-import',
  payload: {
    items: [
      { id: 'item-1', data: { ... } },
      { id: 'item-2', data: { ... } }
    ],
    namespace: 'my-namespace' // optional
  }
}
```

### webhook-delivery
Deliver webhook to external URL.

```typescript
{
  type: 'webhook-delivery',
  payload: {
    url: 'https://webhook.example.com',
    method: 'POST', // optional
    body: { event: 'data' },
    headers: { 'X-Custom': 'value' } // optional
  }
}
```

## Configuration

### wrangler.jsonc

```jsonc
{
  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AI", "service": "ai" }
  ],
  "queues": {
    "producers": [
      {
        "binding": "JOB_QUEUE",
        "queue": "background-jobs"
      }
    ],
    "consumers": [
      {
        "queue": "background-jobs",
        "max_batch_size": 100,
        "max_batch_timeout": 30,
        "max_retries": 3,
        "dead_letter_queue": "background-jobs-dlq"
      }
    ]
  }
}
```

### Retry Configuration

- **Base Delay**: 60 seconds
- **Backoff Strategy**: Exponential (2^attempt)
- **Max Delay**: 3600 seconds (1 hour)
- **Default Max Attempts**: 3

Example retry schedule:
- Attempt 1: Immediate
- Attempt 2: 60 seconds
- Attempt 3: 120 seconds
- Attempt 4: 240 seconds (if max_attempts > 3)

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

Tests cover:
- ✅ Job enqueueing
- ✅ Job status tracking
- ✅ Retry logic
- ✅ Job cancellation
- ✅ Job listing and filtering
- ✅ Statistics calculation
- ✅ All job type processors
- ✅ Job validation

## Integration

### From Other Services

Add service binding in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "QUEUE", "service": "queue" }
  ]
}
```

Use in code:

```typescript
// Enqueue job
const jobId = await env.QUEUE.enqueue({
  type: 'send-email',
  payload: { to: 'user@example.com', subject: 'Hi', body: 'Hello' }
})

// Check status
const job = await env.QUEUE.getJob(jobId)
```

## Monitoring

### Queue Statistics

```typescript
const stats = await env.QUEUE.getStats()
```

Returns:
- `total` - Total jobs
- `pending` - Jobs waiting to be processed
- `processing` - Jobs currently being processed
- `completed` - Successfully completed jobs
- `failed` - Failed jobs
- `completionRate` - Percentage of completed jobs
- `failureRate` - Percentage of failed jobs

### Job Filtering

```typescript
// Get pending jobs
const pending = await env.QUEUE.listJobs({ status: 'pending' })

// Get jobs by type
const emailJobs = await env.QUEUE.listJobs({ type: 'send-email' })

// Pagination
const page1 = await env.QUEUE.listJobs({ limit: 50, offset: 0 })
const page2 = await env.QUEUE.listJobs({ limit: 50, offset: 50 })
```

## Error Handling

Jobs automatically retry on failure with exponential backoff. After max retries:

1. Job status set to `'failed'`
2. Error message stored in job record
3. Message moved to dead letter queue (DLQ)

To manually retry:

```typescript
await env.QUEUE.retryJob(jobId)
```

## Performance

- **Batch Processing**: Up to 100 messages per batch
- **Parallel Processing**: All messages in batch processed concurrently
- **Smart Placement**: Worker placed near DB and AI services
- **Timeout**: 30 second max per batch

## Success Criteria

✅ Job enqueuing via RPC
✅ Job status tracking in database
✅ Queue consumer processing jobs
✅ Retry logic with exponential backoff
✅ Multiple job types supported (6 types)
✅ HTTP API for management
✅ Comprehensive test coverage
✅ All tests passing
✅ Documentation complete

## Dependencies

- **DB Service** - Job storage and tracking
- **AI Service** - Embeddings and content generation
- **Cloudflare Queues** - Message queueing infrastructure

## Related

- WS-001: Database Service (@db/)
- WS-002: AI Service (@ai/)
- api.services/events/ - Original queue implementation

## Deployment

```bash
# Deploy to production
pnpm deploy

# Create queue (first time only)
wrangler queues create background-jobs
wrangler queues create background-jobs-dlq
```

## License

Private - dot-do organization
