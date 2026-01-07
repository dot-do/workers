# Composio Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native Composio alternative - AI agent tool integration platform with managed auth and MCP-native tool definitions.

**Package:** `@dotdo/composio` with domains `tools.do` / `composio.do`

**Core Primitives:**
- Durable Objects - Per-entity credential isolation
- Workers KV - Tool schema caching
- R2 - Large response storage
- Cloudflare Queues - Webhook delivery

## Reference Documents

1. **../CLAUDE.md** - General rewrites guidance and TDD patterns
2. **../inngest/README.md** - Reference rewrite pattern for DO architecture
3. **../fsx/README.md** - Reference for MCP integration

## Key Composio Concepts

### Connections
```typescript
// OAuth flow
const { redirectUrl } = await composio.connect({
  userId: 'user-123',
  app: 'github',
  redirectUrl: 'https://myapp.com/callback'
})

// API key auth
await composio.connect({
  userId: 'user-123',
  app: 'openai',
  credentials: { apiKey: 'sk-...' }
})
```

### Tool Execution
```typescript
const result = await composio.execute({
  action: 'github_create_issue',
  params: { repo: 'owner/repo', title: 'Bug fix' },
  entityId: 'user-123'
})
```

### Agent Framework Integration
```typescript
// LangChain
import { composioTools } from '@dotdo/composio/langchain'
const tools = await composioTools.getTools({ apps: ['github'], entityId: 'user-123' })

// MCP Native
import { createMCPServer } from '@dotdo/composio/mcp'
const mcpServer = createMCPServer({ apps: ['github'], entityId: 'user-123' })
```

### Triggers
```typescript
await composio.triggers.subscribe({
  app: 'github',
  event: 'push',
  entityId: 'user-123',
  webhookUrl: 'https://myapp.com/webhooks'
})
```

## Architecture

```
composio/
  src/
    core/                 # Business logic
      app-registry.ts         # App definitions and schemas
      action-executor.ts      # Action execution with retries
      auth-manager.ts         # OAuth/API key handling
    durable-object/       # DO implementations
      ToolsDO.ts              # Tool registry and discovery
      ConnectionDO.ts         # Per-entity credential storage
      ExecutionDO.ts          # Sandboxed action execution
      TriggerDO.ts            # Webhook subscriptions
      EntityDO.ts             # User-to-connection mapping
      RateDO.ts               # Rate limiting per entity
    adapters/             # Framework adapters
      langchain.ts            # LangChain tools
      crewai.ts               # CrewAI tools
      autogen.ts              # Autogen tools
      llamaindex.ts           # LlamaIndex tools
    mcp/                  # MCP integration
      server.ts               # MCP server implementation
      tools.ts                # MCP tool definitions
    sdk/                  # Client SDK
      composio.ts             # Composio class
      types.ts                # TypeScript types
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
bd update composio-xxx --status in_progress

# After tests pass
bd close composio-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Core SDK (composio-001 to composio-003)
1. [RED] Test Composio client initialization
2. [GREEN] Implement Composio class with config
3. [REFACTOR] Add TypeScript types

### Phase 2: Connection Management (composio-004 to composio-006)
1. [RED] Test OAuth connect flow
2. [GREEN] Implement ConnectionDO with token storage
3. [REFACTOR] Add token refresh logic

### Phase 3: Tool Registry (composio-007 to composio-009)
1. [RED] Test app and action listing
2. [GREEN] Implement ToolsDO with schemas
3. [REFACTOR] Add KV caching layer

### Phase 4: Action Execution (composio-010 to composio-012)
1. [RED] Test action execution
2. [GREEN] Implement ExecutionDO sandbox
3. [REFACTOR] Add retry and rate limiting

### Phase 5: MCP Integration (composio-013 to composio-015)
1. [RED] Test MCP server creation
2. [GREEN] Implement MCP tool exposure
3. [REFACTOR] Dynamic schema generation

### Phase 6: Agent Adapters (composio-016 to composio-018)
1. [RED] Test LangChain adapter
2. [GREEN] Implement framework adapters
3. [REFACTOR] Common adapter interface

### Phase 7: Triggers (composio-019 to composio-021)
1. [RED] Test webhook subscription
2. [GREEN] Implement TriggerDO
3. [REFACTOR] Queue-based delivery

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
