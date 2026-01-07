# Agent Instructions - @dotdo/sentry

This is the **sentry** rewrite - a Cloudflare Workers-native error monitoring platform with Sentry SDK compatibility.

**Package**: `@dotdo/sentry`
**Domain**: `errors.do` (or `sentry.do`)

## Architecture Overview

```
sentry/
├── src/
│   ├── core/                 # Pure business logic
│   │   ├── envelope.ts       # Sentry envelope parsing
│   │   ├── fingerprint.ts    # Error fingerprinting
│   │   └── symbolicate.ts    # Source map processing
│   ├── durable-object/       # DO classes
│   │   ├── ingestion.ts      # ErrorIngestionDO
│   │   ├── grouping.ts       # IssueGroupingDO
│   │   ├── symbolication.ts  # SymbolicationDO
│   │   └── alerting.ts       # AlertingDO
│   ├── storage/              # D1/R2/KV integration
│   ├── sdk/                  # Client SDK (@dotdo/sentry)
│   └── mcp/                  # MCP tools for AI agents
├── .beads/                   # Issue tracking
└── test/                     # Vitest tests
```

## Key Technical Details

- **Envelope Protocol**: Sentry's binary format for batching errors
- **Source Maps**: Use `source-map-js` (pure JS, no WASM)
- **Issue Grouping**: Multi-stage fingerprinting with optional ML
- **Alerting**: DO alarms for real-time notifications

## TDD Workflow

All implementation follows RED-GREEN-REFACTOR:
1. **[RED]** - Write failing tests first
2. **[GREEN]** - Implement minimal code to pass
3. **[REFACTOR]** - Clean up without changing behavior

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
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

