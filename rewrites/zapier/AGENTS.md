# Zapier Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Zapier alternative - No-code automation with triggers, actions, and multi-step Zaps running on the edge.

**Package:** `@dotdo/zapier` with domains `zapier.do` / `automation.do`

**Core Primitives:**
- Cloudflare Workflows - Durable multi-step execution
- Cloudflare Queues - Event routing and delivery
- Durable Objects - Step memoization and state
- Cron Triggers - Scheduled Zap execution
- MCP Tools - AI-native fsx.do/gitx.do integration

## Reference Documents

1. **../workflows/SCOPE.md** - Complete workflows platform analysis
2. **../CLAUDE.md** - General rewrites guidance and TDD patterns
3. **../inngest/README.md** - Reference rewrite pattern

## Key Zapier Concepts

### Zaps
```typescript
zapier.createZap({
  name: 'New User Onboarding',
  trigger: { app: 'webhook', event: 'user/created' },
  actions: [
    { app: 'salesforce', action: 'createContact', inputs: {...} },
    { app: 'sendgrid', action: 'sendEmail', inputs: {...} }
  ]
})
```

### Triggers
- **Webhook** - Incoming HTTP events
- **Schedule** - Cron-based execution
- **Polling** - Periodic API checks
- **App Events** - Third-party app subscriptions

### Actions
- **App Actions** - Calls to 5000+ integrations
- **HTTP** - Raw API calls
- **Code** - Custom JavaScript
- **MCP Tools** - fsx.do, gitx.do operations

### Filters & Paths
- **Filter** - Only continue if conditions match
- **Path** - Branch based on conditions
- **Formatter** - Transform data between steps

## Architecture

```
zapier/
  src/
    core/                 # Business logic
      zap-registry.ts        # createZap() registry
      trigger-engine.ts      # Trigger processing
      action-executor.ts     # Action execution with memoization
      template-engine.ts     # {{expression}} parsing
    durable-object/       # DO implementations
      TriggerDO.ts           # Event source management
      ActionDO.ts            # Action execution state
      FilterDO.ts            # Conditional logic
      FormatterDO.ts         # Data transformation
    queue/                # Queue integration
      producer.ts            # Event publishing
      consumer.ts            # Step dispatch
    connectors/           # App integrations
      slack.ts               # Slack connector
      http.ts                # HTTP connector
      fsx.ts                 # fsx.do MCP connector
      gitx.ts                # gitx.do MCP connector
    sdk/                  # Client SDK
      zapier.ts              # Zapier class
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
bd update zapier-xxx --status in_progress

# After tests pass
bd close zapier-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Zap Definition (zapier-001)
1. [RED] Test createZap() API surface
2. [GREEN] Implement Zap registry
3. [REFACTOR] Hot reloading support

### Phase 2: Trigger Engine (zapier-002)
1. [RED] Test webhook trigger processing
2. [GREEN] Implement TriggerDO with event routing
3. [REFACTOR] Add schedule and polling triggers

### Phase 3: Action Executor (zapier-003)
1. [RED] Test action execution with memoization
2. [GREEN] Implement ActionDO with step state
3. [REFACTOR] Error handling and retries

### Phase 4: Template Engine (zapier-004)
1. [RED] Test {{expression}} parsing
2. [GREEN] Implement template interpolation
3. [REFACTOR] Add built-in functions

### Phase 5: Filters & Paths (zapier-005)
1. [RED] Test conditional logic
2. [GREEN] Implement FilterDO and path routing
3. [REFACTOR] Complex condition support

### Phase 6: Connectors (zapier-006)
1. [RED] Test HTTP connector
2. [GREEN] Implement base connector interface
3. [REFACTOR] Add fsx.do/gitx.do MCP connectors

### Phase 7: SDK Compatibility (zapier-007)
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
