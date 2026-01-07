# Agent Instructions - LaunchDarkly Rewrite

This is **launchdarkly.do** (alias: `experiments.do`) - a LaunchDarkly-compatible feature flags and experimentation platform built on Cloudflare Durable Objects.

## Project Overview

**Package**: `@dotdo/launchdarkly` or `experiments.do`

LaunchDarkly is the feature flag leader. This rewrite provides:
- Sub-millisecond flag evaluation at edge
- Real-time flag updates via SSE/WebSocket
- A/B testing with Bayesian/Frequentist analysis
- Drop-in SDK compatibility

## Architecture

```
launchdarkly/
  src/
    core/              # Pure business logic
      evaluator.ts     # Flag evaluation engine
      rules.ts         # Targeting rules (MongoDB-style)
      hashing.ts       # FNV32a deterministic bucketing
      stats.ts         # Statistical analysis
    durable-objects/
      FlagEvaluatorDO  # Flag config + evaluation
      ExperimentDO     # Experiment state + metrics
      StreamingDO      # WebSocket/SSE gateway
    client/
      LDClient.ts      # LaunchDarkly-compatible SDK
    mcp/               # AI tool definitions
  .beads/              # Issue tracking
```

## TDD Workflow

This project follows strict TDD with RED-GREEN-REFACTOR cycles:

1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimal code to pass
3. **[REFACTOR]** Optimize without changing behavior

```bash
# Find ready tasks (RED tasks are unblocked first)
bd ready

# Claim work
bd update launchdarkly-xxx --status in_progress

# Complete and move to next phase
bd close launchdarkly-xxx
```

## Beads Issue Tracking

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

