# Inngest Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Inngest alternative - event-driven durable workflow execution without managing queues, infra, or state.

**Package:** `@dotdo/inngest` with domains `workflows.do` / `triggers.do`

**Core Primitives:**
- Cloudflare Workflows - Durable multi-step execution
- Cloudflare Queues - Event routing and delivery
- Durable Objects - Step memoization and concurrency
- Cron Triggers - Scheduled function execution

## Reference Documents

1. **../workflows/SCOPE.md** - Complete workflows platform analysis
2. **../CLAUDE.md** - General rewrites guidance and TDD patterns
3. **../supabase/README.md** - Reference rewrite pattern

## Key Inngest Concepts

### Functions
```typescript
inngest.createFunction(
  { id: 'sync-user', concurrency: { limit: 10 } },
  { event: 'user/created' },
  async ({ event, step }) => {
    const user = await step.run('fetch-user', () => fetchUser(event.data.id))
    await step.sleep('wait-for-sync', '5m')
    await step.run('sync-crm', () => syncToCRM(user))
  }
)
```

### Steps (Durable Execution)
- `step.run(id, fn)` - Execute and memoize result
- `step.sleep(id, duration)` - Pause execution
- `step.sleepUntil(id, date)` - Pause until timestamp
- `step.waitForEvent(id, opts)` - Wait for external event
- `step.invoke(id, fn)` - Invoke another function

### Events
```typescript
await inngest.send({ name: 'user/created', data: { id: '123' } })
```

### Concurrency Control
- `concurrency.limit` - Max parallel executions
- `concurrency.key` - Per-key limits (e.g., per user)
- `throttle` - Rate limiting (e.g., 10/minute)
- `debounce` - Wait for quiet period

## Architecture

```
inngest/
  src/
    core/                 # Business logic
      function-registry.ts    # createFunction() registry
      step-executor.ts        # Step execution with memoization
      event-router.ts         # Event pattern matching
    durable-object/       # DO implementations
      StepDO.ts              # Step state and execution
      EventDO.ts             # Event subscriptions
      ConcurrencyDO.ts       # Rate limiting
    queue/                # Queue integration
      producer.ts            # Event publishing
      consumer.ts            # Event dispatch
    sdk/                  # Client SDK
      inngest.ts             # Inngest class
      types.ts               # TypeScript types
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
bd update inngest-xxx --status in_progress

# After tests pass
bd close inngest-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Function Definition (inngest-llm)
1. [RED] Test createFunction() API surface
2. [GREEN] Implement function registry
3. [REFACTOR] Hot reloading support

### Phase 2: Step Execution (inngest-14q)
1. [RED] Test step.run() memoization
2. [GREEN] Implement StepDO with event sourcing
3. [REFACTOR] Step result caching

### Phase 3: Event Triggers (inngest-fhb)
1. [RED] Test event routing
2. [GREEN] Implement event bus with Queues
3. [REFACTOR] Fan-out optimization

### Phase 4: Concurrency Control (inngest-la6)
1. [RED] Test concurrency limits
2. [GREEN] Implement ConcurrencyDO
3. [REFACTOR] Distributed rate limiting

### Phase 5: SDK Compatibility (inngest-7yw)
1. [RED] Test API surface
2. [GREEN] Implement compatible client
3. [REFACTOR] TypeScript types

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
