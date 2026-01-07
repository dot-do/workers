# Fivetran Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Fivetran alternative - automated data movement with zero maintenance, 500+ connectors, and AI-native operations.

**Package:** `@dotdo/fivetran` with domains `fivetran.do` / `etl.do` / `pipelines.do`

**Core Primitives:**
- Durable Objects - Connector state, sync coordination, schema tracking
- Cloudflare Queues - Sync job scheduling and retry
- D1 - Metadata storage, small dataset destination
- R2 - Data lake storage (Parquet, JSON, CSV)
- MCP Tools - fsx.do and gitx.do for AI-native operations

## Reference Documents

1. **../CLAUDE.md** - General rewrites guidance and TDD patterns
2. **../inngest/README.md** - Reference rewrite pattern
3. **../supabase/README.md** - Reference rewrite pattern

## Key Fivetran Concepts

### Connectors
```typescript
fivetran.createConnector({
  id: 'salesforce-prod',
  source: { type: 'salesforce', credentials, objects: ['Account', 'Contact'] },
  destination: { type: 'd1', database: env.ANALYTICS_DB },
  sync: { schedule: 'every 15 minutes', mode: 'incremental' }
})
```

### Sync Modes
- **Full sync** - Complete data refresh
- **Incremental** - Sync only changed records via cursor
- **CDC** - Change Data Capture for databases

### Schema Management
- Auto-detect schema changes from source
- Apply DDL migrations to destination
- Track schema history with gitx.do

### Destinations
- D1 for structured analytics
- R2 for data lake (Parquet)
- External databases (Postgres, Snowflake, BigQuery)

## Architecture

```
fivetran/
  src/
    core/                     # Business logic
      connector-registry.ts       # createConnector() registry
      sync-executor.ts            # Sync execution with retries
      schema-detector.ts          # Schema change detection
      transform-engine.ts         # Data transformations
    durable-object/           # DO implementations
      ConnectorDO.ts              # Connector config and state
      DestinationDO.ts            # Destination schema tracking
      SyncDO.ts                   # Sync job coordination
    connectors/               # Source connectors
      databases/
        postgres.ts
        mysql.ts
        mongodb.ts
      saas/
        salesforce.ts
        hubspot.ts
        stripe.ts
        shopify.ts
      files/
        s3.ts
        gcs.ts
        fsx.ts                    # fsx.do integration
    destinations/             # Destination adapters
      d1.ts
      r2.ts
      postgres.ts
      snowflake.ts
    queue/                    # Queue integration
      producer.ts                 # Job scheduling
      consumer.ts                 # Job execution
    mcp/                      # MCP tool definitions
      tools.ts                    # AI tool definitions
    sdk/                      # Client SDK
      fivetran.ts                 # Fivetran class
      types.ts                    # TypeScript types
  .beads/                     # Issue tracking
  AGENTS.md                   # This file
  README.md                   # User documentation
```

## TDD Workflow

Follow strict TDD for all implementation:

```bash
# Find ready work (RED tests first)
bd ready

# Claim work
bd update fivetran-xxx --status in_progress

# After tests pass
bd close fivetran-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Connector Definition (fivetran-core)
1. [RED] Test createConnector() API surface
2. [GREEN] Implement connector registry
3. [REFACTOR] Hot reloading support

### Phase 2: Sync Execution (fivetran-sync)
1. [RED] Test sync execution with memoization
2. [GREEN] Implement SyncDO with job state
3. [REFACTOR] Sync result caching

### Phase 3: Schema Detection (fivetran-schema)
1. [RED] Test schema change detection
2. [GREEN] Implement schema differ with gitx.do
3. [REFACTOR] Schema evolution strategies

### Phase 4: Source Connectors (fivetran-connectors)
1. [RED] Test connector interface contract
2. [GREEN] Implement Salesforce connector
3. [GREEN] Implement Postgres connector
4. [REFACTOR] Connector plugin system

### Phase 5: Destinations (fivetran-destinations)
1. [RED] Test destination interface
2. [GREEN] Implement D1 destination
3. [GREEN] Implement R2 Parquet destination
4. [REFACTOR] Schema evolution in destinations

### Phase 6: Transformations (fivetran-transform)
1. [RED] Test SQL transformations
2. [GREEN] Implement transform engine
3. [REFACTOR] TypeScript function transforms

### Phase 7: SDK Compatibility (fivetran-sdk)
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
