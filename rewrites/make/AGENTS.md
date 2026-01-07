# Make Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Make.com (Integromat) alternative - visual scenario builder with advanced data routing.

**Package:** `@dotdo/make` with domains `make.do` / `automation.do`

**Core Primitives:**
- Cloudflare Durable Objects - Scenario orchestration and module state
- Cloudflare Queues - Module execution pipeline
- Cloudflare Workers - Webhook triggers and API
- MCP Integration - fsx.do, gitx.do, llm.do for AI-native automation

## Reference Documents

1. **../inngest/README.md** - Similar workflow pattern
2. **../CLAUDE.md** - General rewrites guidance and TDD patterns
3. **../fsx/README.md** - Reference rewrite pattern for MCP integration

## Key Make.com Concepts

### Scenarios
```typescript
make.createScenario({
  id: 'sync-leads',
  trigger: { type: 'webhook', path: '/leads' },
  modules: [
    { id: 'fetch', type: 'http', action: 'GET', url: '...' },
    { id: 'route', type: 'router', routes: [...] }
  ]
})
```

### Module Types
- **Triggers** - webhook, cron, email, schedule
- **Actions** - http, fsx, gitx, llm, app-specific
- **Flow Control** - router, filter, iterator, aggregator
- **Error Handlers** - retry, ignore, route, break

### Data Mapping
```typescript
// Variable interpolation
'{{module.output.field}}'

// Functions
'{{data.name | uppercase}}'
'{{data.items | length}}'
```

### Error Handling
```typescript
{
  id: 'risky-op',
  type: 'http',
  errorHandler: {
    action: 'route',
    target: 'error-path'
  }
}
```

## Architecture

```
make/
  src/
    core/                 # Business logic
      scenario-registry.ts   # createScenario() registry
      module-executor.ts     # Module execution with memoization
      data-mapper.ts         # Variable interpolation and transforms
      router.ts              # Conditional routing logic
    durable-object/       # DO implementations
      ScenarioDO.ts          # Scenario orchestration
      ModuleDO.ts            # Module state and execution
      RouterDO.ts            # Data routing logic
      SchedulerDO.ts         # Cron and interval triggers
    queue/                # Queue integration
      producer.ts            # Module execution queue
      consumer.ts            # Module dispatch
    modules/              # Built-in module types
      triggers/              # Trigger modules
      actions/               # Action modules
      flow/                  # Flow control modules
    mcp/                  # MCP tool integrations
      fsx.ts                 # Filesystem operations
      gitx.ts                # Git operations
      llm.ts                 # AI operations
    sdk/                  # Client SDK
      make.ts                # Make class
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
bd update make-xxx --status in_progress

# After tests pass
bd close make-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Scenario Definition (make-001)
1. [RED] Test createScenario() API surface
2. [GREEN] Implement scenario registry
3. [REFACTOR] Scenario validation

### Phase 2: Module Execution (make-002)
1. [RED] Test module executor with step memoization
2. [GREEN] Implement ModuleDO with event sourcing
3. [REFACTOR] Module result caching

### Phase 3: Data Mapping (make-003)
1. [RED] Test variable interpolation
2. [GREEN] Implement data mapper with mustache-style vars
3. [REFACTOR] Built-in function library

### Phase 4: Routing Logic (make-004)
1. [RED] Test router conditions
2. [GREEN] Implement RouterDO with conditional branching
3. [REFACTOR] Complex routing patterns

### Phase 5: Triggers (make-005)
1. [RED] Test webhook and cron triggers
2. [GREEN] Implement SchedulerDO
3. [REFACTOR] Trigger validation

### Phase 6: Flow Control Modules (make-006)
1. [RED] Test iterator, aggregator, filter
2. [GREEN] Implement flow control modules
3. [REFACTOR] Memory-efficient streaming

### Phase 7: Error Handling (make-007)
1. [RED] Test error routes and retries
2. [GREEN] Implement error handler routing
3. [REFACTOR] Exponential backoff

### Phase 8: MCP Integration (make-008)
1. [RED] Test fsx.do, gitx.do, llm.do modules
2. [GREEN] Implement MCP module adapters
3. [REFACTOR] Tool discovery

### Phase 9: SDK Compatibility (make-009)
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
