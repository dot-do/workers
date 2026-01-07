# Trigger Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Trigger.dev alternative - background jobs with great DX, unlimited execution time, and AI-native integration.

**Package:** `trigger.do` (we own the domain!)

**Core Primitives:**
- Durable Objects - Unlimited execution time and state persistence
- Cloudflare Queues - Reliable job dispatch and delivery
- Alarms - Cron-based scheduled task triggers
- WebSockets - Real-time log streaming

## Reference Documents

1. **../inngest/README.md** - Similar pattern for event-driven workflows
2. **../CLAUDE.md** - General rewrites guidance and TDD patterns
3. **../fsx/README.md** - Reference rewrite pattern with MCP

## Key Trigger.dev Concepts

### Tasks
```typescript
export const myTask = task({
  id: 'my-task',
  retry: { maxAttempts: 3, backoff: 'exponential' },
  run: async (payload: { data: string }) => {
    const result = await processData(payload.data)
    return { success: true, result }
  }
})
```

### Checkpointing
```typescript
run: async (payload, { checkpoint }) => {
  await checkpoint('step-1', { progress: 0.5 })
  // ... more work
  await checkpoint('step-2', { progress: 1.0 })
}
```

### Scheduled Tasks
```typescript
export const scheduled = schedules.task({
  id: 'daily-job',
  cron: '0 9 * * *',
  run: async () => { /* ... */ }
})
```

### Triggers
```typescript
await myTask.trigger({ data: 'hello' })
const handle = await myTask.trigger({ data: 'world' })
const result = await handle.result()
```

## Architecture

```
trigger/
  src/
    core/                 # Business logic
      task-registry.ts       # task() definition and registry
      scheduler.ts           # Cron expression parsing
      retry-policy.ts        # Retry with backoff
      checkpoint.ts          # Checkpoint management
    durable-object/       # DO implementations
      TaskDO.ts              # Task definition storage
      RunDO.ts               # Individual run state
      SchedulerDO.ts         # Cron triggers via Alarms
    queue/                # Queue integration
      dispatcher.ts          # Job dispatch
      consumer.ts            # Job execution
    sdk/                  # Client SDK
      trigger.ts             # trigger.do client
      types.ts               # TypeScript types
    mcp/                  # AI tool definitions
      tools.ts               # MCP tool definitions
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
bd update trigger-xxx --status in_progress

# After tests pass
bd close trigger-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Task Definition (trigger-001 to trigger-003)
1. [RED] Test task() API surface - define tasks with id, retry, run
2. [GREEN] Implement task registry with type-safe definitions
3. [REFACTOR] Extract retry policy configuration

### Phase 2: Task Execution (trigger-004 to trigger-006)
1. [RED] Test RunDO state management and checkpointing
2. [GREEN] Implement RunDO with SQLite state persistence
3. [REFACTOR] Optimize checkpoint storage

### Phase 3: Scheduling (trigger-007 to trigger-009)
1. [RED] Test cron expression parsing and scheduling
2. [GREEN] Implement SchedulerDO with Alarms
3. [REFACTOR] Support multiple cron expressions

### Phase 4: Queue Integration (trigger-010 to trigger-012)
1. [RED] Test job dispatch and consumption
2. [GREEN] Implement Queues-based dispatcher
3. [REFACTOR] Add priority queues

### Phase 5: Real-time Logs (trigger-013 to trigger-015)
1. [RED] Test WebSocket log streaming
2. [GREEN] Implement real-time log delivery
3. [REFACTOR] Add log persistence and replay

### Phase 6: AI Integration (trigger-016 to trigger-018)
1. [RED] Test MCP tool definitions
2. [GREEN] Implement fsx.do/gitx.do integration
3. [REFACTOR] Add AI-friendly task templates

### Phase 7: SDK Compatibility (trigger-019 to trigger-021)
1. [RED] Test Trigger.dev API compatibility
2. [GREEN] Implement compatible trigger() API
3. [REFACTOR] Full TypeScript type parity

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

## AI Integration Patterns

trigger.do is AI-native. Tasks can integrate with:

- **fsx.do** - Read/write files during task execution
- **gitx.do** - Git operations (clone, commit, push)
- **llm.do** - AI model calls within tasks

```typescript
import { fsx } from 'fsx.do'
import { gitx } from 'gitx.do'
import { llm } from 'llm.do'

export const aiTask = task({
  id: 'ai-assisted',
  run: async ({ repoUrl }) => {
    const repo = await gitx.clone(repoUrl)
    const files = await fsx.glob(repo.path, '**/*.ts')
    const analysis = await llm.complete({
      model: 'claude-3-opus',
      prompt: `Analyze these files: ${files.join(', ')}`
    })
    return { analysis }
  }
})
```
