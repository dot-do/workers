# Airbyte Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Airbyte alternative - ELT data integration with 300+ connectors without managing infrastructure.

**Package:** `@dotdo/airbyte` with domains `airbyte.do` / `etl.do` / `pipelines.do`

**Core Primitives:**
- Durable Objects - Source, Destination, Connection, and Sync state
- Cloudflare Queues - Job scheduling and execution
- R2 Storage - Staging area for large data transfers
- MCP Tools - AI-native connector runtime (fsx.do, gitx.do)

## Reference Documents

1. **../workflows/SCOPE.md** - Complete workflows platform analysis
2. **../CLAUDE.md** - General rewrites guidance and TDD patterns
3. **../inngest/README.md** - Reference rewrite pattern

## Key Airbyte Concepts

### Sources
```typescript
const github = await airbyte.sources.create({
  name: 'github-source',
  type: 'github',
  config: {
    credentials: { personal_access_token: env.GITHUB_TOKEN },
    repositories: ['myorg/myrepo']
  }
})
```

### Destinations
```typescript
const snowflake = await airbyte.destinations.create({
  name: 'snowflake-dest',
  type: 'snowflake',
  config: {
    host: 'account.snowflakecomputing.com',
    database: 'analytics'
  }
})
```

### Connections (Sync Jobs)
```typescript
const connection = await airbyte.connections.create({
  name: 'github-to-snowflake',
  source: github.id,
  destination: snowflake.id,
  streams: [
    { name: 'commits', syncMode: 'incremental', cursorField: 'date' }
  ],
  schedule: { cron: '0 */6 * * *' }
})
```

### Sync Modes
- `full_refresh` - Replace all data each sync
- `incremental` - Only sync changed data (cursor-based)
- `cdc` - Change Data Capture for databases

## Architecture

```
airbyte/
  src/
    core/                 # Business logic
      source-registry.ts      # Source connector registry
      destination-registry.ts # Destination connector registry
      schema-discovery.ts     # JSON Schema extraction
      sync-engine.ts          # Data extraction and loading
    durable-object/       # DO implementations
      SourceDO.ts             # Source configuration and state
      DestinationDO.ts        # Destination configuration and state
      ConnectionDO.ts         # Connection orchestration
      SyncDO.ts               # Individual sync job execution
    connectors/           # Connector implementations
      sources/               # Source connectors
      destinations/          # Destination connectors
    mcp/                  # MCP tool definitions
      tools.ts               # AI-accessible tools
    sdk/                  # Client SDK
      airbyte.ts             # Airbyte class
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
bd update airbyte-xxx --status in_progress

# After tests pass
bd close airbyte-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Source Registry (airbyte-001)
1. [RED] Test source.create() API surface
2. [GREEN] Implement SourceDO with config storage
3. [REFACTOR] Schema validation

### Phase 2: Destination Registry (airbyte-002)
1. [RED] Test destination.create() API surface
2. [GREEN] Implement DestinationDO with config storage
3. [REFACTOR] Credential encryption

### Phase 3: Schema Discovery (airbyte-003)
1. [RED] Test sources.discover() catalog
2. [GREEN] Implement JSON Schema extraction
3. [REFACTOR] Stream metadata

### Phase 4: Connection Orchestration (airbyte-004)
1. [RED] Test connections.create() with streams
2. [GREEN] Implement ConnectionDO with scheduling
3. [REFACTOR] Cron expression parsing

### Phase 5: Sync Execution (airbyte-005)
1. [RED] Test connections.sync() job creation
2. [GREEN] Implement SyncDO with incremental state
3. [REFACTOR] Cursor management

### Phase 6: Connector Runtime (airbyte-006)
1. [RED] Test connector spec/check/discover/read/write
2. [GREEN] Implement MCP-based connector protocol
3. [REFACTOR] fsx.do/gitx.do integration

### Phase 7: Normalization (airbyte-007)
1. [RED] Test basic normalization transforms
2. [GREEN] Implement schema flattening
3. [REFACTOR] Type coercion

### Phase 8: CDC Support (airbyte-008)
1. [RED] Test database change capture
2. [GREEN] Implement WAL/binlog readers
3. [REFACTOR] Replication slot management

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
