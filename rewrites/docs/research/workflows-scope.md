# Workflows Rewrite Scoping Document

## Executive Summary

This document scopes the `workflows.do` / `jobs.do` rewrite - a Cloudflare-native alternative to platforms like Inngest, Trigger.dev, Temporal, Windmill, Upstash QStash, and Defer. The goal is to provide a unified workflow orchestration and background job platform built entirely on Cloudflare primitives: Workflows, Queues, Durable Objects, and Cron Triggers.

---

## Platform Competitive Analysis

### 1. Inngest - Event-Driven Durable Execution

**Core Value Proposition:**
- "Event-driven durable execution platform without managing queues, infra, or state"
- Abstracts queueing, scaling, concurrency, throttling, rate limiting, and observability

**Key Features:**
| Feature | Implementation |
|---------|---------------|
| **Workflow Definition** | Code-based with TypeScript/Python/Go SDKs |
| **Durable Steps** | `step.run()`, `step.sleep()`, `step.sleepUntil()`, `step.waitForEvent()`, `step.invoke()` |
| **Triggers** | Events, cron schedules, webhooks |
| **Retry Policy** | Step-level automatic retries with memoization |
| **Concurrency** | Step-level limits with keys (per-user/per-tenant queues) |
| **Throttling** | Function-level rate limiting (e.g., 3 runs/minute) |
| **State** | Each step result saved, skipped on replay |

**Architecture Insight:**
- Each step executes as a separate HTTP request
- Step IDs used for memoization across function versions
- Supports `onError: 'continue' | 'retry' | 'fail'`

**Cloudflare Mapping:**
- `step.run()` -> CF Workflow step with DO state
- `step.sleep()` -> CF Workflow `step.sleep()` or DO Alarm
- `step.waitForEvent()` -> DO WebSocket hibernation or Queue consumer
- Concurrency keys -> DO sharding by key

---

### 2. Trigger.dev - Background Jobs for AI/Long-Running Tasks

**Core Value Proposition:**
- "Build AI workflows and background tasks in TypeScript"
- No execution timeouts, elastic scaling, zero infrastructure management

**Key Features:**
| Feature | Implementation |
|---------|---------------|
| **Task Definition** | TypeScript functions with retry config |
| **Scheduling** | Cron-based, imperative via SDK |
| **Retry Policy** | Configurable attempts with exponential backoff |
| **Concurrency** | Queue-based concurrency management |
| **Checkpointing** | Automatic checkpoint-resume for fault tolerance |
| **Observability** | Real-time dashboard, distributed tracing, alerts |
| **Realtime** | Stream LLM responses to frontend |

**Architecture Insight:**
- Workers poll task queues, execute code, report results
- Atomic versioning prevents code changes affecting in-progress tasks
- Human-in-the-loop via "waitpoint tokens"

**Cloudflare Mapping:**
- Task queues -> Cloudflare Queues
- Long-running tasks -> CF Workflows (no timeouts)
- Checkpointing -> DO state persistence
- Realtime -> DO WebSocket broadcasts

---

### 3. Temporal - Enterprise Workflow Orchestration

**Core Value Proposition:**
- "Durable execution - guaranteeing code completion regardless of failures"
- Applications automatically recover from crashes by replaying execution history

**Key Features:**
| Feature | Implementation |
|---------|---------------|
| **Workflows** | Define business logic with guaranteed completion |
| **Activities** | Encapsulate failure-prone operations with retries |
| **Workers** | Poll task queues, execute code, report results |
| **History** | Detailed event history for replay recovery |
| **Retry Policy** | Exponential backoff with `MaximumInterval` and `MaximumAttempts` |
| **Failure Types** | Transient, intermittent, permanent classification |

**Error Recovery Strategies:**
- **Forward Recovery**: Retry until success
- **Backward Recovery**: Undo completed actions (compensating transactions)

**Architecture Insight:**
- Workflow state = event sourcing (replay to reconstruct)
- Activities can run indefinitely with heartbeat monitoring
- Scale: 200+ million executions/second on Temporal Cloud

**Cloudflare Mapping:**
- Event sourcing -> DO SQLite with event log table
- Workers -> CF Workers processing Queue messages
- Heartbeats -> DO Alarms for timeout detection
- Compensating transactions -> Step-level rollback handlers

---

### 4. Windmill - Open-Source Workflows + Internal Tools

