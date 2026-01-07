# Temporal Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Temporal alternative - durable workflow execution for microservices orchestration without managing infrastructure.

**Package:** `@dotdo/temporal` with domain `temporal.do`

**Core Primitives:**
- Cloudflare Durable Objects - Workflow execution isolation
- SQLite - Event history and state persistence
- Cloudflare Queues - Task dispatch and activity execution
- R2 - Long-term history archival
- MCP Tools - AI-native workflow management via fsx.do/gitx.do

## Reference Documents

1. **../inngest/README.md** - Similar workflow rewrite pattern
2. **../CLAUDE.md** - General rewrites guidance and TDD patterns
3. **../fsx/README.md** - Reference DO architecture

## Key Temporal Concepts

### Workflows
```typescript
const workflow = temporal.defineWorkflow(
  'order-workflow',
  async (ctx, order: Order) => {
    const validated = await ctx.activity('validate', () => validateOrder(order))
    await ctx.sleep('wait', '5m')
    const approval = await ctx.waitForSignal('approval', { timeout: '24h' })
    return { orderId: order.id, status: 'completed' }
  }
)
```

### Activities (Durable Execution)
- `ctx.activity(id, fn, opts)` - Execute with automatic retry
- `ctx.sleep(id, duration)` - Pause workflow execution
- `ctx.sleepUntil(id, date)` - Pause until timestamp
- `ctx.waitForSignal(name, opts)` - Wait for external signal
- `ctx.executeChild(workflow, opts)` - Execute child workflow

### Signals and Queries
```typescript
// Query workflow state
const status = await handle.query('status')

// Send signal to workflow
await handle.signal('approval', { approved: true })
```

### Retry Policies
- `initialInterval` - First retry delay
- `backoffCoefficient` - Exponential backoff multiplier
- `maximumAttempts` - Max retry count
- `maximumInterval` - Cap on retry delay
- `nonRetryableErrors` - Errors that skip retry

## Architecture

```
temporal/
  src/
    core/                 # Business logic
      workflow-runtime.ts     # Workflow execution engine
      activity-executor.ts    # Activity retry and timeout
      history-replayer.ts     # Deterministic replay
      signal-handler.ts       # Signal/query dispatch
    durable-object/       # DO implementations
      WorkflowDO.ts           # Workflow execution state
      ActivityDO.ts           # Activity retry isolation
      TimerDO.ts              # Sleep and schedule management
      HistoryDO.ts            # Event sourcing persistence
    queue/                # Queue integration
      task-dispatcher.ts      # Activity task dispatch
      timer-processor.ts      # Timer wake-up processing
    sdk/                  # Client SDK
      temporal.ts             # Temporal class
      workflow.ts             # Workflow handle
      types.ts                # TypeScript types
    mcp/                  # AI-native tools
      tools.ts                # MCP tool definitions
      fsx-integration.ts      # fsx.do state persistence
      gitx-integration.ts     # gitx.do versioning
  .beads/                 # Issue tracking
  AGENTS.md               # This file
  README.md               # User documentation
```

## TDD Workflow

Follow strict TDD for all implementation:

```bash
# Find ready work (RED tests first)
bd ready

# Claim work
bd update temporal-xxx --status in_progress

# After tests pass
bd close temporal-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Workflow Definition (temporal-001)
1. [RED] Test defineWorkflow() API surface
2. [GREEN] Implement workflow registry
3. [REFACTOR] TypeScript generics for type safety

### Phase 2: Activity Execution (temporal-002)
1. [RED] Test ctx.activity() with retry
2. [GREEN] Implement ActivityDO with retry logic
3. [REFACTOR] Configurable retry policies

### Phase 3: Event History (temporal-003)
1. [RED] Test event history recording
2. [GREEN] Implement HistoryDO with event sourcing
3. [REFACTOR] History replay for recovery

### Phase 4: Signals and Queries (temporal-004)
1. [RED] Test signal delivery and queries
2. [GREEN] Implement signal/query handlers
3. [REFACTOR] Type-safe signal definitions

### Phase 5: Timers and Sleep (temporal-005)
1. [RED] Test ctx.sleep() and schedules
2. [GREEN] Implement TimerDO with Durable Object alarms
3. [REFACTOR] Cron schedule support

### Phase 6: Child Workflows (temporal-006)
1. [RED] Test ctx.executeChild()
2. [GREEN] Implement child workflow dispatch
3. [REFACTOR] Workflow composition patterns

### Phase 7: MCP Integration (temporal-007)
1. [RED] Test MCP tool invocations
2. [GREEN] Implement MCP tools for workflow management
3. [REFACTOR] fsx.do/gitx.do integration

### Phase 8: SDK Compatibility (temporal-008)
1. [RED] Test API surface vs Temporal SDK
2. [GREEN] Implement compatible client
3. [REFACTOR] Worker setup and configuration

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
bd dep tree <id>      # View dependency tree
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Testing Commands

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```
