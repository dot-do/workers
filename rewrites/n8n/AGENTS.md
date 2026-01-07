# n8n Rewrite - AI Assistant Guidance

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Project Overview

**Goal:** Build a Cloudflare-native n8n alternative - fair-code workflow automation with code flexibility running entirely on Durable Objects.

**Package:** `@dotdo/n8n` with domains `n8n.do` / `workflows.do`

**Core Primitives:**
- Cloudflare Durable Objects - Workflow state and execution
- Cloudflare Queues - Node execution queue
- SQLite - Workflow definitions and execution history
- R2 - Large execution data and attachments

## Reference Documents

1. **../inngest/README.md** - Similar workflow engine pattern
2. **../CLAUDE.md** - General rewrites guidance and TDD patterns
3. **../supabase/README.md** - Reference rewrite pattern

## Key n8n Concepts

### Workflows
```typescript
n8n.createWorkflow(
  { id: 'sync-contacts', trigger: { type: 'webhook' } },
  async ({ trigger, nodes }) => {
    const data = await nodes.httpRequest({ url: 'https://api.example.com' })
    const transformed = await nodes.code({ language: 'javascript', code: '...', items: data })
    await nodes.airtable.create({ base: 'contacts', records: transformed })
  }
)
```

### Nodes (Execution Units)
- `nodes.httpRequest()` - HTTP requests
- `nodes.code()` - JavaScript/Python execution
- `nodes.if()` / `nodes.switch()` - Conditional branching
- `nodes.merge()` - Combine data streams
- `nodes.executeWorkflow()` - Sub-workflow execution
- `nodes.[service].*` - Integration nodes (Slack, Airtable, etc.)

### Triggers
- `webhook` - HTTP endpoint triggers
- `cron` - Scheduled execution
- `event` - Event-driven triggers
- `manual` - User-initiated
- `interval` - Time-based polling

### Credentials
```typescript
await n8n.credentials.create({ name: 'My Slack', type: 'slack', data: { accessToken: '...' } })
```

## Architecture

```
n8n/
  src/
    core/                 # Business logic
      workflow-registry.ts    # createWorkflow() registry
      node-executor.ts        # Node execution engine
      expression-parser.ts    # {{ }} expression evaluation
    durable-object/       # DO implementations
      WorkflowDO.ts          # Workflow definitions
      ExecutionDO.ts         # Execution state
      CredentialDO.ts        # Encrypted credentials
    nodes/                # Node implementations
      http-request.ts        # HTTP node
      code.ts                # Code node (JS/Python)
      if.ts                  # Conditional node
      switch.ts              # Multi-branch node
      merge.ts               # Merge node
    integrations/         # Service integrations
      slack.ts               # Slack nodes
      airtable.ts            # Airtable nodes
      email.ts               # Email nodes
    queue/                # Queue integration
      producer.ts            # Node execution publishing
      consumer.ts            # Node execution dispatch
    mcp/                  # AI tools
      tools.ts               # MCP tool definitions
    sdk/                  # Client SDK
      n8n.ts                 # N8n class
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
bd update n8n-xxx --status in_progress

# After tests pass
bd close n8n-xxx

# Check what's unblocked
bd ready
```

### TDD Cycle Pattern
1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimum code to pass
3. **[REFACTOR]** Clean up without changing behavior

## Implementation Priorities

### Phase 1: Workflow Definition (n8n-001)
1. [RED] Test createWorkflow() API surface
2. [GREEN] Implement workflow registry
3. [REFACTOR] Hot reloading support

### Phase 2: Core Nodes (n8n-002)
1. [RED] Test httpRequest node
2. [GREEN] Implement HTTP node with retry
3. [REFACTOR] Request/response streaming

### Phase 3: Code Node (n8n-003)
1. [RED] Test JavaScript code execution
2. [GREEN] Implement JS sandbox
3. [RED] Test Python code execution
4. [GREEN] Implement Python via WASM/Pyodide
5. [REFACTOR] Expression evaluation

### Phase 4: Branching Nodes (n8n-004)
1. [RED] Test if/switch nodes
2. [GREEN] Implement conditional branching
3. [REFACTOR] Expression parser optimization

### Phase 5: Triggers (n8n-005)
1. [RED] Test webhook triggers
2. [GREEN] Implement webhook endpoints
3. [RED] Test cron triggers
4. [GREEN] Implement cron scheduling

### Phase 6: Credentials (n8n-006)
1. [RED] Test credential CRUD
2. [GREEN] Implement CredentialDO
3. [REFACTOR] Encryption at rest

### Phase 7: Execution History (n8n-007)
1. [RED] Test execution storage
2. [GREEN] Implement ExecutionDO
3. [REFACTOR] Execution replay

### Phase 8: MCP Tools (n8n-008)
1. [RED] Test MCP tool definitions
2. [GREEN] Implement fsx.do/gitx.do integration
3. [REFACTOR] Natural language workflow creation

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