**Core Value Proposition:**
- "Fast, open-source workflow engine and developer platform"
- Combines code flexibility with low-code speed

**Key Features:**
| Feature | Implementation |
|---------|---------------|
| **Languages** | TypeScript, Python, Go, PHP, Bash, SQL, Rust, Docker |
| **Execution** | Scalable worker fleet for low-latency function execution |
| **Orchestration** | Assembles functions into efficient flows |
| **Integration** | Webhooks, open API, scheduler, Git sync |
| **Enterprise** | Built-in permissioning, secret management, OAuth |

**Cloudflare Mapping:**
- Multi-language -> Worker Loader (sandboxed execution)
- Worker fleet -> Cloudflare's global network
- Secret management -> Workers Secrets + Vault integration

---

### 5. Upstash QStash - Serverless Messaging

**Core Value Proposition:**
- "Serverless messaging and scheduling solution"
- Guaranteed delivery without infrastructure management

**Key Features:**
| Feature | Implementation |
|---------|---------------|
| **Messaging** | Publish messages up to 1MB (JSON, XML, binary) |
| **Scheduling** | Future-dated message delivery |
| **Retry Policy** | Automatic retries on failure |
| **Dead Letter Queue** | Manual intervention for persistently failed messages |
| **Fan-out** | URL Groups for parallel delivery |
| **FIFO** | Queue ordering for sequential processing |
| **Rate Limiting** | Parallelism controls |
| **Callbacks** | Delivery confirmations |
| **Deduplication** | Prevent duplicate delivery |

**Upstash Workflow SDK:**
- Step-based architecture (each step = separate request)
- Failed step retries without re-executing prior steps
- Parallel processing with coordinated completion
- Extended delays (days, weeks, months)

**Cloudflare Mapping:**
- Messaging -> Cloudflare Queues
- Dead Letter Queue -> Queue DLQ configuration
- FIFO -> Queue with single consumer
- Fan-out -> Multiple queue bindings
- Deduplication -> DO-based message tracking with TTL

---

### 6. Defer (Acquired by Digger)

**Core Value Proposition:**
- Background functions for existing codebases
- Zero-config deployment

**Status:** Acquired - redirect to digger.tools

---

## Cloudflare Native Primitives

### Cloudflare Workflows (New!)

**Key Capabilities:**
- Durable multi-step execution without timeouts
- Automatic retries and error handling
- Pause for external events or approvals
- State persistence for minutes, hours, or weeks
- `step.sleep()` and `step.sleepUntil()` for delays
- Built-in observability and debugging

**API Pattern:**
```typescript
import { WorkflowEntrypoint } from 'cloudflare:workers'

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const result1 = await step.do('step-1', async () => {
      return await this.env.SERVICE.doSomething()
    })

    await step.sleep('wait-period', '1 hour')

    const result2 = await step.do('step-2', async () => {
      return await processResult(result1)
    })

    return result2
  }
}
```

### Cloudflare Queues

**Key Capabilities:**
- Guaranteed delivery
- Batching, retries, and message delays
- Dead Letter Queues for failed messages
- Pull-based consumers for external access
- No egress charges

**Configuration:**
- Delivery Delay: 0-43,200 seconds
- Message Retention: 60-1,209,600 seconds (default: 4 days)
- Max Retries: Default 3
- Max Batch Size: Default 10
- Max Concurrency: Autoscales when unset

### Cloudflare Cron Triggers

**Key Capabilities:**
- Five-field cron expressions with Quartz extensions
- Execute on UTC time
- Propagation delay: up to 15 minutes
- Can bind directly to Workflows
- Green Compute option (renewable energy only)

**Examples:**
- `* * * * *` - Every minute
- `*/30 * * * *` - Every 30 minutes
- `0 17 * * sun` - 17:00 UTC Sundays
- `59 23 LW * *` - Last weekday of month at 23:59 UTC

### Durable Objects

**Key Capabilities:**
- Globally-unique named instances
- Transactional, strongly consistent SQLite storage
- In-memory state coordination
- WebSocket hibernation for client connections
- Alarms for scheduled compute

---

## Architecture Vision

```
workflows.do / jobs.do
├── packages/
│   ├── workflows.do/           # SDK (exists)
│   └── jobs.do/                # SDK (background jobs focus)
│
├── workers/workflows/          # Worker (exists)
│   ├── src/
│   │   ├── workflows.ts        # WorkflowsDO implementation
│   │   ├── scheduler.ts        # Cron + schedule management
│   │   ├── queue-consumer.ts   # Queue message processing
│   │   └── observability.ts    # Metrics + logging
│   └── wrangler.jsonc
│
└── rewrites/workflows/         # Enhanced rewrite (new)
    ├── src/
    │   ├── core/
    │   │   ├── workflow-engine.ts      # CF Workflows integration
    │   │   ├── step-executor.ts        # Step execution with memoization
    │   │   ├── event-router.ts         # Event pattern matching
    │   │   └── schedule-parser.ts      # Natural schedule parsing
    │   │
    │   ├── durable-object/
    │   │   ├── WorkflowOrchestrator.ts # Main DO for workflow state
    │   │   ├── JobQueue.ts             # Per-tenant job queuing
    │   │   └── ScheduleManager.ts      # Alarm-based scheduling
    │   │
    │   ├── queue/
    │   │   ├── producer.ts             # Queue message publishing
    │   │   ├── consumer.ts             # Queue message processing
    │   │   └── dlq-handler.ts          # Dead letter queue processing
    │   │
    │   ├── triggers/
    │   │   ├── cron.ts                 # Cron trigger handling
    │   │   ├── webhook.ts              # Webhook trigger handling
    │   │   └── event.ts                # Event trigger handling
    │   │
    │   ├── storage/
    │   │   ├── event-store.ts          # Event sourcing for workflow history
    │   │   ├── state-store.ts          # Workflow state persistence
    │   │   └── metrics-store.ts        # Observability data
    │   │
    │   └── api/
    │       ├── rest.ts                 # REST API (Hono)
    │       ├── rpc.ts                  # RPC interface
    │       └── websocket.ts            # Real-time streaming
    │
    ├── .beads/                         # Issue tracking
    └── CLAUDE.md                       # AI guidance
```

---

## Feature Comparison Matrix

| Feature | Inngest | Trigger.dev | Temporal | workflows.do (Target) |
|---------|---------|-------------|----------|----------------------|
| **Step Functions** | Yes | Yes | Activities | Yes (CF Workflows) |
| **Durable Execution** | Yes | Yes | Yes | Yes (DO + CF Workflows) |
| **Event Triggers** | Yes | Yes | Yes | Yes |
| **Cron Schedules** | Yes | Yes | Via triggers | Yes (Cron Triggers) |
| **Webhooks** | Yes | Yes | Via signals | Yes |
| **Retry Policies** | Step-level | Task-level | Activity-level | Step-level |
| **Concurrency Keys** | Yes | Yes | Task queues | Yes (DO sharding) |
| **Rate Limiting** | Yes | Yes | Via config | Yes |
| **Dead Letter Queue** | Yes | Yes | Via config | Yes (Queue DLQ) |
| **Human-in-the-Loop** | waitForEvent | waitpoint | Signals | waitForEvent |
| **Long-Running** | Yes | Yes | Yes | Yes (no timeout) |
| **Observability** | Dashboard | Dashboard | Web UI | Dashboard |
| **Multi-Language** | TS/Py/Go | TypeScript | Many | TypeScript |
| **Self-Hosted** | No | No | Yes | Yes (CF Workers) |
| **Edge-Native** | No | No | No | Yes (global) |

---

## Cloudflare-Native Advantages

### 1. Zero Cold Start for Jobs
- Durable Objects maintain warm state
- Queue consumers always ready
- Cron triggers execute immediately

### 2. Global Edge Execution
- Workflows run close to users
- Reduced latency for event processing
- Automatic geo-routing

### 3. Integrated Primitives
- Queues for job distribution
- Workflows for long-running processes
- DO for state management
- Alarms for scheduling
- No external dependencies

### 4. Cost Efficiency
- Pay per request, not per server
- No idle costs
- Free tier generous for testing

### 5. Built-in Security
- Workers isolation
- Secrets management
- mTLS for service-to-service

---

## Implementation Phases

### Phase 1: Core Workflow Engine (Week 1-2)

**Goals:**
- Integrate with Cloudflare Workflows primitive
- Implement step execution with memoization
- Add basic retry policies

**Tasks:**
1. Create `WorkflowOrchestrator` DO
2. Implement `step.do()`, `step.sleep()`, `step.sleepUntil()`
3. Add step-level retry with exponential backoff
4. Persist step results for replay

### Phase 2: Event & Trigger System (Week 2-3)

**Goals:**
- Event pattern matching ($.on.Noun.event)
- Cron schedule parsing and execution
- Webhook trigger handling

**Tasks:**
1. Implement event router with glob patterns
2. Parse natural language schedules (`$.every.5.minutes`)
3. Connect to Cron Triggers
4. Add webhook authentication

### Phase 3: Queue Integration (Week 3-4)

**Goals:**
- Job queuing with Cloudflare Queues
- Concurrency controls and rate limiting
- Dead letter queue handling

**Tasks:**
1. Create queue producer/consumer
2. Implement concurrency keys (per-user queues)
3. Add rate limiting with DO counters
4. Configure DLQ with retry exhaustion

### Phase 4: Observability & Dashboard (Week 4-5)

**Goals:**
- Workflow execution history
- Real-time streaming
- Metrics and alerting

**Tasks:**
1. Event sourcing for complete history
2. WebSocket streaming via DO
3. Metrics storage and querying
4. Alert webhook integration

### Phase 5: Advanced Features (Week 5-6)

**Goals:**
- Human-in-the-loop (waitForEvent)
- Parallel step execution
- Compensating transactions

**Tasks:**
1. Implement `step.waitForEvent()` with token
2. Add parallel step execution with `Promise.all`
3. Define rollback handlers per step
4. Test complex workflow patterns

---

## Data Model

### Workflow Definition (SQLite)

```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  definition JSON NOT NULL,  -- steps, events, schedules
  timeout_ms INTEGER,
  on_error TEXT DEFAULT 'fail',
  version INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE triggers (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'event' | 'schedule' | 'webhook'
  pattern TEXT,        -- Event pattern or cron expression
  config JSON,         -- Additional trigger config
  enabled INTEGER DEFAULT 1,
  last_triggered_at INTEGER,
  trigger_count INTEGER DEFAULT 0,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);
```

### Execution State (SQLite)

```sql
CREATE TABLE executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  input JSON,
  state JSON,
  current_step TEXT,
  error TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE TABLE step_results (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL,
  input JSON,
  output JSON,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'step' | 'event' | 'schedule' | 'error'
  name TEXT NOT NULL,
  data JSON,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (execution_id) REFERENCES executions(id)
);
```

---

## API Design

### REST API

```
POST   /api/workflows              # Create workflow
GET    /api/workflows              # List workflows
GET    /api/workflows/:id          # Get workflow
PUT    /api/workflows/:id          # Update workflow
DELETE /api/workflows/:id          # Delete workflow

POST   /api/workflows/:id/start    # Start execution
GET    /api/executions             # List executions
GET    /api/executions/:id         # Get execution
POST   /api/executions/:id/pause   # Pause execution
POST   /api/executions/:id/resume  # Resume execution
POST   /api/executions/:id/cancel  # Cancel execution
POST   /api/executions/:id/retry   # Retry execution
GET    /api/executions/:id/history # Get execution history

POST   /api/events                 # Send event
POST   /api/webhooks/:path         # Webhook trigger
```

### RPC Interface (rpc.do pattern)

```typescript
interface WorkflowsRPC {
  // Workflow CRUD
  createWorkflow(definition: WorkflowDefinition): Promise<Workflow>
  getWorkflow(id: string): Promise<Workflow | null>
  updateWorkflow(id: string, updates: Partial<WorkflowDefinition>): Promise<Workflow>
  deleteWorkflow(id: string): Promise<boolean>
  listWorkflows(options?: ListOptions): Promise<Workflow[]>

  // Execution
  startWorkflow(id: string, input?: unknown): Promise<Execution>
  getExecution(id: string): Promise<Execution | null>
  pauseExecution(id: string): Promise<boolean>
  resumeExecution(id: string): Promise<boolean>
  cancelExecution(id: string): Promise<boolean>
  retryExecution(id: string): Promise<Execution>
  listExecutions(options?: ListOptions): Promise<Execution[]>

  // Events & Triggers
  sendEvent(type: string, data: unknown): Promise<void>
  registerTrigger(workflowId: string, trigger: Trigger): Promise<RegisteredTrigger>
  unregisterTrigger(workflowId: string): Promise<boolean>
  listTriggers(options?: TriggerListOptions): Promise<RegisteredTrigger[]>

  // Observability
  getHistory(executionId: string): Promise<HistoryEntry[]>
  getMetrics(workflowId?: string): Promise<Metrics>
}
```

---

## Key Design Decisions

### 1. Workflow State Persistence

**Decision:** Event sourcing with SQLite in Durable Objects

**Rationale:**
- Complete replay capability (like Temporal)
- Step-level memoization (like Inngest)
- Strongly consistent (DO guarantees)
- Query-friendly for observability

### 2. Exactly-Once Semantics

**Decision:** Step ID-based deduplication

**Implementation:**
- Each step has unique ID within workflow
- Step results cached in DO storage
- On replay, skip steps with cached results
- Idempotency requirement documented for handlers

### 3. Long-Running Workflow Support

**Decision:** CF Workflows + DO Alarms hybrid

**Implementation:**
- Short workflows: CF Workflows primitive
- Long waits: DO Alarms for wake-up
- External events: DO WebSocket hibernation
- Timeouts: Configurable per workflow

### 4. Error Handling Patterns

**Decision:** Step-level configuration with sensible defaults

**Options per step:**
- `onError: 'fail'` - Stop workflow (default)
- `onError: 'continue'` - Skip step, continue
- `onError: 'retry'` - Retry with backoff

**Retry Policy:**
```typescript
{
  maxAttempts: 3,
  initialIntervalMs: 1000,
  backoffCoefficient: 2.0,
  maxIntervalMs: 60000
}
```

### 5. Concurrency Control

**Decision:** DO sharding by concurrency key

**Implementation:**
- Default: One DO per workflow
- With key: One DO per `{workflowId}:{key}`
- Rate limiting: Counter in DO with sliding window
- Throttling: Delay queue processing

---

## Testing Strategy

### Unit Tests
- Step execution logic
- Event pattern matching
- Schedule parsing
- Retry policy calculations

### Integration Tests
- Queue producer/consumer
- Cron trigger execution
- Webhook authentication
- DO state persistence

### E2E Tests
- Complete workflow execution
- Failure and retry scenarios
- Long-running workflow with sleeps
- Event-triggered workflows

---

## Migration Path

### From Inngest
```typescript
// Inngest
inngest.createFunction(
  { id: 'sync-user' },
  { event: 'user/created' },
  async ({ event, step }) => {
    await step.run('sync', () => syncUser(event.data))
  }
)

// workflows.do
workflows.define($ => {
  $.on.user.created(async (data, $) => {
    await $.do('sync', () => syncUser(data))
  })
})
```

### From Trigger.dev
```typescript
// Trigger.dev
export const myTask = task({
  id: 'my-task',
  retry: { maxAttempts: 3 },
  run: async (payload) => { ... }
})

// workflows.do
workflows.steps('my-task', {
  steps: [
    { name: 'main', action: 'my-action', retry: { attempts: 3 } }
  ]
})
```

---

## Success Metrics

1. **Reliability:** 99.99% execution completion rate
2. **Performance:** P99 step execution < 100ms
3. **Scale:** Support 10K concurrent workflows per account
4. **DX:** Workflow definition in < 10 lines of code
5. **Observability:** Full history available within 1s of event

---

## Open Questions

1. **Naming:** `workflows.do` vs `jobs.do` vs both?
   - `workflows.do` - Complex multi-step orchestration
   - `jobs.do` - Simple background job queue
   - Recommendation: Both SDKs, shared infrastructure

2. **Pricing Model:** Per execution? Per step? Per second?
   - Align with CF pricing (requests + duration)

3. **SDK Parity:** Support Python/Go like Inngest?
   - Phase 1: TypeScript only
   - Phase 2: Evaluate demand

4. **Self-Hosted:** Allow customers to run own workers?
   - Yes - CF Workers deploy anywhere
   - Provide wrangler.jsonc template

---

## References

- [Cloudflare Workflows Docs](https://developers.cloudflare.com/workflows)
- [Cloudflare Queues Docs](https://developers.cloudflare.com/queues)
- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Temporal Documentation](https://docs.temporal.io)
- [Upstash QStash Documentation](https://upstash.com/docs/qstash)
- [Windmill Documentation](https://www.windmill.dev/docs)
- [Existing workflows.do Implementation](/Users/nathanclevenger/projects/workers/workers/workflows/src/workflows.ts)
